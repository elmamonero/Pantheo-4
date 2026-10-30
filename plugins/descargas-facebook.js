import { facebookDl } from '../lib/scraper.js';

const handler = async (m, { text, conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return conn.reply(m.chat, '*[ 🔗 ] Ingresa el link del video de Facebook.*\n\n*[ 💡 ] Ejemplo:* .fb https://www.facebook.com/share/p/1CVkcpykFJ/', fkontak, m);
  }

  // Validar si el enlace es de Facebook
  if (!args[0].includes('facebook.com') && !args[0].includes('fb.watch')) {
    return conn.reply(m.chat, '*[ ❌ ] Por favor, ingresa un enlace válido de Facebook.*', m);
  }

  await m.react('🕒');
  let res;
  try {
    res = await facebookDl(args[0]);
  } catch (error) {
    await m.react('❌');
    return conn.reply(m.chat, '*[ ❌ ] Error al obtener el video, verifique que el enlace sea correcto*', m);
  }

  // Extraer la mejor calidad disponible del objeto que retorna tu función facebookDl
  let videoUrl = res['720p'] || res['360p'] || Object.values(res)[0];

  if (!videoUrl) {
    await m.react('⚠️');
    return conn.reply(m.chat, '*[ ⚠️ ] No se encontraron resultados o el video es privado.*', m);
  }

  await m.react('✅');
  
  try {
    await conn.sendMessage(m.chat, { 
      video: { url: videoUrl }, 
      caption: '> © ᥲ𝗊ᥙі 𝗍іᥱᥒᥱ sᥙ ᥎іძᥱ᥆ ძᥱ 𝖿ᥲᥴᥱᑲ᥆᥆k', 
      fileName: 'fb.mp4', 
      mimetype: 'video/mp4' 
    }, { quoted: fkontak });
  } catch (error) {
    await m.react('❌');
    return conn.reply(m.chat, '*[ ⚠️ ] La URL del vídeo está corrompida por lo cual no fue posible enviar el vídeo.*', m);
  }
};

handler.help = ['facebook'];
handler.tags = ['descargas'];
handler.command = /^(fb|facebook|fbdl)$/i;

export default handler;
