import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const handler = async (msg, { conn, command }) => {
  const chatId = msg.key.remoteJid;
  const pref = global.prefixes?.[0] || ".";

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  function detectMedia(message) {
    if (!message || typeof message !== 'object') return { type: null, media: null };

    const mediaTypes = ['imageMessage', 'videoMessage', 'stickerMessage', 'audioMessage'];

    for (const type of mediaTypes) {
      if (message[type]) return { type: type.replace('Message', '').toLowerCase(), media: message[type] };
    }

    for (const key in message) {
      if (typeof message[key] === 'object') {
        const result = detectMedia(message[key]);
        if (result.type) return result;
      }
    }
    return { type: null, media: null };
  }

  let typeDetected, mediaMessage;

  if (quoted) {
    ({ type: typeDetected, media: mediaMessage } = detectMedia(quoted));
  } else {
    ({ type: typeDetected, media: mediaMessage } = detectMedia(msg.message));
  }

  if (!mediaMessage || !typeDetected) {
    return await conn.sendMessage(chatId, {
      text: `✳️ *Usa:*\n${pref}${command}\n📌 Responde o envía una imagen, video, sticker o audio para subirlo.`
    }, { quoted: msg });
  }

  await conn.sendMessage(chatId, { react: { text: '☁️', key: msg.key } });

  try {
    const tmpDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    let rawExt = typeDetected === 'sticker' ? 'webp' :
      mediaMessage.mimetype ? mediaMessage.mimetype.split('/')[1].split(';')[0] : 'bin';
    if (rawExt === 'jpeg') rawExt = 'jpg';

    const rawPath = path.join(tmpDir, `${Date.now()}_input.${rawExt}`);

    const stream = await downloadContentFromMessage(mediaMessage, typeDetected === 'sticker' ? 'sticker' : typeDetected);
    const writeStream = fs.createWriteStream(rawPath);
    for await (const chunk of stream) writeStream.write(chunk);
    writeStream.end();
    await new Promise(resolve => writeStream.on('finish', resolve));

    const stats = fs.statSync(rawPath);
    if (stats.size > 200 * 1024 * 1024) {
      fs.unlinkSync(rawPath);
      throw new Error('⚠️ El archivo excede el límite de 200MB.');
    }

    let finalPath = rawPath;

    if (typeDetected === 'audio' && ['ogg', 'm4a', 'mpeg'].includes(rawExt)) {
      finalPath = path.join(tmpDir, `${Date.now()}_converted.mp3`);
      await new Promise((resolve, reject) => {
        ffmpeg(rawPath)
          .audioCodec('libmp3lame')
          .toFormat('mp3')
          .on('end', resolve)
          .on('error', reject)
          .save(finalPath);
      });
      fs.unlinkSync(rawPath);
    }

    // Subida a SkyUltraPlus CDN
    const form = new FormData();
    form.append('name', 'archivo_bot');
    form.append('file', fs.createReadStream(finalPath));

    const res = await axios.post('https://cdn.skyultraplus.com/upload.php', form, {
      headers: {
        ...form.getHeaders(),
        'X-API-KEY': '3ade1171a99a228e',
      }
    });

    fs.unlinkSync(finalPath);

    const json = res.data || {};
    const url = json.file?.url || json.url;

    if (!url) throw new Error('❌ No se pudo obtener el link de SkyUltraPlus.');

    await conn.sendMessage(chatId, {
      text: `✅ *Archivo subido exitosamente a SkyUltraPlus:*\n${url}`
    }, { quoted: msg });

    await conn.sendMessage(chatId, {
      react: { text: '✅', key: msg.key }
    });

  } catch (err) {
    await conn.sendMessage(chatId, {
      text: `❌ *Error:* ${err.message}`
    }, { quoted: msg });

    await conn.sendMessage(chatId, {
      react: { text: '❌', key: msg.key }
    });
  }
};

handler.command = ['tourl3'];
handler.help = ['tourl'];
handler.tags = ['herramientas'];
handler.register = true;

export default handler;

