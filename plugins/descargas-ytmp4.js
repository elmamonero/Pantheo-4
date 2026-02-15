import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// Configuración de límites y tiempos
const MAX_SIZE_MB = 150;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const API_TIMEOUT = 10000; // 10 segundos por API antes de saltar

// Función para formatear duración
function formatDuration(duration) {
  if (!duration) return '00:00';
  if (typeof duration === 'string' && duration.includes(':')) return duration;
  
  const seconds = parseInt(duration);
  if (isNaN(seconds)) return '00:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const APIS = [
  {
    name: 'Nightlight',
    url: `https://api.nightlight.qzz.io/dl/ytmp4?url=`,
    params: '&quality=auto&key=api-GRZpK',
    getVideoUrl: (data) => data?.result?.url,
    getTitle: (data) => data?.result?.title,
    getThumb: (data) => data?.result?.thumb,
    getDuration: (data) => data?.result?.duration 
  },
  {
    name: 'Nexevo-API',
    url: `https://nexevo-api.vercel.app/download/y2?url=`,
    getVideoUrl: (data) => data?.result?.url,
    getTitle: (data) => data?.result?.info?.title,
    getThumb: (data) => data?.result?.info?.thumbnail,
    getDuration: (data) => data?.result?.info?.duration 
  },
  {
    name: 'Sylphy-API',
    url: `https://sylphy.xyz/download/ytmp4?url=`,
    params: '&q=480p&api_key=sylphy-KthGG9y',
    getVideoUrl: (data) => data?.result?.dl_url, 
    getTitle: (data) => data?.result?.title,
    getThumb: (data) => data?.result?.thumbnail,
    getDuration: (data) => data?.result?.duration
  }
];

async function getVideoFromApis(url) {
  for (const api of APIS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const encodedUrl = encodeURIComponent(url);
      const apiUrl = `${api.url}${encodedUrl}${api.params || ''}`;
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });

      clearTimeout(id);

      if (response.ok) {
        const data = await response.json();
        // Verificación de status flexible
        if (data?.status !== true && data?.status !== 'true' && !data?.result) continue;
        
        const videoUrl = api.getVideoUrl(data);
        if (videoUrl) {
          return {
            success: true,
            apiName: api.name,
            title: api.getTitle(data),
            thumbnail: api.getThumb(data),
            url: videoUrl,
            duration: formatDuration(api.getDuration(data))
          };
        }
      }
    } catch (e) {
      continue; // Salta a la siguiente API si hay timeout o error
    } finally {
      clearTimeout(id);
    }
  }
  return { success: false };
}

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('¿Qué video buscamos hoy? Ingresa el nombre o el enlace.');

  let url = args[0];
  let searchData = null;
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  try {
    const query = isUrl ? url : args.join(' ');
    const searchResults = await yts(query);
    if (searchResults.videos.length) {
      searchData = searchResults.videos[0];
      if (!isUrl) url = searchData.url;
    }

    if (!url) return m.reply('No encontré resultados para esa búsqueda.');

    await m.react('🎬');

    // Lógica de rotación idéntica a la de audio
    let apiResult = await getVideoFromApis(url);

    if (!apiResult.success) {
      await m.react('❌');
      return m.reply(`*Error:* No se pudo obtener el video de ninguna fuente disponible.`);
    }

    const { title, thumbnail, url: videoUrl, apiName } = apiResult;
    const finalThumbnail = thumbnail || searchData?.thumbnail || searchData?.image;
    const finalDuration = apiResult.duration === '00:00' && searchData ? searchData.timestamp : apiResult.duration;
    const channel = searchData?.author?.name || 'YouTube';
    
    // Descarga del buffer real
    const dest = path.join('/tmp', `${Date.now()}_video.mp4`);
    const videoResponse = await fetch(videoUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.youtube.com/'
      }
    });

    if (!videoResponse.ok) throw new Error('Fallo al descargar el archivo de video.');

    const arrayBuffer = await videoResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) throw new Error(`El video es muy pesado.`);
    if (arrayBuffer.byteLength < 10000) throw new Error(`El archivo descargado no es válido.`);

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const stats = fs.statSync(dest);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

    // Formato visual Pantheon
    const caption = `───「 **𝖸𝗈𝗎𝖳𝗎𝖻𝖾 𝖵𝗂𝖽𝖾𝗈** 」───\n\n` +
                    `◈ *${title}*\n\n` +
                    `↳ ✨ **𝖣𝗎𝗋𝖺𝖼𝗂𝗈́𝗇:** ${finalDuration}\n` +
                    `↳ 👤 **𝖢𝖺𝗇𝖺𝗅:** ${channel}\n` +
                    `↳ 💾 **𝖳𝖺𝗆𝖺𝗇̃𝗈:** ${sizeMB}MB\n\n` +
                    `_⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡𝗈𝗍 𝖤𝖽𝗂𝗍𝗂𝗈𝗇_`;

    if (finalThumbnail) {
      await conn.sendMessage(m.chat, { image: { url: finalThumbnail }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    // Envío del video
    await conn.sendMessage(m.chat, {
      video: fs.readFileSync(dest),
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
    }, { quoted: m });

    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await m.react('✅');

  } catch (error) {
    await m.react('❌');
    console.error(error);
    m.reply(`⚠️ **Aviso:** ${error.message}`);
  }
};

handler.help = ['playvideo <nombre|URL>'];
handler.command = ['playvideo', 'ytmp4', 'video'];
handler.tags = ['descargas'];

export default handler;
