import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getAudioFromCobalt(url) {
  try {
    // Usamos una instancia alternativa más estable para peticiones directas
    const cobaltInstances = [
      'https://cobalt.hyra.com/api/json',
      'https://api.cobalt.tools/api/json'
    ];

    for (let api of cobaltInstances) {
      const response = await fetch(api, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          downloadMode: 'audio',
          audioFormat: 'mp3'
        })
      });

      if (response.status === 429) {
        console.log(`[WARN] Rate limit alcanzado. Esperando 15 segundos...`);
        await delay(15000);
        continue;
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data && data.url) return { success: true, url: data.url };
      }
    }
    return { success: false };
  } catch (e) {
    console.log(`❌ Error en scraper: ${e.message}`);
    return { success: false };
  }
}

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Ingresa un nombre o URL');

  let url = args[0];
  let searchData = null;
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  const query = isUrl ? url : args.join(' ');
  const searchResults = await yts(query);
  if (searchResults.videos.length) {
    searchData = searchResults.videos[0];
    if (!isUrl) url = searchData.url;
  }

  try {
    await m.react('🕒');

    let apiResult = await getAudioFromCobalt(url);

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el audio. Inténtalo de nuevo en unos momentos.`);
    }

    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);
    const audioResponse = await fetch(apiResult.url);
    const arrayBuffer = await audioResponse.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo muy grande.`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);

    const caption = `🎵 *${searchData?.title || 'Audio'}*\n⏱️ ${searchData?.timestamp || '---'}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    await conn.sendMessage(m.chat, { 
      image: { url: searchData?.thumbnail || '' }, 
      caption 
    }, { quoted: m });

    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName: `audio.mp3`,
    }, { quoted: m });

    fs.unlinkSync(dest);
    await m.react('✅');

  } catch (error) {
    await m.react('✖️');
    m.reply(`⚠️ Error: ${error.message}`);
  }
};

handler.command = ['pruebaplay'];
handler.tags = ['descargas'];

export default handler;
