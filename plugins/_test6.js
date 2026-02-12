import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// Configuración de límites
const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Función de espera personalizada (15 segundos)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatDuration(duration) {
  if (!duration) return 'Desconocido';
  if (typeof duration === 'string' && duration.includes(':')) return duration;
  const seconds = parseInt(duration);
  if (isNaN(seconds)) return 'Desconocido';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Scraper adaptado a la estructura JSON proporcionada
 */
async function getAudioFromScraper(url) {
  try {
    console.log(`[DEBUG] Intentando obtener audio con el scraper personalizado...`);
    
    // Aquí usamos el endpoint del scraper que genera esa estructura
    const apiUrl = `https://dl07.yt-dl.click/api/json`; // Asegúrate de que esta sea la URL de tu API
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({
        url: url,
        downloadMode: 'audio',
        audioFormat: 'mp3'
      })
    });

    // Manejo de bloqueo (Rate Limit) - Espera de 15 segundos
    if (response.status === 429) {
      console.log(`[WARN] Bot bloqueado. Esperando 15 segundos según instrucciones de Sami...`);
      await delay(15000);
      return { success: false, error: 'rate-limit' };
    }

    const data = await response.json();

    // Adaptación a la estructura: result.url
    if (data.status && data.result && data.result.url) {
      return {
        success: true,
        url: data.result.url,
        title: data.result.info?.title || 'Audio de YouTube',
        thumbnail: data.result.info?.thumbnail
      };
    }
    
    return { success: false };
  } catch (e) {
    console.log(`❌ [ERROR] Error en el scraper: ${e.message}`);
    return { success: false };
  }
}

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  let searchData = null;
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  // Búsqueda previa para metadatos (Título, Miniatura, Duración)
  const query = isUrl ? url : args.join(' ');
  const searchResults = await yts(query);
  
  if (searchResults.videos.length) {
    searchData = searchResults.videos[0];
    if (!isUrl) url = searchData.url;
  }

  if (!url) return m.reply('No se encontraron resultados');

  try {
    await m.react('🕒');

    let apiResult = await getAudioFromScraper(url);

    // Reintento si hubo bloqueo
    if (!apiResult.success && apiResult.error === 'rate-limit') {
        apiResult = await getAudioFromScraper(url);
    }

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el enlace de descarga. Inténtalo de nuevo.`);
    }

    const { url: audioUrl } = apiResult;
    const finalTitle = searchData?.title || apiResult.title;
    const finalThumbnail = searchData?.thumbnail || apiResult.thumbnail;
    const finalDuration = searchData ? searchData.timestamp : 'Desconocido';
    
    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);
    
    // Descarga del archivo real
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error('Error al descargar el archivo desde el túnel.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo demasiado grande (${(arrayBuffer.byteLength/1024/1024).toFixed(1)}MB).`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const stats = fs.statSync(dest);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

    const caption = `🎵 *${finalTitle}*\n⏱️ ${finalDuration}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    // Enviar miniatura con información
    if (finalThumbnail) {
      await conn.sendMessage(m.chat, { image: { url: finalThumbnail }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    // Enviar el audio MP3
    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName: `${finalTitle}.mp3`,
    }, { quoted: m });

    // Limpieza
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
