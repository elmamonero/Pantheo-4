import fetch from 'node-fetch'

var handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        throw m.reply(`*[ 🔗 ] Ingrese un link de TikTok*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} https://vm.tiktok.com/ZMkcuXwJv/`);
    }

    try {
        await conn.reply(m.chat, "*[ ⏳ ] Aguarde un momento, estoy enviando su video...*", m);

        // Llamamos a la nueva API
        const res = await tiktokdl(args[0]);

        // Validamos que la API responda
        if (!res || !res.resultado) {
            throw m.reply("Error: La API no devolvió información.");
        }

        const data = res.resultado;
        const videoURL = data.datos || data.alternativas.hd; // URL del video
        const audioURL = data.music_info.url; // URL del audio

        const infonya_gan = `*📖 Descrip꯭ción:*
> ${data.título || 'Sin descripción'}*
╭── ︿︿︿︿︿ *⭒   ⭒   ⭒   ⭒   ⭒*
┊ ✧ *Likes:* ${data.estadísticas['Me gusta']}
┊ ✧ *Comentarios:* ${data.estadísticas.comentario}
┊ ✧ *Compartidas:* ${data.estadísticas.compartir}
┊ ✧ *Vistas:* ${data.estadísticas.vistas}
┊ ✧ *Descargas:* ${data.estadísticas.descargar}
╰─── ︶︶︶︶ ✰⃕  ⌇ *⭒ ⭒ ⭒*   ˚̩̥̩̥*̩̩͙✩
*👤 Usu꯭ario:*
·˚₊· ͟͟͞͞꒰➳ ${data.autor.apodo || "No info"}
(https://www.tiktok.com/@${data.autor['nombre de usuario']})
*🎧 Son꯭ido:*
${data.music_info.título}`;

        if (videoURL) {
            // Enviamos el video con tu estructura original
            await conn.sendFile(m.chat, videoURL, "tiktok.mp4", "*\`DESCARGAS - TIKTOK V2\`*" + `\n\n${infonya_gan}`, m);
            
            // Enviamos el audio con el retardo
            setTimeout(async () => {
                 await conn.sendFile(m.chat, audioURL, "lagutt.mp3", "", m);
            }, 1500);
        } else {
            throw m.reply("*No se pudo descargar el video.*");
        }
    } catch (error) {
        conn.reply(m.chat, `Error: ${error}`, m);
    }
};

handler.help = ['tiktok2']
handler.tags = ['descargas']
handler.command = /^(tiktok2|tt2|tt2dl)$/i;

export default handler

// Función actualizada para la API nueva
async function tiktokdl(url) {
    let api = `https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(url)}`
    let response = await fetch(api)
    let json = await response.json()
    return json
}
