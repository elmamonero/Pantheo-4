import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 150;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const APIS = [
  {
    name: 'Nexevo-API',
    url: `https://nexevo-api.vercel.app/download/y2?url=`,
    params: '',
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
    getThumb: (data) => data?.result?.thumbnail || null,
    getDuration: (data) => data?.result?.duration || null
  }
];

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function getVideoFromApis(url, controller) {
  for (const api of APIS) {
    try {
      const encodedUrl = encodeURIComponent(url);
      const apiUrl = `${api.url}${encodedUrl}${api.params || ''}`;
      
      console.log(`🎥 [YTMP4] Probando ${api.name}`);
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Verificación flexible de status true
        if (data?.status !== true && data?.status !== 'true') continue;
        
        const videoUrl = api.getVideoUrl(data);
        
        if (videoUrl) {
          return {
            success: true,
            api: api.name,
            title: api.getTitle(data) || 'Video de YouTube',
            thumbnail: api.getThumb(data),
            url: videoUrl,
            duration: formatDuration(api.getDuration(data))
          };
        }
      }
    } catch (e) {
      console.log(`❌ [YTMP4] ${api.name} error: ${e.message}`);
    }
  }
  return { success: false };
}

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);
  let searchData = {};

  try {
    const searchResults = await yts(isUrl ? url : args.join(' '));
    if (searchResults.videos.length > 0) {
      searchData = searchResults.videos[0];
      if (!isUrl) url = searchData.url;
    }
  } catch (e) {
    console.log("Error en búsqueda yts");
  }

  try {
    await m.react('🕒');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const apiResult = await getVideoFromApis(url, controller);
    clearTimeout(timeoutId);

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo procesar el video.\n\n*Pantheon Bot*`);
    }

    const { title, url: videoUrl } = apiResult;
    
    const finalDuration = apiResult.duration || searchData.timestamp || 'Desconocido';
    const finalThumb = apiResult.thumbnail || searchData.thumbnail || null;
    
    const fileName = `${title.replace(/[^\w\s-]/g, '')}.mp4`.replace(/\s+/g, '_').substring(0, 50);
    
    const videoResponse = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) });
    if (!videoResponse.ok) throw new Error(`Error HTTP: ${videoResponse.status}`);

    const arrayBuffer = await videoResponse.arrayBuffer();
    const sizeMB = (arrayBuffer.byteLength/1024/1024).toFixed(1);
    
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo muy pesado (${sizeMB}MB). Máximo ${MAX_SIZE_MB}MB`);
    }

    const buffer = Buffer.from(arrayBuffer);
    const caption = `🎥 *${title}*\n⏱️ ${finalDuration}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    if (finalThumb) {
      await conn.sendMessage(m.chat, { image: { url: finalThumb }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    // Nota: El usuario debe esperar 15 segundos según sus preferencias guardadas
    await conn.sendMessage(m.chat, {
      video: buffer,
      mimetype: 'video/mp4',
      fileName: `${fileName}.mp4`,
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    await m.react('✖️');
    if (error.message.includes('pesado')) return m.reply(`📏 ${error.message}`);
    m.reply('⚠️ Error al descargar el video.');
  }
};

handler.help = ['pruebaplay <nombre|URL>'];
handler.command = ['pruebaplay', 'ytmp4', 'video'];
handler.tags = ['descargas'];

export default handler;
