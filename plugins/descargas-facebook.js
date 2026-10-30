import { igdl } from 'ruhend-scraper';

const handler = async (m, { text, conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return conn.reply(m.chat, '*[ 🔗 ] Ingresa el link del video de Facebook.*\n\n*[ 💡 ] Ejemplo:* .fb https://www.facebook.com/reel/858448809516815/?mibextid=9drbnH&s=yWDuG2&fs=e', fkontak, m);
  }

  // 🚀 Filtro rápido: Si envías un link de foto o publicación estática (/share/p/ o /posts/), avisa al instante
  if (args[0].includes('/share/p/') || args[0].includes('/posts/')) {
    await m.react('⚠️');
    return conn.reply(m.chat, '*[ ⚠️ ] El enlace corresponde a una fotografía o publicación estática. Este comando es exclusivamente para descargar videos, reels y en vivos de Facebook.*', fkontak, m);
  }

  await m.react('🕒');
  let res;
  try {
    res = await igdl(args[0]);
  } catch (error) {
    return conn.reply(m.chat, '*[ ❌ ] Error al obtener el video, verifique que el enlace sea correcto*', m);
  }

  let result = res.data;
  if (!result || result.length === 0) {
    return conn.reply(m.chat, '*[ ⚠️ ] No se encontraron resultados.*', m);
  }

  let data;
  try {
    data = result.find(i => i.resolution === "720p (HD)") || result.find(i => i.resolution === "360p (SD)");
  } catch (error) {
    return conn.reply(m.chat, '*[ ❌ ] Error al enviar el video de Facebook*', m);
  }

  if (!data) {
    return conn.reply(m.chat, '*[ ⚠️ ] No se encontró una resolución adecuada.*', m);
  }

  await m.react('✅');
  let video = data.url;
  
  try {
    await conn.sendMessage(m.chat, { video: { url: video }, caption: '> © ᥲ𝗊ᥙі 𝗍іᥱᥒᥱ sᥙ 𝎷іძᥱ᥆ ძᥱ 𝖿ᥲᥴᥱᑲ᥆᥆k', fileName: 'fb.mp4', mimetype: 'video/mp4' }, { quoted: fkontak });
  } catch (error) {
    await m.react('❌');
    return conn.reply(m.chat, '*[ ⚠️ ] La URL del vídeo está corrompida por lo cual no fue posible enviar el vídeo.*', m);
  }
};

handler.help = ['facebook'];
handler.tags = ['descargas'];
handler.command = /^(fb|facebook|fbdl)$/i;

export default handler;
