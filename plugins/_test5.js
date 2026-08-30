import fetch from 'node-fetch';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

// ==== CONFIGURACIÓN DE TU API ====
const API_BASE = "https://api-sky.ultraplus.click";
const API_KEY = "Russellxz";

const ENDPOINT_JSON = "/cdn/tourl";
const ENDPOINT_RAW  = "/cdn/tourl/raw";

const handler = async (msg, { conn, args, usedPrefix, command }) => {
  const chatId = msg.key.remoteJid;
  const pref = usedPrefix || ".";
  
  try { await conn.sendMessage(chatId, { react: { text: "⏳", key: msg.key } }); } catch {}

  // 1. Detectar mensaje citado o actual
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const targetMessage = quoted || msg.message;

  const { typeDetected, mediaMessage } = detectMedia(targetMessage);

  // 2. Si no hay archivo pero hay una URL en los argumentos
  const maybeUrl = args && args[0] ? String(args[0]).trim() : null;

  if (!mediaMessage && maybeUrl && /^https?:\/\//i.test(maybeUrl)) {
    try {
      const apiRes = await apiUploadFromUrl(maybeUrl);
      const url = pickUrlFromApi(apiRes);

      if (!url) throw new Error("Subió pero no retornó una URL válida.");

      await conn.sendMessage(chatId, { text: `✅ *Archivo subido desde URL:*\n${url}` }, { quoted: msg });
      try { await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }); } catch {}
      return;
    } catch (e) {
      await conn.sendMessage(chatId, { text: `❌ *Error al subir URL:*\n${e.message}` }, { quoted: msg });
      try { await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } }); } catch {}
      return;
    }
  }

  // 3. Si no hay media ni URL, enviar mensaje de ayuda
  if (!mediaMessage) {
    await conn.sendMessage(chatId, {
      text: `✳️ *Usa:*\n${pref}${command}\n\n📌 Responde a una imagen, video, audio, sticker o documento, o pasa una URL directa.\n\n*Ejemplos:*\n- Responde a un archivo con: *${pref}${command}*\n- O escribe: *${pref}${command} https://ejemplo.com/archivo.mp4*`,
    }, { quoted: msg });
    try { await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } }); } catch {}
    return;
  }

  // 4. Descargar el archivo multimedia
  try {
    let mime = mediaMessage.mimetype || "application/octet-stream";
    let rawExt = typeDetected === 'sticker' ? 'webp' : (mime.split('/')[1]?.split(';')[0] || 'bin');
    if (rawExt === 'jpeg') rawExt = 'jpg';

    let filename = mediaMessage.fileName || `upload_${Date.now()}.${rawExt}`;
    if (!filename.endsWith(`.${rawExt}`)) filename += `.${rawExt}`;

    const stream = await downloadContentFromMessage(mediaMessage, typeDetected === 'sticker' ? 'sticker' : typeDetected);
    let buffer = Buffer.alloc(0);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    if (!buffer || buffer.length === 0) {
      throw new Error("El archivo descargado está vacío.");
    }

    if (buffer.length > 200 * 1024 * 1024) {
      throw new Error("El archivo supera el límite de 200MB.");
    }

    // 5. Subir binario a tu API
    const apiRes = await apiUploadRaw({ buffer, filename, mime });
    const url = pickUrlFromApi(apiRes);

    if (!url) throw new Error("Subió pero no retornó una URL válida.");

    await conn.sendMessage(chatId, { text: `✅ *Archivo subido exitosamente:*\n${url}` }, { quoted: msg });
    try { await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }); } catch {}

  } catch (e) {
    await conn.sendMessage(chatId, { text: `❌ *Error al subir:* ${e.message}` }, { quoted: msg });
    try { await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } }); } catch {}
  }
};

handler.command = ["tourl3"];
handler.help = ["tourl3"];
handler.tags = ["herramientas"];
handler.register = true;

export default handler;

// ————— FUNCIONES AUXILIARES —————

function detectMedia(message) {
  if (!message || typeof message !== 'object') return { typeDetected: null, mediaMessage: null };
  const mediaTypes = ['imageMessage', 'videoMessage', 'stickerMessage', 'audioMessage', 'documentMessage'];

  for (const type of mediaTypes) {
    if (message[type]) return { typeDetected: type.replace('Message', '').toLowerCase(), mediaMessage: message[type] };
  }

  for (const key in message) {
    if (typeof message[key] === 'object') {
      const result = detectMedia(message[key]);
      if (result.typeDetected) return result;
    }
  }
  return { typeDetected: null, mediaMessage: null };
}

function safeFilename(name) {
  let n = String(name || "upload").slice(0, 120);
  return n.replace(/[^A-Za-z0-9_\-.]+/g, "_") || "upload";
}

function pickUrlFromApi(json) {
  return json?.result?.url || json?.url || json?.file?.url || json?.data?.url || json?.result?.data?.url || null;
}

async function apiUploadRaw({ buffer, filename, mime }) {
  const base = API_BASE.replace(/\/+$/, "");
  const safe = safeFilename(filename || `upload_${Date.now()}`);
  const url = `${base}${ENDPOINT_RAW}?filename=${encodeURIComponent(safe)}`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      apikey: API_KEY,
      "Content-Type": mime || "application/octet-stream",
    },
    body: buffer,
  });

  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { status: false, message: "Respuesta no JSON", raw: text }; }

  if (!r.ok || json?.status === false) {
    throw new Error(json?.message || json?.raw || `HTTP ${r.status}`);
  }

  return json;
}

async function apiUploadFromUrl(remoteUrl) {
  const base = API_BASE.replace(/\/+$/, "");
  const url = `${base}${ENDPOINT_JSON}`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      apikey: API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: remoteUrl }),
  });

  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { status: false, message: "Respuesta no JSON", raw: text }; }

  if (!r.ok || json?.status === false) {
    throw new Error(json?.message || json?.raw || `HTTP ${r.status}`);
  }

  return json;
}
