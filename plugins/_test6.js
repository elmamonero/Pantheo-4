import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// Configuración de límites
const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Función de espera personalizada (Ahora configurada a 15 segundos)
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
 * Scraper adaptado para Cobalt (yt-dl.click)
 */
async function getAudioFromCobalt(url) {
  try {
    console.log(`[DEBUG] Intentando descargar con Cobalt (yt-dl.click)...`);
    
    const cobaltApi = 'https://dl07.yt-dl.click/api/json'; 
    
    const response = await fetch(cobaltApi, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        url: url,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioBitrate: '128'
      })
    });

    // Si el bot está bloqueado (Rate Limit), espera 15 segundos
    if (response.status === 429) {
      console.log(`[WARN] Bot bloqueado temporalmente. Esperando 15 segundos...`);
      await delay(15000); 
      return { success: false, error: 'rate-limit' };
    }

    const data = await response.json();

    if (data && data.url) {
      return {
        success: true,
        url: data.url,
        title: data.filename || 'Audio de YouTube'
      };
    }
    
    return { success: false };
  } catch (e) {
    console.log(`❌ [ERROR] Error en el scraper de Cobalt: ${e.message}`);
    return { success: false };
  }
}

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

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
    await m.react('🕒');

    let apiResult = await getAudioFromCobalt(url);

    // Reintento tras la espera si hubo bloqueo
    if (!apiResult.success && apiResult.error === 'rate-limit') {
        apiResult = await getAudioFromCobalt(url);
    }

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo procesar el audio.`);
    }

    const { url: audioUrl, title: cobaltTitle } = apiResult;
    const finalTitle = searchData?.title || cobaltTitle;
    const finalThumbnail = searchData?.thumbnail || searchData?.image;
    const finalDuration = searchData ? searchData.timestamp : 'Desconocido';
    
    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);
    
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error('Error al descargar el archivo.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo demasiado grande.`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const stats = fs.statSync(dest);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

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

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];

export default handler;
