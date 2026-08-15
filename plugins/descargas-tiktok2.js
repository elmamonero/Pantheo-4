import fetch from 'node-fetch'

var handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`*[ 🔗 ] Ingrese un link de TikTok*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} https://vt.tiktok.com/ZSVNmoTLc/`);
    }

    try {
        await conn.reply(m.chat, "*[ ⏳ ] Aguarde un momento, estoy enviando su video...*", m);

        // 1. Llamamos a la función
        const res = await tiktokdl(args[0]);

        // 2. Debug: Si res está vacío o no tiene la estructura
        if (!res || !res.resultado) {
            console.log("Respuesta de la API:", res); // Esto saldrá en tu consola de Cafirexos
            return m.reply("*[ ❌ ] La API no respondió correctamente. Revisa la consola.*");
        }

        const data = res.resultado;
        const videoURL = data.datos || data.alternativas?.hd || data.alternativas?.sd;
        const audioURL = data.music_info?.url;

        const infonya_gan = `*📖 Descrip꯭ción:*
> ${data.título || 'Sin descripción'}*
╭── ︿︿︿︿︿ *⭒   ⭒   ⭒   ⭒   ⭒*
┊ ✧ *Likes:* ${data.estadísticas?.['Me gusta'] || 0}
┊ ✧ *Comentarios:* ${data.estadísticas?.comentario || 0}
┊ ✧ *Compartidas:* ${data.estadísticas?.compartir || 0}
┊ ✧ *Vistas:* ${data.estadísticas?.vistas || 0}
┊ ✧ *Descargas:* ${data.estadísticas?.descargar || 0}
╰─── ︶︶︶︶ ✰⃕  ⌇ *⭒ ⭒ ⭒*   ˚̩̥̩̥*̩̩͙✩
*👤 Usu꯭ario:*
·˚₊· ͟͟͞͞꒰➳ ${data.autor?.apodo || "No info"}
(https://www.tiktok.com/@${data.autor?.['nombre de usuario'] || ''})
*🎧 Son꯭ido:*
${data.music_info?.título || 'Desconocido'}`;

        if (videoURL) {
            await conn.sendFile(m.chat, videoURL, "tiktok.mp4", "*\`DESCARGAS - TIKTOK V2\`*" + `\n\n${infonya_gan}`, m);
            
            if (audioURL) {
                setTimeout(async () => {
                     await conn.sendFile(m.chat, audioURL, "lagutt.mp3", "", m);
                }, 1500);
            }
        } else {
            return m.reply("*[ ❌ ] No se pudo obtener el video de la API.*");
        }
    } catch (e) {
        console.error(e);
        m.reply(`*[ ❌ ] Error fatal:* ${e.message}`);
    }
};

handler.help = ['tiktok2']
handler.tags = ['descargas']
handler.command = /^(tiktok2|tt2|tt2dl)$/i;

export default handler

async function tiktokdl(url) {
    try {
        // Encodeamos la URL para evitar errores con caracteres especiales
        let api = `https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(url)}`
        let response = await fetch(api)
        return await response.json()
    } catch (e) {
        console.error("Fallo en fetch:", e);
        return null;
    }
}
