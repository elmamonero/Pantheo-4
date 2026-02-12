import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// Configuración de límites y tiempos
const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Scraper optimizado para Savetube
 */
async function getAudioFromSavetube(url) {
  try {
    console.log(`[DEBUG] Intentando obtener audio con Savetube...`);
    
    // Extraer ID de video para la API de Savetube
    const videoId = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=))([\w\-]{11})/)?.[1];
    if (!videoId) return { success: false };

    // Endpoint de Savetube para obtener el enlace de descarga (dl)
    const apiUrl = `https://api.savetube.me/info?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Manejo de bloqueo: Espera de 15 segundos
    if (response.status === 429) {
      console.log(`[WARN] Bot bloqueado. Esperando 15 segundos...`);
      await delay(15000); 
      return { success: false, error: 'rate-limit' };
    }

    const data = await response.json();

    // Verificamos la estructura que me pasaste: data.dl
    if (data && data.status && data.data && data.data.dl) {
      return {
        success: true,
        url: data.data.dl,
        title: data.data.title || 'Audio de YouTube',
        thumbnail: data.data.thumbnail,
        duration: data.data.duration
      };
    }
    
    return { success: false };
  } catch (e) {
    console.log(`❌ [ERROR] Error en el scraper de Savetube: ${e.message}`);
    return { success: false };
  }
}

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de YouTube');

  let url = args[0];
  let searchData = null;
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  // Búsqueda previa para metadatos
  const query = isUrl ? url : args.join(' ');
  const searchResults = await yts(query);
  
  if (searchResults.videos.length) {
    searchData = searchResults.videos[0];
    if (!isUrl) url = searchData.url;
  }

  if (!url) return m.reply('No se encontraron resultados');

  try {
    await m.react('🕒');

    let apiResult = await getAudioFromSavetube(url);

    // Reintento si hubo bloqueo tras esperar los 15 segundos
    if (!apiResult.success && apiResult.error === 'rate-limit') {
        apiResult = await getAudioFromSavetube(url);
    }

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el audio de Savetube.`);
    }

    const { url: audioUrl, title, thumbnail, duration } = apiResult;
    const finalTitle = title || searchData?.title || 'Audio';
    const finalThumbnail = thumbnail || searchData?.thumbnail;
    const finalDuration = duration || searchData?.timestamp || '---';
    
    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);
    
    // Descarga desde el CDN (ej: cdn400.savetube.vip)
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error('Error al descargar el archivo desde el CDN.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`El archivo excede los ${MAX_SIZE_MB}MB permitidos.`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);

    const caption = `🎵 *${finalTitle}*\n⏱️ ${finalDuration}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    if (finalThumbnail) {
      await conn.sendMessage(m.chat, { image: { url: finalThumbnail }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    // Envío del código completo
    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName: `${finalTitle}.mp3`,
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
handler.command = ['pruebaplay']; // Comando único
handler.tags = ['descargas'];

export default handler;
