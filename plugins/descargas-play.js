import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// CONFIGURACIÓN: Espera rápida de 3.5 segundos por API antes de pasar a la otra
const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const API_TIMEOUT = 10000; 

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
    name: 'Delirius-Download', 
    url: `https://api.delirius.store/download/ytmp3?url=`,
    // ARREGLADO: Ahora extrae correctamente data?.data?.download que es donde viene tu link de savetube
    getAudioUrl: (data) => data?.data?.download || data?.result?.download || data?.data?.url,
    getTitle: (data) => data?.data?.title || data?.result?.title,
    getThumb: (data) => data?.data?.image || data?.data?.thumbnail || data?.result?.thumb,
    getDuration: (data) => data?.data?.duration || data?.result?.duration
  },
  { 
    name: 'Stellar-v2-Yuki', 
    url: `https://api.stellarwa.xyz/dl/youtubeplay?query=`,
    params: 'stellarwa-2026.xyz@maia@20-12-2025',
    getAudioUrl: (data) => data?.result?.dl || data?.data?.download,
    getTitle: (data) => data?.result?.title || data?.data?.title,
    getThumb: (data) => data?.result?.thumbnail || data?.data?.thumbnail,
    getDuration: (data) => data?.result?.duration || data?.data?.duration
  },
  { 
    name: 'Yuki', 
    url: `https://api.yuki-wabot.my.id/dl/youtubeplay?query=`,
    params: 'YukiBot-MD',
    getAudioUrl: (data) => data?.result?.dl || data?.data?.download,
    getTitle: (data) => data?.result?.title || data?.data?.title,
    getThumb: (data) => data?.result?.thumbnail || data?.data?.thumbnail,
    getDuration: (data) => data?.result?.duration || data?.data?.duration
  },
  { 
    name: 'FAA-ytplay',           
    url: `https://api-faa.my.id/faa/ytplay?query=`,
    getAudioUrl: (data) => data?.result?.mp3,
    getTitle: (data) => data?.result?.title,
    getThumb: (data) => data?.result?.thumbnail || data?.result?.thumb,
    getDuration: (data) => data?.result?.duration
  },
];

async function getAudioFromApis(url) {
  for (const api of APIS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), API_TIMEOUT);

    console.log(`\x1b[36m[YT-PLAY]\x1b[0m Intentando descargar con la API: ${api.name}...`);

    try {
      const encodedUrl = encodeURIComponent(url);
      
      const apiKeyParam = api.params ? `&key=${api.params}` : '';
      const apiUrl = `${api.url}${encodedUrl}${apiKeyParam}`;
      
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
        
        if (data?.status !== true && data?.status !== 'true' && !data?.result && !data?.data) {
          console.log(`\x1b[33m[⚠️ API ${api.name}]\x1b[0m Respuesta inválida o vacía. Probando siguiente...`);
          continue;
        }
        
        const audioUrl = api.getAudioUrl(data);
        if (audioUrl) {
          console.log(`\x1b[32m[✅ ÉXITO]\x1b[0m Audio obtenido con la API: ${api.name}`);
          return {
            success: true,
            apiName: api.name,
            title: api.getTitle(data),
            thumbnail: api.getThumb(data),
            url: audioUrl,
            duration: formatDuration(api.getDuration(data))
          };
        }
      } else {
        console.log(`\x1b[31m[❌ API ${api.name}]\x1b[0m Error HTTP ${response.status}. Saltando...`);
      }
    } catch (e) {
      console.log(`\x1b[31m[❌ API ${api.name}]\x1b[0m Falló por timeout o red.`);
      continue;
    } finally {
      clearTimeout(id);
    }
  }
  console.log(`\x1b[41m[🚫 ERROR TOTAL]\x1b[0m Ninguna API respondió.`);
  return { success: false };
}

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('¿Qué canción buscamos hoy? Ingresa el nombre o el enlace.');

  let url = args[0];
  let searchData = null;
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  try {
    const query = isUrl ? url : args.join(' ');
    const searchResults = await yts(query);
    if (searchResults.videos.length) {
      searchData = searchResults.videos[0];
      url = searchData.url; 
    }

    if (!url) return m.reply('No encontré resultados para esa búsqueda.');

    await m.react('🎧');

    let apiResult = await getAudioFromApis(url);

    if (!apiResult.success) {
      await m.react('❌');
      return m.reply(`*Lo siento:* Las fuentes de descarga están saturadas ahora mismo.`);
    }

    const title = apiResult.title || searchData?.title || 'Audio de YouTube';
    const thumbnail = apiResult.thumbnail || searchData?.thumbnail || searchData?.image;
    const duration = apiResult.duration === '00:00' && searchData ? searchData.timestamp : apiResult.duration;
    const channel = searchData?.author?.name || 'Canal de YouTube';
    const audioUrl = apiResult.url;
    
    // Formato visual de Pantheon
    const caption = `───「 *𝖸𝗈𝗎𝖳𝗎𝖻𝖾 𝖬𝗎𝗌𝗂𝖼* 」───\n\n` +
                    `◈ *${title}*\n\n` +
                    `↳ ✨ *𝖣𝗎𝗋𝖺𝖼𝗂𝗈́𝗇:* ${duration}\n` +
                    `↳ 👤 *𝖢𝖺𝗇𝖺𝗅:* ${channel}\n` +
                    `↳ 🔗 *𝖤𝗇𝗅𝖺𝖼𝖾:* ${url}\n\n` +
                    `⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡𝗈̣t`;

    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);
    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) throw new Error('Error de descarga.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) throw new Error(`El archivo es demasiado pesado.`);

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));

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

    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await m.react('✅');

  } catch (error) {
    await m.react('❌');
    m.reply(`⚠️ **Aviso:** ${error.message}`);
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];

export default handler;