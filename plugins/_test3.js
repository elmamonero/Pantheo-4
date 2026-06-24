import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

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

    // 1. Hacemos el fetch DIRECTO a la API de OptiShield apuntando al tipo "ok" con la key "anonymous"
    // Esto se salta el SDK del bot para evitar el error de "undefined"
    console.log(`📡 [pruebaplay5] Fetch directo a OptiShield para: ${url}`);
    
    const optiShieldUrl = `https://api.optishield.club/api/ok?url=${encodeURIComponent(url)}&apikey=anonymous`;
    
    const apiResponse = await fetch(optiShieldUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (!apiResponse.ok) {
      await m.react('❌');
      return m.reply(`❌ El servidor de OptiShield devolvió un error HTTP ${apiResponse.status}`);
    }

    const data = await apiResponse.json();

    // 2. Extraemos los datos de la respuesta para ver si generó enlace de descarga
    const downloadUrl = data?.result?.data?.available?.audio?.[0]?.download_url || data?.result?.download || data?.url;
    const title = data?.result?.data?.title || data?.title || searchData?.title || 'Audio de YouTube';
    const thumbnail = data?.result?.data?.thumbnail || data?.thumbnail || searchData?.thumbnail;

    // Si no devuelve un enlace directo de descarga, te va a mandar el JSON completo por WhatsApp
    if (!downloadUrl) {
      await m.react('❌');
      return m.reply(
        `⚠️ *OptiShield respondió el Fetch directo, pero NO generó link de descarga.*\n\n` +
        `Aquí tienes el JSON real que devolvió el servidor para que veas qué contiene:\n` +
        `\`\`\`${JSON.stringify(data, null, 2)}\`\`\``
      );
    }

    // 3. Si la API te otorgó un enlace válido, lo descarga y te lo envía
    const caption = `───「 *𝖮𝖯𝖳𝖨𝖲𝖧𝖨𝖤𝖫𝖣 𝖯𝖫𝖠𝖸* 」───\n\n` +
                    `◈ *${title}*\n\n` +
                    `↳ 🔗 *𝖤𝗇𝗅𝖺𝖼𝖾:* ${url}\n\n` +
                    `⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡𝗈𝗍`;

    console.log(`📥 Descargando buffer desde la URL devuelta por OptiShield...`);
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
    console.error('❌ [Error en Fetch Directo OptiShield]', error);
    m.reply(`⚠️ **Error en la petición:** ${error.message}`);
  }
};

handler.help = ['pruebaplay5 <nombre|URL>'];
handler.command = ['pruebaplay5']
handler.tags = ['descargas'];

export default handler;
