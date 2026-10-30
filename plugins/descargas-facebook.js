import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return conn.reply(m.chat, '*[ 🔗 ] Ingresa el link del video de Facebook.*\n\n*[ 💡 ] Ejemplo:* .fb https://www.facebook.com/share/v/17G62zi96v/', m);
  }

  // Validar que sea un enlace de Facebook
  if (!args[0].includes('facebook.com') && !args[0].includes('fb.watch')) {
    return conn.reply(m.chat, '*[ ❌ ] Por favor, ingresa un enlace válido de Facebook.*', m);
  }

  await m.react('🕒');

  try {
    let api = await fetch(`https://api.delirius.online/download/facebook?url=${encodeURIComponent(args[0])}`);
    let json = await api.json();

    if (!json.status || !json.list || json.list.length === 0) {
      await m.react('❌');
      return conn.reply(m.chat, '*[ ⚠️ ] No se encontraron resultados o el video es privado.*', m);
    }

    // Buscamos la mejor calidad (HD o la primera disponible en la lista)
    let videoData = json.list.find(i => i.quality && i.quality.includes('HD')) || json.list[0];
    let videoUrl = videoData ? videoData.url : null;

    if (!videoUrl) {
      await m.react('❌');
      return conn.reply(m.chat, '*[ ❌ ] No se pudo extraer el enlace de descarga del video.*', m);
    }

    await m.react('✅');

    await conn.sendMessage(m.chat, { 
      video: { url: videoUrl }, 
      caption: '> © ᥲ𝗊ᥙі 𝗍іᥱᥒᥱ sᥙ 𝎷іძᥱ᥆ ძᥱ 𝖿ᥲᥴᥱᑲ᥆᥆k', 
      fileName: 'fb.mp4', 
      mimetype: 'video/mp4' 
    }, { quoted: m });

  } catch (error) {
    await m.react('❌');
    return conn.reply(m.chat, '*[ ❌ ] Ocurrió un error al procesar la solicitud.*', m);
  }
};

handler.help = ['facebook'];
handler.tags = ['descargas'];
handler.command = /^(fb|facebook|fbdl)$/i;

export default handler;
