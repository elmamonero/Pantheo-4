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
      
      console.log(`🎥 [YTMP4] Intentando con ${api.name}`);
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
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
      console.log(`❌ [YTMP4] ${api.name} falló: ${e.message}`);
    }
  }
  return { success: false };
}

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de YouTube.');

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
    console.log("Error en yts");
  }

  try {
    await m.react('🕒');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const apiResult = await getVideoFromApis(url, controller);
    clearTimeout(timeoutId);

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener un enlace de descarga válido.`);
    }

    const { title, url: videoUrl } = apiResult;
    const finalDuration = apiResult.duration || searchData.timestamp || 'Desconocido';
    const finalThumb = apiResult.thumbnail || searchData.thumbnail || null;
    
    // Descarga del video con headers para evitar bloqueos
    const videoResponse = await fetch(videoUrl, { 
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://nexevo-api.vercel.app/'
      }
    });

    if (!videoResponse.ok) throw new Error('El servidor de descarga rechazó la petición.');

    const arrayBuffer = await videoResponse.arrayBuffer();
    const sizeMB = (arrayBuffer.byteLength/1024/1024).toFixed(1);
    
    if (arrayBuffer.byteLength < 1000) throw new Error('El archivo descargado está corrupto o vacío.');
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) throw new Error(`El video es muy pesado (${sizeMB}MB).`);

    const buffer = Buffer.from(arrayBuffer);
    const caption = `🎥 *${title}*\n⏱️ ${finalDuration}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    if (finalThumb) {
      await conn.sendMessage(m.chat, { image: { url: finalThumb }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    // Recuerda que el comando para el scraper es .pruebaplay
    await conn.sendMessage(m.chat, {
      video: buffer,
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    console.error(error);
    await m.react('✖️');
    m.reply(`⚠️ *Error:* ${error.message}`);
  }
};

handler.help = ['pruebaplay <nombre|URL>'];
handler.command = ['pruebaplay', 'ytmp4', 'video'];
handler.tags = ['descargas'];

export default handler;
