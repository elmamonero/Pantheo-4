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
    getVideoUrl: (data) => data?.result?.download_url || data?.download, 
    getTitle: (data) => data?.result?.title || data?.title,
    getThumb: (data) => data?.result?.thumbnail || data?.thumbnail,
    getDuration: (data) => data?.result?.duration || data?.duration
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
        
        // Verificamos si la respuesta es exitosa (algunas APIs usan status: 200 o true)
        if (data?.status !== true && data?.status !== 'true' && data?.status !== 200) {
          console.log(`❌ [YTMP4] ${api.name} status inválido`);
          continue;
        }
        
        const videoUrl = api.getVideoUrl(data);
        
        if (videoUrl) {
          console.log(`✅ [YTMP4] ${api.name} exitosa: ${api.getTitle(data)}`);
          const rawDuration = api.getDuration(data);
          return {
            success: true,
            api: api.name,
            title: api.getTitle(data) || 'Video de YouTube',
            thumbnail: api.getThumb(data),
            url: videoUrl,
            duration: formatDuration(rawDuration)
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
  console.log(`🎥 [YTMP4] Comando recibido: ${args.join(' ')}`);
  
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  if (!isUrl) {
    console.log(`🔍 [YTMP4] Buscando: ${args.join(' ')}`);
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) {
      console.log(`❌ [YTMP4] Sin resultados búsqueda`);
      return m.reply('No se encontraron resultados para tu búsqueda');
    }
    url = searchResults.videos[0].url;
    console.log(`✅ [YTMP4] URL encontrada: ${url}`);
  }

  try {
    await m.react('🕒');
    console.log(`⬇️ [YTMP4] Iniciando descarga...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s para APIs externas

    const apiResult = await getVideoFromApis(url, controller);
    clearTimeout(timeoutId);

    if (!apiResult.success) {
      console.log(`❌ [YTMP4] Todas las APIs fallaron`);
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el video con la API actual.\n\n*Pantheon Bot*`);
    }

    const { title, thumbnail, url: videoUrl, duration } = apiResult;
    const fileName = `${title.replace(/[^\w\s-]/g, '')}.mp4`.replace(/\s+/g, '_').substring(0, 50);
    
    console.log(`📹 [YTMP4] Procesando: ${title} (${duration})`);

    // Descarga y validación de tamaño
    const videoResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(60000)
    });

    if (!videoResponse.ok) throw new Error(`Error descarga: ${videoResponse.status}`);

    const arrayBuffer = await videoResponse.arrayBuffer();
    const sizeMB = (arrayBuffer.byteLength/1024/1024).toFixed(1);
    
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo muy pesado (${sizeMB}MB). Máximo ${MAX_SIZE_MB}MB`);
    }

    const buffer = Buffer.from(arrayBuffer);
    
    // Envío de información (Thumbnail + Texto)
    if (thumbnail) {
      try {
        const thumbResponse = await fetch(thumbnail);
        const thumbBuffer = await thumbResponse.arrayBuffer();
        await conn.sendMessage(m.chat, {
          image: Buffer.from(thumbBuffer),
          caption: `🎥 *${title}*\n⏱️ ${duration}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`,
        }, { quoted: m });
      } catch {
        await conn.sendMessage(m.chat, { text: `🎥 *${title}*\n⏱️ ${duration}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*` }, { quoted: m });
      }
    }

    console.log(`📤 [YTMP4] Enviando archivo de video...`);
    await conn.sendMessage(m.chat, {
      video: buffer,
      mimetype: 'video/mp4',
      fileName: `${fileName}.mp4`,
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    console.log(`💥 [YTMP4] Error final: ${error.message}`);
    await m.react('✖️');
    
    if (error.name === 'AbortError') return m.reply(`⏰ *Timeout* - La conexión tardó demasiado.\n\n*Pantheon Bot*`);
    if (error.message.includes('muy pesado')) return m.reply(`📏 ${error.message}\n\n*Pantheon Bot*`);
    
    m.reply('⚠️ Ocurrió un error al procesar el video. Intenta de nuevo más tarde.\n\n*Pantheon Bot*');
  }
};

handler.help = ['ytmp4 <nombre|URL>'];
handler.command = ['ytmp4', 'video'];
handler.tags = ['descargas'];

export default handler;
