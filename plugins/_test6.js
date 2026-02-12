import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const WAIT_TIME = 5000; 

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Función para obtener el enlace de descarga real de Savetube
 */
async function getSavetubeDl(videoId) {
    try {
        const res = await fetch(`https://api.savetube.me/info/${videoId}`);
        const json = await res.json();
        if (json.status && json.data) {
            // Buscamos el formato mp3 en 128kbps o el primero disponible
            return json.data.dl || null;
        }
        return null;
    } catch {
        return null;
    }
}

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de YouTube');

  let url = args[0];
  let searchData = null;
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  const query = isUrl ? url : args.join(' ');
  const searchResults = await yts(query);
  if (searchResults.videos.length) {
    searchData = searchResults.videos[0];
    if (!isUrl) url = searchData.url;
  }

  if (!url) return m.reply('No se encontraron resultados');

  try {
    await m.react('⏳');
    await delay(WAIT_TIME);

    const videoId = searchData?.videoId || url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
    
    // OBTENCIÓN DINÁMICA DEL LINK
    // Intentamos obtener el link real del JSON
    const audioUrl = await getSavetubeDl(videoId);

    if (!audioUrl) {
        throw new Error('No se pudo generar el enlace de descarga. Intenta de nuevo.');
    }

    console.log(`[INFO] Descargando desde link real: ${audioUrl}`);

    const audioResponse = await fetch(audioUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://savetube.me/' 
      }
    });

    if (!audioResponse.ok) throw new Error('El servidor de archivos denegó el acceso.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo demasiado grande.`);
    }

    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);
    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    
    const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
    const title = searchData?.title || 'Audio';

    const caption = `🎵 *${title}*\n⏱️ ${searchData?.timestamp || '---'}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    if (searchData?.thumbnail) {
      await conn.sendMessage(m.chat, { image: { url: searchData.thumbnail }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
    }, { quoted: m });

    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await m.react('✅');

  } catch (error) {
    await m.react('✖️');
    console.error(`[HANDLER ERROR]`, error);
    m.reply(`⚠️ *Error:* ${error.message}`);
  }
};

handler.help = ['pruebaplay <nombre|URL>'];
handler.command = ['pruebaplay'];
handler.tags = ['descargas'];

export default handler;
