import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return conn.reply(m.chat, '*[ 🔗 ] Ingresa el link del video de Facebook.*\n\n*[ 💡 ] Ejemplo:* .fb https://www.facebook.com/share/v/17G62zi96v/', m);
  }

  // Validar que sea un enlace relacionado con Facebook
  if (!args[0].includes('facebook.com') && !args[0].includes('fb.watch') && !args[0].includes('fb.me')) {
    return conn.reply(m.chat, '*[ ❌ ] Por favor, ingresa un enlace válido de Facebook.*', m);
  }

  await m.react('🕒');

  let targetUrl = args[0];

  try {
    // Si es un enlace de tipo share, resolvemos la redirección para obtener la URL completa real
    if (targetUrl.includes('/share/')) {
      let response = await fetch(targetUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      targetUrl = response.url; // URL final después de que Facebook redirige
    }

    // Consultamos la API con la URL ya expandida/limpia
    let api = await fetch(`https://api.delirius.online/download/facebook?url=${encodeURIComponent(targetUrl)}`);
    let json = await api.json();

    if (!json.status || !json.list || json.list.length === 0) {
      await m.react('❌');
      return conn.reply(m.chat, '*[ ⚠️ ] No se encontraron resultados o el video es privado.*', m);
    }

    // Buscamos la calidad HD o la primera disponible
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
    return conn.reply(m.chat, '*[ ❌ ] Ocurrió un error al procesar la solicitud o el enlace es inválido.*', m);
  }
};

handler.help = ['facebook'];
handler.tags = ['descargas'];
handler.command = /^(fb|facebook|fbdl)$/i;

export default handler;
