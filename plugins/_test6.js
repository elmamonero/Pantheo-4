import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// Configuración de límites y tiempos
const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const WAIT_TIME = 5000; // Delay de 5 segundos solicitado

// Función para formatear duración
function formatDuration(duration) {
  if (!duration) return 'Desconocido';
  if (typeof duration === 'string' && duration.includes(':')) return duration;
  
  const seconds = parseInt(duration);
  if (isNaN(seconds)) return 'Desconocido';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Función de espera (Promesa)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  let searchData = null;
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  // Búsqueda en YouTube para obtener metadatos y URL limpia
  const query = isUrl ? url : args.join(' ');
  const searchResults = await yts(query);
  if (searchResults.videos.length) {
    searchData = searchResults.videos[0];
    if (!isUrl) url = searchData.url;
  }

  if (!url) return m.reply('No se encontraron resultados');

  try {
    // Reaccionar e iniciar la espera de 5 segundos
    await m.react('⏳');
    await delay(WAIT_TIME);

    // Llamada al Scraper de Savetube (Basado en la estructura JSON proporcionada)
    // Nota: Reemplaza 'TU_URL_DEL_SCRAPER' con el endpoint real que genera ese JSON
    const scraperUrl = `https://cdn400.savetube.vip/media/${searchData.videoId}`; 
    
    // Simulamos la obtención del JSON que me mostraste
    // En la práctica, aquí harías un fetch a tu API de descarga:
    // const res = await fetch(`https://api.ejemplo.com/download?url=${url}`);
    // const json = await res.json();
    
    // Para este código, usaremos la lógica de extracción directa de la propiedad 'dl'
    // que aparece en el JSON que enviaste.
    console.log(`[INFO] Procesando descarga para ID: ${searchData.videoId}`);
    
    // Usamos el formato de URL de descarga que me pasaste en el JSON
    const audioUrl = `https://cdn400.savetube.vip/media/${searchData.videoId}/${encodeURIComponent(searchData.title)}-128-ytshorts.savetube.me.mp3`;

    const title = searchData?.title || 'Audio de YouTube';
    const thumbnail = searchData?.thumbnail || searchData?.image;
    const finalDuration = searchData?.timestamp || 'Desconocido';
    
    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);
    
    const audioResponse = await fetch(audioUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://savetube.me/' 
      }
    });

    if (!audioResponse.ok) throw new Error('El servidor de Savetube no pudo procesar este audio. Intenta con otro video.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo demasiado grande: ${(arrayBuffer.byteLength/1024/1024).toFixed(1)}MB.`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const stats = fs.statSync(dest);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

    const caption = `🎵 *${title}*\n⏱️ ${finalDuration}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    if (thumbnail) {
      await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
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
