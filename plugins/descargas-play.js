import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// Configuración de límites
const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const API_TIMEOUT = 10000; // 10 segundos por API antes de saltar a la siguiente

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

const APIS = [
  { 
    name: 'Nexevo', 
    url: `https://nexevo.onrender.com/download/y?url=`,
    getAudioUrl: (data) => data?.result?.url || data?.result?.download,
    getTitle: (data) => data?.result?.title,
    getThumb: (data) => data?.result?.thumb || data?.result?.thumbnail,
    getDuration: (data) => data?.result?.duration
  },
  { 
    name: 'Sylphy-API', 
    url: `https://sylphy.xyz/download/v2/ytmp3?url=`,
    params: '&api_key=Stellar',
    getAudioUrl: (data) => data?.result?.dl_url,
    getTitle: (data) => data?.result?.title,
    getThumb: (data) => data?.result?.thumbnail, 
    getDuration: (data) => data?.result?.duration
  },
  { 
    name: 'Adonix', 
    url: `https://api-adonix.ultraplus.click/download/ytaudio?apikey=AdonixKey2lph3k2117&url=`,
    getAudioUrl: (data) => data?.data?.url,
    getTitle: (data) => data?.data?.title,
    getThumb: (data) => data?.data?.thumbnail,
    getDuration: (data) => data?.data?.duration
  },
  { 
    name: 'FAA-ytplay',           
    url: `https://api-faa.my.id/faa/ytplay?query=`,
    getAudioUrl: (data) => data?.result?.mp3,
    getTitle: (data) => data?.result?.title,
    getThumb: (data) => data?.result?.thumbnail || data?.result?.thumb,
    getDuration: (data) => data?.result?.duration
  },
  { 
    name: 'Stellar-v2-Yuki', 
    url: `https://api.stellarwa.xyz/dl/youtubeplay?query=`,
    params: '&key=YukiWaBot',
    getAudioUrl: (data) => data?.data?.download,
    getTitle: (data) => data?.data?.title,
    getThumb: (data) => data?.data?.thumbnail,
    getDuration: (data) => data?.data?.duration || data?.data?.timestamp
  }
];

async function getAudioFromApis(url) {
  for (const api of APIS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      console.log(`[DEBUG] Intentando con API: ${api.name}...`);
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
        
        // Verificación de datos
        if (data?.status !== true && data?.status !== 'true' && !data?.result) {
          continue;
        }
        
        const audioUrl = api.getAudioUrl(data);
        if (audioUrl) {
          console.log(`✅ [SUCCESS] ${api.name} respondió correctamente.`);
          return {
            success: true,
            apiName: api.name,
            title: api.getTitle(data) || 'Audio de YouTube',
            thumbnail: api.getThumb(data),
            url: audioUrl,
            duration: formatDuration(api.getDuration(data))
          };
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log(`⏳ [TIMEOUT] ${api.name} tardó más de 10s. Pasando a la siguiente...`);
      } else {
        console.log(`❌ [ERROR] ${api.name}: ${e.message}`);
      }
      continue;
    } finally {
      clearTimeout(id);
    }
  }
  return { success: false };
}

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

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

    if (!url) return m.reply('No se encontraron resultados');

    await m.react('🕒');

    // Lógica de rotación de APIs con timeout de 10 segundos
    let apiResult = await getAudioFromApis(url);

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el audio. Las APIs no responden o tardan demasiado.`);
    }

    const { title, thumbnail, url: audioUrl, apiName } = apiResult;
    const finalThumbnail = thumbnail || searchData?.thumbnail || searchData?.image;
    const finalDuration = apiResult.duration === 'Desconocido' && searchData 
      ? searchData.timestamp 
      : apiResult.duration;
    
    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);
    
    const audioResponse = await fetch(audioUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!audioResponse.ok) throw new Error('Error al descargar el archivo de la API.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`El archivo es demasiado grande para ser enviado.`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const stats = fs.statSync(dest);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

    const caption = `🎵 *${title}*\n⏱️ ${finalDuration}\n💾 ${sizeMB}MB\n🚀 API: ${apiName}\n\n*Pantheon Bot*`;

    if (finalThumbnail) {
      await conn.sendMessage(m.chat, { image: { url: finalThumbnail }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
    }, { quoted: m });

    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await m.react('✅');

  } catch (error) {
    await m.react('✖️');
    console.error(`[HANDLER ERROR]`, error);
    m.reply(`⚠️ *Error:* ${error.message}`);
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];

export default handler;
