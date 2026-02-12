import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Scraper adaptado para generar enlaces Savetube VIP
 * Blindado contra errores ENOTFOUND y JSON inválidos
 */
async function getAudioFromSavetube(url) {
  try {
    console.log(`[DEBUG] Intentando obtener audio con Savetube VIP...`);
    
    // Extraer ID del video
    const videoId = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=))([\w\-]{11})/)?.[1];
    if (!videoId) return { success: false };

    // Usamos el endpoint de procesamiento que es más estable
    const res = await fetch(`https://cdn-pro.savetube.me/info/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://savetube.me/'
      }
    });

    if (res.status === 429) {
      await delay(15000); // Tu espera de 15 segundos
      return { success: false, error: 'rate-limit' };
    }

    const data = await res.json();
    
    // Buscamos la calidad 128kbps o la disponible en formato mp3
    const audioData = data.data?.audio_formats?.find(f => f.quality === 128) || data.data?.audio_formats?.[0];

    if (audioData && audioData.url) {
      return {
        success: true,
        url: audioData.url,
        title: data.data?.title || 'Audio de YouTube',
        thumbnail: data.data?.thumbnail,
        duration: data.data?.duration_label
      };
    }
    
    return { success: false };
  } catch (e) {
    console.log(`❌ [ERROR] Fallo de conexión o resolución: ${e.message}`);
    return { success: false };
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

  try {
    await m.react('🕒');

    let apiResult = await getAudioFromSavetube(url);

    // Reintento tras espera de 15 segundos si hubo bloqueo
    if (!apiResult.success && apiResult.error === 'rate-limit') {
        apiResult = await getAudioFromSavetube(url);
    }

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo conectar con el servidor de descarga. Intenta de nuevo.`);
    }

    const { url: audioUrl, title, thumbnail, duration } = apiResult;
    const finalTitle = title || searchData?.title || 'Audio';
    const finalThumbnail = thumbnail || searchData?.thumbnail;
    const finalDuration = duration || searchData?.timestamp || '---';
    
    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);
    
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error('El enlace de descarga ha caducado.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) throw new Error('Archivo demasiado pesado.');

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);

    const caption = `🎵 *${finalTitle}*\n⏱️ ${finalDuration}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    if (finalThumbnail) {
      await conn.sendMessage(m.chat, { image: { url: finalThumbnail }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName: `${finalTitle}.mp3`,
    }, { quoted: m });

    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await m.react('✅');

  } catch (error) {
    await m.react('✖️');
    m.reply(`⚠️ *Error:* ${error.message}`);
  }
};

handler.help = ['pruebaplay <nombre|URL>'];
handler.command = ['pruebaplay'];
handler.tags = ['descargas'];

export default handler;
