// plugins/ssa.js — Sticker con audio (estático o animado)
// Comandos: .ssa / .ss
//
//  • Video  → sticker animado con el audio del propio video.
//  • Imagen / sticker → abre una sesión de 60 s; manda o responde un
//    audio / nota de voz / video y el bot lo pega al sticker.
//  • Imagen con .ss respondiendo a un audio → se une directo.
//
// Requiere: ffmpeg instalado y el paquete node-webpmux.
import fs from 'fs'
import path from 'path'
import Crypto from 'crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import webp from 'node-webpmux'

const execFileAsync = promisify(execFile)
const MAX_DURATION = 60
const SESSION_SECONDS = 60
const MAX_STICKER_BYTES = 900 * 1024

const tempFolder = path.join(process.cwd(), 'tmp')
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true })

// "chat:remitente" → { stickerBuffer, isAnimated, visualSeconds, expiresAt, processing, timer }
const sessions = new Map()

// ================= Baileys =================
let baileysMod = null
async function getBaileys() {
  if (baileysMod) return baileysMod
  for (const name of ['@whiskeysockets/baileys', 'baileys', '@adiwajshing/baileys', 'ultra-baileys']) {
    try {
      const mod = await import(name)
      baileysMod = mod.default && mod.default.proto ? mod.default : mod
      if (baileysMod.prepareWAMessageMedia) return baileysMod
    } catch {}
  }
  throw new Error('No se encontró la librería Baileys.')
}

// ================= Helpers =================
const randomFileName = (ext) => `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.${ext}`

// Detecta qué es un mensaje (m o m.quoted) en el formato de tu bot
function detect(obj) {
  if (!obj) return null
  const node = obj.msg || obj
  const mime = String(node.mimetype || obj.mimetype || obj.mediaType || '').toLowerCase()
  const mtype = String(obj.mtype || '')
  const seconds = Number(node.seconds || 0)
  if (mtype === 'stickerMessage' || mime === 'image/webp') return { kind: 'webp', obj, seconds: 0 }
  if (mime.startsWith('image/') || mtype === 'imageMessage') return { kind: 'image', obj, seconds: 0 }
  if (mime.startsWith('video/') || mtype === 'videoMessage') return { kind: 'video', obj, seconds }
  if (mime.startsWith('audio/') || mtype === 'audioMessage') return { kind: 'audio', obj, seconds }
  return null
}
const isVisual = (i) => i && ['image', 'video', 'webp'].includes(i.kind)
const isAudioish = (i) => i && (i.kind === 'audio' || i.kind === 'video')

async function download(info) {
  const buf = await info.obj.download?.()
  if (!buf || !buf.length) throw new Error('No se pudo descargar el archivo.')
  return buf
}

function audioExt(info) {
  if (info.kind === 'video') return 'mp4'
  const mime = String((info.obj.msg || info.obj).mimetype || '')
  if (/ogg|opus/i.test(mime)) return 'ogg'
  if (/mp4|m4a|aac/i.test(mime)) return 'm4a'
  if (/wav/i.test(mime)) return 'wav'
  return 'mp3'
}

const react = (conn, m, text) =>
  conn.sendMessage(m.chat, { react: { text, key: m.key } }).catch(() => {})

const sessionKey = (m) => `${m.chat}:${String(m.sender).split(':')[0].split('@')[0]}`

function clearSession(key) {
  const s = sessions.get(key)
  if (s?.timer) clearTimeout(s.timer)
  sessions.delete(key)
}

// ================= Sticker (webp + exif) =================
async function addExif(webpBuffer) {
  const json = {
    'sticker-pack-id': 'ssa-bot',
    'sticker-pack-name': String(global.packN || ''),
    'sticker-pack-publisher': String(global.authN || ''),
    emojis: ['🔊']
  }
  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ])
  const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8')
  const exif = Buffer.concat([exifAttr, jsonBuff])
  exif.writeUIntLE(jsonBuff.length, 14, 4)
  const img = new webp.Image()
  await img.load(webpBuffer)
  img.exif = exif
  return await img.save(null)
}

function isWebpAnimated(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 22) return false
  if (buf.toString('ascii', 12, 16) === 'VP8X' && (buf[20] & 0x02) !== 0) return true
  return buf.includes(Buffer.from('ANMF'))
}

const VF_BASE = 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1'

async function imageToWebp(media) {
  const tmpIn = path.join(tempFolder, randomFileName('jpg'))
  const tmpOut = path.join(tempFolder, randomFileName('webp'))
  try {
    fs.writeFileSync(tmpIn, media)
    await execFileAsync('ffmpeg', [
      '-y', '-i', tmpIn, '-vf', VF_BASE,
      '-c:v', 'libwebp', '-lossless', '0', '-q:v', '80',
      '-frames:v', '1', '-an', tmpOut
    ])
    return fs.readFileSync(tmpOut)
  } finally {
    fs.rmSync(tmpIn, { force: true })
    fs.rmSync(tmpOut, { force: true })
  }
}

async function videoToWebp(media, seconds = MAX_DURATION) {
  const tmpIn = path.join(tempFolder, randomFileName('mp4'))
  const tmpOut = path.join(tempFolder, randomFileName('webp'))
  try {
    fs.writeFileSync(tmpIn, media)
    // Lienzo siempre 512x512 (si no, WhatsApp lo muestra mal). Se prioriza la fluidez:
    // primero se baja la calidad y solo al final los fps.
    const perfiles = seconds <= 10
      ? [[20, 50], [20, 38], [15, 32], [15, 24], [12, 18], [10, 12]]
      : seconds <= 25
        ? [[15, 40], [15, 30], [12, 24], [12, 18], [10, 12], [8, 8]]
        : [[12, 30], [12, 22], [10, 16], [8, 10], [6, 6]]
    let out = null
    for (const [fps, q] of perfiles) {
      await execFileAsync('ffmpeg', [
        '-y', '-i', tmpIn, '-t', String(seconds),
        '-vf', `fps=${fps},${VF_BASE}`,
        '-c:v', 'libwebp', '-lossless', '0', '-compression_level', '4',
        '-q:v', String(q), '-loop', '0', '-preset', 'default',
        '-an', '-vsync', '0', tmpOut
      ], { maxBuffer: 1024 * 1024 * 20 })
      out = fs.readFileSync(tmpOut)
      if (out.length <= MAX_STICKER_BYTES) break
    }
    return out
  } finally {
    fs.rmSync(tmpIn, { force: true })
    fs.rmSync(tmpOut, { force: true })
  }
}

async function buildSticker(buffer, kind, seconds) {
  let raw = buffer
  if (kind === 'video') raw = await videoToWebp(buffer, seconds)
  else if (kind === 'image') raw = await imageToWebp(buffer)
  return await addExif(raw)
}

async function videoSeconds(buffer, fallback = 0) {
  const tmpIn = path.join(tempFolder, randomFileName('mp4'))
  try {
    fs.writeFileSync(tmpIn, buffer)
    const r = await execFileAsync('ffmpeg', ['-hide_banner', '-i', tmpIn]).catch((e) => e)
    const mt = String(r?.stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
    const sec = mt ? Number(mt[1]) * 3600 + Number(mt[2]) * 60 + Number(mt[3]) : 0
    return sec > 0 ? sec : fallback
  } catch {
    return fallback
  } finally {
    fs.rmSync(tmpIn, { force: true })
  }
}

// ================= Audio → OGG/Opus =================
function parseFfmpegDuration(stderr) {
  const all = [...String(stderr || '').matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)]
  if (!all.length) return 0
  const l = all[all.length - 1]
  const sec = Number(l[1]) * 3600 + Number(l[2]) * 60 + Number(l[3])
  return Number.isFinite(sec) ? sec : 0
}

async function toOggOpus(buffer, ext, maxSeconds) {
  const tmpIn = path.join(tempFolder, randomFileName(ext))
  const tmpOut = path.join(tempFolder, randomFileName('ogg'))
  try {
    fs.writeFileSync(tmpIn, buffer)
    let stderr = ''
    try {
      ({ stderr } = await execFileAsync('ffmpeg', [
        '-y', '-i', tmpIn, '-vn', '-map', '0:a:0', '-t', String(maxSeconds),
        '-af', 'aresample=48000:async=1:first_pts=0',
        '-c:a', 'libopus', '-b:a', '48k', '-vbr', 'on',
        '-compression_level', '10', '-ac', '1', '-ar', '48000',
        '-application', 'audio', '-avoid_negative_ts', 'make_zero',
        '-f', 'ogg', tmpOut
      ], { maxBuffer: 1024 * 1024 * 20 }))
    } catch {
      throw new Error('NO_AUDIO')
    }
    const ogg = fs.readFileSync(tmpOut)
    if (!ogg || ogg.length < 200) throw new Error('NO_AUDIO')
    return { ogg, realSeconds: parseFfmpegDuration(stderr) }
  } finally {
    fs.rmSync(tmpIn, { force: true })
    fs.rmSync(tmpOut, { force: true })
  }
}

async function buildAudioMessage(conn, buffer, ext, fallbackSeconds = 0, maxSeconds = MAX_DURATION) {
  const { prepareWAMessageMedia } = await getBaileys()
  const limit = Math.max(1, Math.min(MAX_DURATION, Math.round(maxSeconds) || MAX_DURATION))
  const { ogg, realSeconds } = await toOggOpus(buffer, ext, limit)

  const { audioMessage } = await prepareWAMessageMedia(
    { audio: ogg, mimetype: 'audio/ogg; codecs=opus', ptt: false },
    { upload: conn.waUploadToServer }
  )
  if (!audioMessage) throw new Error('WhatsApp no aceptó la subida del audio.')

  const sec = realSeconds > 0 ? realSeconds : fallbackSeconds > 0 ? fallbackSeconds : 5
  audioMessage.seconds = Math.max(1, Math.min(limit, Math.round(sec)))
  audioMessage.ptt = false
  audioMessage.mimetype = 'audio/ogg; codecs=opus'
  return audioMessage
}

// ================= Parche de proto =================
// stickerMessage.audioMessage (campo 26) y Message.audioStickerMessage (campo 134)
function patchProto(p) {
  const M = p?.Message
  if (!M || M.__audioStickerPatched) return
  if (!M.StickerMessage || !M.AudioMessage || !M.FutureProofMessage) return

  const prevStickerEncode = M.StickerMessage.encode
  M.StickerMessage.encode = function (message, writer) {
    const w = prevStickerEncode.call(this, message, writer)
    if (message?.audioMessage != null) {
      M.AudioMessage.encode(message.audioMessage, w.uint32(210).fork()).ldelim()
    }
    return w
  }

  const prevMsgEncode = M.encode
  M.encode = function (message, writer) {
    const w = prevMsgEncode.call(this, message, writer)
    if (message?.audioStickerMessage != null) {
      M.FutureProofMessage.encode(message.audioStickerMessage, w.uint32(1074).fork()).ldelim()
    }
    return w
  }
  M.__audioStickerPatched = true
}

async function ensurePatched() {
  const mod = await getBaileys()
  patchProto(mod?.proto)
  if (mod?.default?.proto && mod.default.proto !== mod.proto) patchProto(mod.default.proto)
}

function firstFrameLength(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF') return null
  let offset = 12
  while (offset + 8 <= buf.length) {
    const fourcc = buf.toString('ascii', offset, offset + 4)
    const size = buf.readUInt32LE(offset + 4)
    offset += 8 + size + (size % 2)
    if (fourcc === 'ANMF') return offset
  }
  return null
}

async function sendAudioSticker(conn, m, stickerBuffer, isAnimated, audioMessage) {
  await ensurePatched()
  const { prepareWAMessageMedia, generateMessageIDV2, generateMessageID } = await getBaileys()

  const prepared = await prepareWAMessageMedia({ sticker: stickerBuffer }, { upload: conn.waUploadToServer })
  const sticker = prepared?.stickerMessage
  if (!sticker) throw new Error('WhatsApp no aceptó la subida del sticker.')

  sticker.isAnimated = Boolean(isAnimated)
  sticker.width = 512
  sticker.height = 512
  const frame = isAnimated ? firstFrameLength(stickerBuffer) : null
  if (frame) sticker.firstFrameLength = frame

  if (m.key?.id && m.message) {
    sticker.contextInfo = {
      stanzaId: m.key.id,
      participant: m.key.participant || m.key.remoteJid || undefined,
      quotedMessage: m.message
    }
  }

  sticker.audioMessage = { ...audioMessage, mimetype: 'audio/ogg; codecs=opus', ptt: false }

  const payload = {
    audioStickerMessage: { message: { stickerMessage: sticker } },
    messageContextInfo: { messageSecret: Crypto.randomBytes(32) }
  }

  const messageId = typeof generateMessageIDV2 === 'function'
    ? generateMessageIDV2(conn.user?.id)
    : typeof generateMessageID === 'function' ? generateMessageID() : undefined

  await conn.relayMessage(m.chat, payload, messageId ? { messageId } : {})
}

// ================= Sesiones =================
function startSession(conn, m, stickerBuffer, isAnimated, pref, command, visualSeconds = MAX_DURATION) {
  const key = sessionKey(m)
  clearSession(key)

  const timer = setTimeout(() => {
    if (!sessions.has(key)) return
    sessions.delete(key)
    m.reply(`⏰ *Se acabó el tiempo del sticker con audio.*\n\nPasaron ${SESSION_SECONDS} segundos sin recibir audio. Vuelve a usar *${pref}${command}* si quieres intentarlo otra vez.`).catch(() => {})
  }, SESSION_SECONDS * 1000)

  sessions.set(key, {
    stickerBuffer,
    isAnimated,
    visualSeconds,
    expiresAt: Date.now() + SESSION_SECONDS * 1000,
    processing: false,
    timer
  })

  return m.reply(
    `🔊 *STICKER CON AUDIO*\n\n` +
    `✅ Ya guardé tu sticker (${isAnimated ? 'animado' : 'estático'}).\n` +
    `⏳ Tienes *${SESSION_SECONDS} segundos* para:\n\n` +
    `1️⃣ Mandar un *audio, nota de voz o video* aquí, o\n` +
    `2️⃣ Responder a un audio con *${pref}${command}*\n\n` +
    `🎧 Máximo *${MAX_DURATION} segundos* de audio.\n` +
    `❌ Para cancelar: *${pref}${command} cancelar*`
  )
}

async function consumeSession(conn, m, session, audioInfo) {
  const key = sessionKey(m)
  session.processing = true
  await react(conn, m, '🛠️')
  try {
    const buf = await download(audioInfo)
    const audioMessage = await buildAudioMessage(conn, buf, audioExt(audioInfo), audioInfo.seconds, session.visualSeconds)
    await sendAudioSticker(conn, m, session.stickerBuffer, session.isAnimated, audioMessage)
    clearSession(key)
    await react(conn, m, '✅')
  } catch (err) {
    session.processing = false
    console.error('[ssa] Error uniendo audio:', err)
    await react(conn, m, '❌')
    await m.reply(
      err?.message === 'NO_AUDIO'
        ? '❌ *Ese archivo no tiene audio.* Manda otro audio o nota de voz.'
        : '❌ *Hubo un error al ponerle el audio al sticker.*'
    )
  }
}

// ================= Comando =================
let handler = async (m, { conn, text, usedPrefix, command }) => {
  const pref = usedPrefix || '.'
  command = command || 'ssa'

  const own = detect(m)
  const quot = m.quoted ? detect(m.quoted) : null

  const key = sessionKey(m)
  const session = sessions.get(key)
  const arg = String(text || '').trim().toLowerCase()

  // Cancelar
  if (/^(cancelar|cancel|stop)$/.test(arg)) {
    if (!session) return m.reply('⚠️ *No tienes ningún sticker con audio pendiente.*')
    clearSession(key)
    await react(conn, m, '✅')
    return m.reply('✅ *Sticker con audio cancelado.*')
  }

  // Hay sesión y responde a un audio/video → unir
  if (session && !session.processing && !isVisual(own) && isAudioish(quot)) {
    return consumeSession(conn, m, session, quot)
  }

  const visual = isVisual(own) ? own : isVisual(quot) ? quot : null

  if (!visual) {
    if (session) {
      const rest = Math.max(1, Math.ceil((session.expiresAt - Date.now()) / 1000))
      return m.reply(
        `⏳ *Tu sticker sigue esperando audio (${rest}s).*\n\n` +
        `Manda un audio / nota de voz o responde a uno con *${pref}${command}*.\n` +
        `❌ Para cancelar: *${pref}${command} cancelar*`
      )
    }
    if (quot?.kind === 'audio') {
      return m.reply(
        `⚠️ *Primero necesito la imagen.*\n\n` +
        `Responde a una *imagen, sticker o video* con *${pref}${command}* y luego mándame el audio.`
      )
    }
    return m.reply(
      `🧩 *Responde a una imagen, sticker o video para crear un sticker con audio.*\n\n` +
      `✳️ *Con video:* responde al video con *${pref}${command}* y sale el sticker animado con su sonido.\n\n` +
      `✳️ *Con imagen o sticker:* responde con *${pref}${command}* y después manda (o responde) el audio / nota de voz.\n\n` +
      `🎧 Máximo *${MAX_DURATION} segundos* de audio.`
    )
  }

  try {
    await react(conn, m, '🛠️')

    const visualBuf = await download(visual)

    const visualSeconds = visual.kind === 'video'
      ? Math.max(1, Math.min(MAX_DURATION, Math.round(await videoSeconds(visualBuf, visual.seconds || MAX_DURATION))))
      : MAX_DURATION
    const stickerBuffer = await buildSticker(visualBuf, visual.kind, visualSeconds)
    const isAnimated = visual.kind === 'video' || isWebpAnimated(stickerBuffer)

    // Imagen/video propio + respondiendo a un audio → directo
    if (visual === own && quot?.kind === 'audio') {
      const audioBuf = await download(quot)
      const audioMessage = await buildAudioMessage(conn, audioBuf, audioExt(quot), quot.seconds, visualSeconds)
      await sendAudioSticker(conn, m, stickerBuffer, isAnimated, audioMessage)
      clearSession(key)
      return react(conn, m, '✅')
    }

    // Video → usa su propio audio
    if (visual.kind === 'video') {
      try {
        const audioMessage = await buildAudioMessage(conn, visualBuf, 'mp4', visual.seconds, visualSeconds)
        await sendAudioSticker(conn, m, stickerBuffer, true, audioMessage)
        clearSession(key)
        return react(conn, m, '✅')
      } catch (e) {
        if (e?.message !== 'NO_AUDIO') throw e
        await react(conn, m, '🎧')
        return startSession(conn, m, stickerBuffer, true, pref, command, visualSeconds)
      }
    }

    // Imagen / sticker → esperar audio
    await react(conn, m, '🎧')
    return startSession(conn, m, stickerBuffer, isAnimated, pref, command)
  } catch (err) {
    console.error('[ssa] Error:', err)
    await m.reply('❌ *Hubo un error al crear el sticker con audio.*')
    await react(conn, m, '❌')
  }
}

// Escucha audios/videos mandados sin comando mientras hay sesión abierta
handler.before = async function (m, { conn }) {
  try {
    if (!sessions.size || !m || m.isBaileys || m.fromMe) return false
    const key = sessionKey(m)
    const session = sessions.get(key)
    if (!session || session.processing) return false
    if (Date.now() > session.expiresAt) { clearSession(key); return false }

    // Si escribió un comando, lo maneja el handler
    const txt = String(m.text || '')
    if (txt && /^[.#!\/\\]/.test(txt)) return false

    const info = detect(m)
    if (!isAudioish(info)) return false

    await consumeSession(conn, m, session, info)
    return false
  } catch (e) {
    console.error('[ssa] Error en before:', e)
    return false
  }
}

handler.help = ['ssa', 'ss']
handler.tags = ['sticker']
handler.command = ['ssa', 'ss']

export default handler
