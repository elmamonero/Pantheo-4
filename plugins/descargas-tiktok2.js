import fetch from 'node-fetch'

var handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`*[ 🔗 ] Ingrese el enlace de TikTok*\n\n*Ejemplo:* ${usedPrefix + command} https://vt.tiktok.com/ZSVNmoTLc/`);
    }

    try {
        await conn.reply(m.chat, "*[ ⏳ ] Procesando información del video...*", m);

        const res = await tiktokdl(args[0]);

        if (!res || !res.result) {
            return m.reply("*[ ❌ ] La API no respondió correctamente.*");
        }

        const data = res.result;
        const videoURL = data.data || data.alternativas?.hd;
        const audioURL = data.music_info?.url;

        // Conversión de peso a Megabytes
        const sizeMb = data.size?.nowm ? (data.size.nowm / (1024 * 1024)).toFixed(2) : 'N/A';
        const sizeHdMb = data.size?.nowm_hd ? (data.size.nowm_hd / (1024 * 1024)).toFixed(2) : 'N/A';

        // Diseño con emojis por secciones
        const caption = `╭─────────────
│ 📱 *TIKTOK DOWNLOAD*
╰─────────────

📌 *DESCRIPCIÓN*
↳ ${data.title || 'Sin descripción'}

👤 *AUTOR*
│ 👑 *Nombre:* ${data.author?.nickname || 'Desconocido'}
│ 🏷️ *Usuario:* @${data.author?.username || 'usuario'}
└ 🆔 *ID:* ${data.author?.id || 'N/A'}

🎬 *MULTIMEDIA*
│ ⏱️ *Duración:* ${data.duration || 'N/A'}
│ 🌎 *Región:* ${data.region || 'N/A'}
│ ⚡ *Calidad:* ${data.metadata?.video_quality || 'Estándar'}
│ 📦 *Peso SD:* ${sizeMb} MB
└ 💎 *Peso HD:* ${sizeHdMb} MB

📊 *MÉTRICAS*
│ 👁️ *Vistas:* ${data.stats?.views || '0'}
│ ❤️ *Likes:* ${data.stats?.likes || '0'}
│ 💬 *Comentarios:* ${data.stats?.comment || '0'}
│ 🔄 *Compartidos:* ${data.stats?.share || '0'}
│ 📥 *Descargas:* ${data.stats?.download || '0'}
└ 🔖 *Guardados:* ${data.stats?.save || '0'}

🎵 *MÚSICA*
│ 🎶 *Pista:* ${data.music_info?.title || 'Original'}
│ 🎤 *Artista:* ${data.music_info?.author || 'Desconocido'}
└ ⏱️ *Duración:* ${data.music_info?.duration || 'N/A'}

🗓️ *PUBLICACIÓN*
└ 📅 *Fecha:* ${data.taken_at || 'N/A'}

🛡️ *INFORMACIÓN EXTRA*
│ 📢 *Anuncio:* ${data.metadata?.is_ad ? '✅ Sí' : '❌ No'}
└ 🛍️ *Comercial:* ${data.metadata?.commercial_video ? '✅ Sí' : '❌ No'}`;

        if (videoURL) {
            // Envío del video
            await conn.sendFile(m.chat, videoURL, "tiktok.mp4", caption, m);

            // Descargar el audio a Buffer antes de enviarlo
            if (audioURL) {
                setTimeout(async () => {
                    try {
                        const audioReq = await fetch(audioURL, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Referer': 'https://www.tiktok.com/'
                            }
                        });
                        
                        const audioBuffer = await audioReq.buffer();

                        await conn.sendFile(
                            m.chat, 
                            audioBuffer, 
                            "audio.mp3", 
                            "", 
                            m, 
                            false, 
                            { mimetype: 'audio/mpeg' }
                        );
                    } catch (errAudio) {
                        console.error("Error al descargar el audio:", errAudio);
                    }
                }, 1500);
            }
        } else {
            return m.reply("*[ ❌ ] No se pudo obtener el archivo de video.*");
        }
    } catch (e) {
        console.error(e);
        m.reply(`*[ ❌ ] Error:* ${e.message}`);
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
