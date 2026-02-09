import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const APIS = [
  {
    name: 'Sylphy-API',
    url: `https://sylphy.xyz/download/ytmp4?url=`,
    params: '&q=720p&api_key=sylphy-KthGG9y',
    getVideoUrl: (data) => data?.result?.dl_url, 
    getTitle: (data) => data?.result?.title,
    getThumb: (data) => data?.result?.thumbnail || null, // No viene en tu estructura, se usará fallback
    getDuration: (data) => data?.result?.duration || null
  }
];

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'Desconocido';
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
        console.log(`🎥 [YTMP4] ${api.name} status: ${data?.status}`);
        
        if (data?.status !== true && data?.status !== 'true') {
          console.log(`❌ [YTMP4] ${api.name} status inválido`);
          continue;
        }
        
        const videoUrl = api.getVideoUrl(data);
        
        if (videoUrl) {
          console.log(`✅ [YTMP4] ${api.name} exitosa: ${api.getTitle(data)}`);
          return {
            success: true,
            api: api.name,
            title: api.getTitle(data) || 'Video de YouTube',
            thumbnail: api.getThumb(data),
            url: videoUrl,
            duration: formatDuration(api.getDuration(data))
          };
        } else {
          console.log(`❌ [YTMP4] ${api.name}: No video URL`);
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
  let searchThumbnail = '';

  if (!isUrl) {
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) return m.reply('No se encontraron resultados.');
    url = searchResults.videos[0].url;
    searchThumbnail = searchResults.videos[0].thumbnail; // Guardamos thumb de la búsqueda
  }

  try {
    await m.react('🕒');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const apiResult = await getVideoFromApis(url, controller);
    clearTimeout(timeoutId);

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo procesar el video con la API.\n\n*Pantheon Bot*`);
    }

    const { title, url: videoUrl, duration } = apiResult;
    const finalThumb = apiResult.thumbnail || searchThumbnail;
    const fileName = `${title.replace(/[^\w\s-]/g, '')}.mp4`.replace(/\s+/g, '_').substring(0, 50);
    
    const videoResponse = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) });
    if (!videoResponse.ok) throw new Error(`Error HTTP: ${videoResponse.status}`);

    const arrayBuffer = await videoResponse.arrayBuffer();
    const sizeMB = (arrayBuffer.byteLength/1024/1024).toFixed(1);
    
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo muy pesado (${sizeMB}MB). Máximo ${MAX_SIZE_MB}MB`);
    }

    const buffer = Buffer.from(arrayBuffer);
    const caption = `🎥 *${title}*\n⏱️ ${duration}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    // Envío con imagen si existe
    if (finalThumb) {
      await conn.sendMessage(m.chat, { image: { url: finalThumb }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    // Envío del video
    await conn.sendMessage(m.chat, {
      video: buffer,
      mimetype: 'video/mp4',
      fileName: `${fileName}.mp4`,
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    console.log(`💥 [YTMP4] Error: ${error.message}`);
    await m.react('✖️');
    if (error.message.includes('pesado')) return m.reply(`📏 ${error.message}`);
    m.reply('⚠️ Error al descargar el video.');
  }
};

handler.help = ['ytmp4 <nombre|URL>'];
handler.command = ['ytmp4', 'video'];
handler.tags = ['descargas'];

export default handler;
