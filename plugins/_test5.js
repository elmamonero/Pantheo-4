import axios from 'axios';
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

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const targetMessage = quoted || msg.message;

  const { typeDetected, mediaMessage } = detectMedia(targetMessage);
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

  if (!mediaMessage) {
    await conn.sendMessage(chatId, {
      text: `✳️ *Usa:*\n${pref}${command}\n\n📌 Responde a una imagen, video, audio, sticker o documento, o pasa una URL directa.`,
    }, { quoted: msg });
    try { await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } }); } catch {}
    return;
  }

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

    if (!buffer || buffer.length === 0) throw new Error("El archivo está vacío.");
    if (buffer.length > 200 * 1024 * 1024) throw new Error("El archivo supera los 200MB.");

    const apiRes = await apiUploadRaw({ buffer, filename, mime });
    const url = pickUrlFromApi(apiRes);

    if (!url) throw new Error("Subió pero no retornó una URL válida.");

    await conn.sendMessage(chatId, { text: `✅ *Archivo subido exitosamente:*\n${url}` }, { quoted: msg });
    try { await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }); } catch {}

  } catch (e) {
    const errorMsg = e.response?.data?.message || e.message;
    await conn.sendMessage(chatId, { text: `❌ *Error al subir:* ${errorMsg}` }, { quoted: msg });
    try { await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } }); } catch {}
  }
};

handler.command = ["tourl3"];
handler.help = ["tourl3"];
handler.tags = ["herramientas"];
handler.register = true;

export default handler;

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

  const res = await axios.post(url, buffer, {
    headers: {
      apikey: API_KEY,
      "Content-Type": mime || "application/octet-stream",
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return res.data;
}

async function apiUploadFromUrl(remoteUrl) {
  const base = API_BASE.replace(/\/+$/, "");
  const url = `${base}${ENDPOINT_JSON}`;

  const res = await axios.post(url, { url: remoteUrl }, {
    headers: {
      apikey: API_KEY,
      "Content-Type": "application/json",
    },
  });

  return res.data;
}

