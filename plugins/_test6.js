import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// Límites de descarga (250MB)
const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Función de espera personalizada (15 segundos según instrucciones de Sami)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Scraper adaptado para Savetube.vip
 */
async function getAudioFromSavetube(url) {
  try {
    console.log(`[DEBUG] Intentando obtener audio con el scraper de Savetube...`);
    
    // API de Savetube para obtener la info del video y el link de descarga
    const apiUrl = `https://api.savetube.me/info?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Si el bot está bloqueado, esperamos 15 segundos
    if (response.status === 429) {
      console.log(`[WARN] Bloqueo detectado. Esperando 15 segundos...`);
      await delay(15000); 
      return { success: false, error: 'rate-limit' };
    }

    const data = await response.json();

    // Verificamos la existencia del enlace directo (dl)
    if (data && data.status && data.data && data.data.dl) {
      return {
        success: true,
        url: data.data.dl, // Aquí vendrá el link tipo cdn400.savetube.vip
        title: data.data.title || 'Audio de YouTube',
        thumbnail: data.data.thumbnail,
        duration: data.data.duration
      };
    }
    
    return { success: false };
  } catch (e) {
    console.log(`❌ [ERROR] Error en el scraper Savetube: ${e.message}`);
    return { success: false };
  }
}

const handler = async (m, { conn, args }) => {
  // Verificación de argumentos
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  let searchData = null;
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  // Búsqueda en YouTube para metadatos
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

    // Reintento tras la espera de 15 segundos si hubo bloqueo inicial
    if (!apiResult.success && apiResult.error === 'rate-limit') {
        apiResult = await getAudioFromSavetube(url);
    }

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el audio con el scraper de Savetube.`);
    }

    const { url: audioUrl, title, thumbnail, duration } = apiResult;
    const finalTitle = title || searchData?.title || 'Audio';
    const finalThumbnail = thumbnail || searchData?.thumbnail;
    const finalDuration = duration || searchData?.timestamp || '---';
    
    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);
    
    // Descarga desde el enlace directo del CDN
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error('Error al descargar el archivo desde el servidor de Savetube.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`El archivo excede el límite de ${MAX_SIZE_MB}MB.`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);

    const caption = `🎵 *${finalTitle}*\n⏱️ ${finalDuration}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    // Envío de miniatura con info
    if (finalThumbnail) {
      await conn.sendMessage(m.chat, { image: { url: finalThumbnail }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    // Envío del archivo de audio
    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName: `${finalTitle}.mp3`,
    }, { quoted: m });

    // Limpieza de archivos temporales
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await m.react('✅');

  } catch (error) {
    await m.react('✖️');
    console.error(`[HANDLER ERROR]`, error);
    m.reply(`⚠️ *Error:* ${error.message}`);
  }
};

handler.help = ['pruebaplay <nombre|URL>'];
handler.command = ['pruebaplay']; // Único comando permitido
handler.tags = ['descargas'];

export default handler;
