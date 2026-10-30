import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return conn.reply(m.chat, '*[ 🔗 ] Ingresa el link de Facebook (Video, Reel o Foto).*\n\n*[ 💡 ] Ejemplo:* .fb https://www.facebook.com/share/p/1CVkcpykFJ/', m);
  }

  if (!args[0].includes('facebook.com') && !args[0].includes('fb.watch') && !args[0].includes('fb.me')) {
    return conn.reply(m.chat, '*[ ❌ ] Por favor, ingresa un enlace válido de Facebook.*', m);
  }

  await m.react('🕒');

  let targetUrl = args[0];

  try {
    // Resolver el enlace corto si es de tipo /share/
    if (targetUrl.includes('/share/')) {
      let response = await fetch(targetUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      targetUrl = response.url;
    }

    // PASO 1: Intentar procesarlo como video
    let apiVideo = await fetch(`https://api.delirius.online/download/facebook?url=${encodeURIComponent(targetUrl)}`);
    let jsonVideo = await apiVideo.json();

    if (jsonVideo.status && jsonVideo.list && jsonVideo.list.length > 0) {
      let videoData = jsonVideo.list.find(i => i.quality && i.quality.includes('HD')) || jsonVideo.list[0];
      let videoUrl = videoData ? videoData.url : null;

      if (videoUrl) {
        await m.react('✅');
        return await conn.sendMessage(m.chat, { 
          video: { url: videoUrl }, 
          caption: '> © ᥲ𝗊ᥙі 𝗍іᥱᥒᥱ sᥙ 𝎷іძᥱ᥆ ძᥱ 𝖿ᥲᥴᥱᑲ᥆᥆k', 
          fileName: 'fb.mp4', 
          mimetype: 'video/mp4' 
        }, { quoted: m });
      }
    }

    // PASO 2: Si no era video, intentamos extraer la foto/imagen de la publicación
    // Usamos el endpoint alternativo o la miniatura/imagen que detecte la plataforma
    let apiPhoto = await fetch(`https://api.delirius.online/tools/fbdl?url=${encodeURIComponent(targetUrl)}`).catch(() => null);
    let jsonPhoto = apiPhoto ? await apiPhoto.json().catch(() => null) : null;

    // Si la estructura trae imagen directa (thumb o imagen de post)
    let imageUrl = jsonVideo.thumb || (jsonPhoto && (jsonPhoto.image || jsonPhoto.url));

    if (imageUrl) {
      await m.react('✅');
      return await conn.sendMessage(m.chat, { 
        image: { url: imageUrl }, 
        caption: '> © ᥲ𝗊ᥙі 𝗍іᥱᥒᥱ sᥙ f᥆𝗍᥆ ძᥱ fᥲᥴᥱᑲ᥆᥆k' 
      }, { quoted: m });
    }

    // Si de plano no se pudo con ninguno de los dos métodos
    await m.react('❌');
    return conn.reply(m.chat, '*[ ⚠️ ] No se pudo extraer contenido multimedia de este enlace. Asegúrate de que sea público.*', m);

  } catch (error) {
    await m.react('❌');
    return conn.reply(m.chat, '*[ ❌ ] Ocurrió un error al procesar la solicitud.*', m);
  }
};

handler.help = ['facebook'];
handler.tags = ['descargas'];
handler.command = /^(fb|facebook|fbdl)$/i;

export default handler;
