import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// Configuración de límites
const MAX_SIZE_MB = 150;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('¿Qué video buscamos hoy? Ingresa el nombre o el enlace.');

  let url = args[0];
  let searchData = null;
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  try {
    // Búsqueda en YouTube para obtener metadatos extra si es necesario
    const query = isUrl ? url : args.join(' ');
    const searchResults = await yts(query);
    if (searchResults.videos.length) {
      searchData = searchResults.videos[0];
      if (!isUrl) url = searchData.url;
    }

    if (!url) return m.reply('No encontré resultados para esa búsqueda.');

    await m.react('🎬');

    // API Nightlight adaptada a la estructura correcta
    const apiUrl = `https://api.nightlight.qzz.io/dl/ytmp4?url=${encodeURIComponent(url)}&quality=auto&key=api-GRZpK`;
    
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    const result = await apiResponse.json();

    // Verificación basada en la estructura: { status: true, data: { dl: "..." } }
    if (!result.status || !result.data?.dl) {
      await m.react('❌');
      return m.reply('*Error:* La API no devolvió un enlace de descarga válido.');
    }

    const videoUrl = result.data.dl;
    const title = result.data.title || searchData?.title || 'Video de YouTube';
    const finalThumb = searchData?.thumbnail || searchData?.image || null;
    const duration = searchData?.timestamp || '00:00';
    const channel = searchData?.author?.name || 'YouTube';

    // Descarga del archivo con headers para evitar archivos corruptos
    const dest = path.join('/tmp', `${Date.now()}_video.mp4`);
    const fileResponse = await fetch(videoUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.youtube.com/'
      }
    });

    if (!fileResponse.ok) throw new Error('Fallo al conectar con el servidor de descarga.');

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Si el buffer es muy pequeño, el video no es válido
    if (buffer.length < 50000) throw new Error('El archivo descargado está dañado o incompleto.');
    if (buffer.length > MAX_SIZE_BYTES) throw new Error(`El video excede el límite de ${MAX_SIZE_MB}MB.`);

    fs.writeFileSync(dest, buffer);
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);

    // Formato visual único Pantheon
    const caption = `───「 **𝖸𝗈𝗎𝖳𝗎𝖻𝖾 𝖵𝗂𝖽𝖾𝗈** 」───\n\n` +
                    `◈ *${title}*\n\n` +
                    `↳ ✨ **𝖣𝗎𝗋𝖺𝖼𝗂𝗈́𝗇:** ${duration}\n` +
                    `↳ 👤 **𝖢𝖺𝗇𝖺𝗅:** ${channel}\n` +
                    `↳ 💾 **𝖳𝖺𝗆𝖺𝗇̃𝗈:** ${sizeMB}MB\n\n` +
                    `_⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡𝗈𝗍 𝖤𝖽𝗂𝗍𝗂𝗈𝗇_`;

    // Enviar mensaje con miniatura
    if (finalThumb) {
      await conn.sendMessage(m.chat, { image: { url: finalThumb }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    // Enviar el video final
    await conn.sendMessage(m.chat, {
      video: fs.readFileSync(dest),
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
    }, { quoted: m });

    // Limpieza de memoria
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
