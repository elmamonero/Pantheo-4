import fs from 'fs';
import path from 'path';
import yts from 'yt-search';
// IMPORTANTE: Asegúrate de poner la ruta correcta hacia tu archivo de utilidades de OptiShield
// Si está en la misma carpeta podría ser './utils.js', si está una carpeta atrás '../utils.js'
import { callApi } from '../utils.js'; 

const MAX_SIZE_BYTES = 250 * 1024 * 1024;

async function fetchBuffer(url, maxBytes) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  })
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength > maxBytes) throw new Error('El archivo supera el límite permitido.')
  return Buffer.from(arrayBuffer)
}

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('¿Qué canción quieres probar? Ingresa el nombre o el enlace.');

  let url = args[0];
  let searchData = null;
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  try {
    const query = isUrl ? url : args.join(' ');
    const searchResults = await yts(query);
    if (searchResults.videos.length) {
      searchData = searchResults.videos[0];
      url = searchData.url; 
    }

    if (!url) return m.reply('No encontré resultados para esa búsqueda.');

    await m.react('⏳');

    console.log(`📡 [pruebaplay5] Llamando a la función importada callApi('ok') para: ${url}`);

    // Usamos la función importada directamente para evitar el error de "undefined"
    const data = await callApi('ok', { 
      url: url, 
      apikey: 'anonymous' 
    });

    const downloadUrl = data?.result?.data?.available?.audio?.[0]?.download_url || data?.result?.download || data?.url;
    const title = data?.result?.data?.title || data?.title || searchData?.title || 'Audio de YouTube';
    const thumbnail = data?.result?.data?.thumbnail || data?.thumbnail || searchData?.thumbnail;

    if (!downloadUrl) {
      await m.react('❌');
      return m.reply(
        `⚠️ *OptiShield respondió, pero no generó link de descarga.*\n\n` +
        `Aquí tienes el JSON de respuesta para revisar:\n` +
        `\`\`\`${JSON.stringify(data, null, 2)}\`\`\``
      );
    }

    const caption = `───「 *𝖮𝖯𝖳𝖨𝖲𝖧𝖨𝖤𝖫𝖣 𝖯𝖫𝖠𝖸* 」───\n\n` +
                    `◈ *${title}*\n\n` +
                    `↳ 🔗 *𝖤𝗇𝗅𝖺𝖼𝖾:* ${url}\n\n` +
                    `⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡𝗈𝗍`;

    console.log(`📥 Descargando buffer de la URL devuelta por OptiShield...`);
    const rawAudioBuffer = await fetchBuffer(downloadUrl, MAX_SIZE_BYTES);

    if (thumbnail) {
      await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    await conn.sendMessage(m.chat, {
      audio: rawAudioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    await m.react('❌');
    console.error('❌ [Error en prueba OptiShield]', error);
    m.reply(`⚠️ **Error interno:** ${error.message}`);
  }
};

handler.help = ['pruebaplay5 <nombre|URL>'];
handler.command = ['pruebaplay5'];
handler.tags = ['descargas'];

export default handler;
