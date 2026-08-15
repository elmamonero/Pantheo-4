import fetch from 'node-fetch'

var handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`*[ 🔗 ] Ingrese un link de TikTok*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} https://vt.tiktok.com/ZSVNmoTLc/`);
    }

    try {
        await conn.reply(m.chat, "*[ ⏳ ] Aguarde un momento, estoy enviando su video...*", m);

        const res = await tiktokdl(args[0]);

        // Validamos la estructura exacta que sale en tu consola
        if (!res || !res.result) {
            return m.reply("*[ ❌ ] Error: La API no devolvió el resultado esperado.*");
        }

        const data = res.result;
        const videoURL = data.data || data.alternativas?.hd; // URL del video
        const audioURL = data.music_info?.url;

        const infonya_gan = `*📖 Descrip꯭ción:*
> ${data.title || 'Sin descripción'}*
╭── ︿︿︿︿︿ *⭒   ⭒   ⭒   ⭒   ⭒*
┊ ✧ *Likes:* ${data.stats?.likes || 0}
┊ ✧ *Comentarios:* ${data.stats?.comment || 0}
┊ ✧ *Compartidas:* ${data.stats?.share || 0}
┊ ✧ *Vistas:* ${data.stats?.views || 0}
┊ ✧ *Descargas:* ${data.stats?.download || 0}
╰─── ︶︶︶︶ ✰⃕  ⌇ *⭒ ⭒ ⭒*   ˚̩̥̩̥*̩̩͙✩
*👤 Usu꯭ario:*
·˚₊· ͟͟͞͞꒰➳ ${data.author?.nickname || "No info"}
(@${data.author?.username || ''})
*🎧 Son꯭ido:*
${data.music_info?.title || 'Original'}`;

        if (videoURL) {
            await conn.sendFile(m.chat, videoURL, "tiktok.mp4", "*\`DESCARGAS - TIKTOK V2\`*" + `\n\n${infonya_gan}`, m);
            
            if (audioURL) {
                setTimeout(async () => {
                     await conn.sendFile(m.chat, audioURL, "lagutt.mp3", "", m);
                }, 1500);
            }
        } else {
            return m.reply("*[ ❌ ] No se pudo obtener el video.*");
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
        let api = `https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(url)}`
        let response = await fetch(api)
        return await response.json()
    } catch (e) {
        return null;
    }
}
