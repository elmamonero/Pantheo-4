import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// Aumentamos el límite a 250MB para permitir canciones muy largas
const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

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

/**
 * Esta función representa el "scrapper directo".
 * Tú tienes que poner dentro la lógica que:
 *  - Recibe la URL de YouTube (o el ID)
 *  - Saca el enlace final mp3 (dl) de SaveTube
 * 
 * Aquí lo dejo como si ya tuvieras el enlace `dl` listo.
 */
async function scrapSaveTubeDirect(videoInfo) {
  // videoInfo puede ser:
  // - { url: 'https://www.youtube.com/watch?v=...' , title, thumbnail, duration }
  // - o el propio args[0] si ya es un enlace de SaveTube

  // Si ya te pasan un enlace directo de SaveTube en el comando:
  if (typeof videoInfo === 'string' && videoInfo.includes('savetube')) {
    return {
      success: true,
      title: 'Audio de YouTube',
      thumbnail: null,
      url: videoInfo,
      duration: 'Desconocido'
    };
  }

  // Si viene un objeto con info de YouTube (de yts)
  const { url, title, thumbnail, timestamp } = videoInfo;

  // AQUÍ VA TU SCRAPPER REAL:
  // ----------------------------------------------------------------
  // EJEMPLO: si tú ya tienes alguna forma de obtener el mp3,
  // reemplaza esta parte y regresa directamente el dl correcto.
  //
  // De momento, dejo un placeholder que simula tener el dl:
  //
  // const dl = 'https://cdn400.savetube.vip/media/3rg0p23brQ0/w-sound-23-5-estrellas-myke-towers-westcol-ovy-on-the-drums-128-ytshorts.savetube.me.mp3';
  //
  // return {
  //   success: true,
  //   title,
  //   thumbnail,
  //   url: dl,
  //   duration: timestamp || 'Desconocido'
  // };
  // ----------------------------------------------------------------

  throw new Error('Aún no se ha implementado la lógica interna del scrapper de SaveTube.');
}

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube o un enlace de SaveTube');

  let searchData = null;
  let input = args.join(' ');

  const isSaveTube = /(savetube.vip|savetube.me)/.test(input);
  const isYoutube = /(youtube.com|youtu.be)/.test(input);

  // 1) Si ya es un enlace directo de SaveTube, no hay que buscar nada
  if (isSaveTube) {
    try {
      await m.react('🕒');

      const apiResult = await scrapSaveTubeDirect(input);

      if (!apiResult.success || !apiResult.url) {
        await m.react('✖️');
        return m.reply(`*✖️ Error:* No se pudo obtener el audio desde el scrapper.`);
      }

      const { title, thumbnail, url: audioUrl, duration } = apiResult;
      const finalDuration = formatDuration(duration);
      const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);

      console.log(`[INFO] Descargando audio (SaveTube directo): ${audioUrl}`);
      const audioResponse = await fetch(audioUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://youtube.com/' 
        }
      });

      if (!audioResponse.ok) throw new Error('Error al descargar el archivo.');

      const arrayBuffer = await audioResponse.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
        throw new Error(`Archivo demasiado grande: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB.`);
      }

      fs.writeFileSync(dest, Buffer.from(arrayBuffer));
      const stats = fs.statSync(dest);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

      const caption = `🎵 *${title || 'Audio de YouTube'}*
⏱️ ${finalDuration}
💾 ${sizeMB}MB

*Pantheon Bot*`;

      if (thumbnail) {
        await conn.sendMessage(
          m.chat, 
          { image: { url: thumbnail }, caption }, 
          { quoted: m }
        );
      } else {
        await m.reply(caption);
      }

      await conn.sendMessage(
        m.chat,
        {
          audio: fs.readFileSync(dest),
          mimetype: 'audio/mpeg',
          fileName: `${title || 'audio'}.mp3`,
        },
        { quoted: m }
      );

      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      await m.react('✅');

    } catch (error) {
      await m.react('✖️');
      console.error(`[HANDLER ERROR]`, error);
      m.reply(`⚠️ *Error:* ${error.message}`);
    }

    return;
  }

  // 2) Si es nombre o enlace de YouTube, usamos yts para conseguir datos
  let url = input;
  if (!isYoutube) {
    const searchResults = await yts(input);
    if (!searchResults.videos.length) {
      return m.reply('No se encontraron resultados');
    }
    searchData = searchResults.videos[0];
    url = searchData.url;
  } else {
    const searchResults = await yts(url);
    if (searchResults.videos.length) {
      searchData = searchResults.videos[0];
    }
  }

  if (!url) return m.reply('No se pudo resolver un enlace válido');

  try {
    await m.react('🕒');

    // Aquí llamamos a TU scrapper directo pasando la info del video
    const apiResult = await scrapSaveTubeDirect({
      url,
      title: searchData?.title,
      thumbnail: searchData?.thumbnail || searchData?.image,
      timestamp: searchData?.timestamp
    });

    if (!apiResult.success || !apiResult.url) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el audio desde el scrapper.`);
    }

    const { title, thumbnail, url: audioUrl, duration } = apiResult;
    const finalThumbnail = thumbnail || searchData?.thumbnail || searchData?.image;
    const finalDuration = formatDuration(
      duration === 'Desconocido' && searchData?.timestamp
        ? searchData.timestamp
        : duration
    );

    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);

    console.log(`[INFO] Descargando audio (SaveTube scrapper): ${audioUrl}`);
    const audioResponse = await fetch(audioUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://youtube.com/' 
      }
    });

    if (!audioResponse.ok) throw new Error('Error al descargar el archivo.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo demasiado grande: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB.`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const stats = fs.statSync(dest);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

    const caption = `🎵 *${title || (searchData?.title ?? 'Audio de YouTube')}*
⏱️ ${finalDuration}
💾 ${sizeMB}MB

*Pantheon Bot*`;

    if (finalThumbnail) {
      await conn.sendMessage(
        m.chat, 
        { image: { url: finalThumbnail }, caption }, 
        { quoted: m }
      );
    } else {
      await m.reply(caption);
    }

    await conn.sendMessage(
      m.chat,
      {
        audio: fs.readFileSync(dest),
        mimetype: 'audio/mpeg',
        fileName: `${title || (searchData?.title ?? 'audio')}.mp3`,
      },
      { quoted: m }
    );

    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await m.react('✅');

  } catch (error) {
    await m.react('✖️');
    console.error(`[HANDLER ERROR]`, error);
    m.reply(`⚠️ *Error:* ${error.message}`);
  }
};

handler.help = ['pruebaplay <nombre|URL|SaveTube>'];
handler.command = ['pruebaplay'];
handler.tags = ['descargas'];

export default handler;
