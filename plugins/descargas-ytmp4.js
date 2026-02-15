import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 150;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const API_TIMEOUT = 10000; 

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
  if (!seconds) return '00:00';
  if (typeof seconds === 'string' && seconds.includes(':')) return seconds;
  const secs = parseInt(seconds);
  if (isNaN(secs)) return '00:00';
  const mins = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${mins}:${s.toString().padStart(2, '0')}`;
}

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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      clearTimeout(id);

      if (response.ok) {
        const data = await response.json();
        if (data?.status !== true && data?.status !== 'true' && !data?.result) continue;
        
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
      console.log(`[YTMP4] Saltando ${api.name}...`);
    } finally {
      clearTimeout(id);
    }
  }
  return { success: false };
}

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('¿Qué video quieres descargar? Ingresa el nombre o URL.');

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

    const apiResult = await getVideoFromApis(url);

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*Lo siento:* No se pudo obtener un enlace de video funcional.`);
    }

    const { title, url: videoUrl } = apiResult;
    const finalDuration = apiResult.duration !== '00:00' ? apiResult.duration : (searchData.timestamp || '00:00');
    const finalThumb = apiResult.thumbnail || searchData.thumbnail || null;
    const channel = searchData?.author?.name || 'YouTube';
    
    // DESCARGA MEJORADA CON HEADERS
    const videoResponse = await fetch(videoUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.youtube.com/'
        }
    });

    if (!videoResponse.ok) throw new Error('El servidor de archivos no respondió.');

    const arrayBuffer = await videoResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    
    // Verificación básica de integridad (evita enviar archivos corruptos de 0-1kb)
    if (buffer.length < 50000) throw new Error('El video recibido está incompleto o es inválido.');
    if (buffer.length > MAX_SIZE_BYTES) throw new Error(`El video es muy pesado (${sizeMB}MB).`);

    const caption = `───「 **𝖸𝗈𝗎𝖳𝗎𝖻𝖾 𝖵𝗂𝖽𝖾𝗈** 」───\n\n` +
                    `◈ *${title}*\n\n` +
                    `↳ ✨ **𝖣𝗎𝗋𝖺𝖼𝗂𝗈́𝗇:** ${finalDuration}\n` +
                    `↳ 👤 **𝖢𝖺𝗇𝖺𝗅:** ${channel}\n` +
                    `↳ 💾 **𝖳𝖺𝗆𝖺𝗇̃𝗈:** ${sizeMB}MB\n\n` +
                    `_⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡𝗈𝗍 𝖤𝖽𝗂𝗍𝗂𝗈𝗇_`;

    if (finalThumb) {
      await conn.sendMessage(m.chat, { image: { url: finalThumb }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    // Enviar el video como stream de buffer
    await conn.sendMessage(m.chat, {
      video: buffer,
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    console.error(error);
    await m.react('✖️');
    m.reply(`⚠️ **Aviso:** ${error.message}`);
  }
};

handler.help = ['playvideo <nombre|URL>'];
handler.command = ['playvideo', 'ytmp4', 'video'];
handler.tags = ['descargas'];

export default handler;
