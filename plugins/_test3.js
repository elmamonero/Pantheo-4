import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// Límite de peso en memoria RAM (250MB)
const MAX_SIZE_BYTES = 250 * 1024 * 1024;

// Función para descargar el archivo directo a la RAM una vez que obtengamos la URL de descarga
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

// --- HANDLER PRINCIPAL ---
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

    console.log(`📡 [pruebaplay5] Llamando a OptiShield.callApi('ok') para: ${url}`);

    // Ejecutamos la consulta usando la función global instalada en tu bot
    const data = await global.OptiShield.callApi('ok', { 
      url: url, 
      apikey: 'anonymous' 
    });

    // Intentamos extraer la URL de descarga siguiendo la estructura típica del JSON de OptiShield
    const downloadUrl = data?.result?.data?.available?.audio?.[0]?.download_url || data?.result?.download || data?.url;
    const title = data?.result?.data?.title || data?.title || searchData?.title || 'Audio de YouTube';
    const thumbnail = data?.result?.data?.thumbnail || data?.thumbnail || searchData?.thumbnail;

    // Si el servidor no devolvió una URL de descarga directa, te mandará el JSON completo por WhatsApp para que veas qué respondió
    if (!downloadUrl) {
      await m.react('❌');
      return m.reply(
        `⚠️ *OptiShield respondió, pero no generó link de descarga.*\n\n` +
        `Aquí tienes el JSON de respuesta para revisar:\n` +
        `\`\`\`${JSON.stringify(data, null, 2)}\`\`\``
      );
    }

    // Si milagrosamente la ruta "ok" con "anonymous" te resuelve la descarga, procede a enviar el audio:
    const caption = `───「 *𝖮𝖯𝖳𝖨𝖲𝖧𝖨𝖤𝖫𝖣 𝖯𝖫𝖠𝖸* 」───\n\n` +
                    `◈ *${title}*\n\n` +
                    `↳ 🔗 *𝖤𝗇𝗅𝖺𝖼𝖾:* ${url}\n\n` +
                    `⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡𝗈`;

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

// --- CONFIGURACIÓN DEL HANDLER ---
handler.help = ['pruebaplay5 <nombre|URL>'];
handler.command = ['pruebaplay5'];
handler.tags = ['descargas'];

export default handler;
