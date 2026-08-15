import fetch from 'node-fetch'

var handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        throw m.reply(`*[ 🔗 ] Ingrese un enlace de TikTok*\n\n*Ejemplo:* ${usedPrefix + command} https://vt.tiktok.com/ZSVNmoTLc/`);
    }

    try {
        await conn.reply(m.chat, "*[ ⏳ ] Conectando con la API y descargando...*", m);

        const res = await tiktokdl(args[0]);

        // Verificación robusta basada en tu JSON
        if (!res || res.estado !== true || !res.resultado) {
            throw "*[ ❌ ] La API no respondió correctamente. Intenta con otro link o verifica el estado de la API.*";
        }

        const data = res.resultado;
        const videoURL = data.alternativas?.hd || data.datos || data.alternativas?.sd;
        const audioURL = data.music_info?.url;

        // Construcción del mensaje estético
        const caption = `✨ *TIKTOK DOWNLOADER* ✨

📝 *Descripción:* 
> ${data.título || 'Sin descripción'}

👤 *Creador:* 
• *Nombre:* ${data.autor?.apodo || 'Desconocido'}
• *Usuario:* @${data.autor?.['nombre de usuario'] || 'N/A'}

🎬 *Video:*
• *Duración:* ${data.duración || 'N/A'}
• *Región:* ${data.región || 'Global'}
• *Calidad:* ${data.metadatos?.calidad_de_video || 'Estándar'}

📊 *Estadísticas:*
• *Vistas:* ${data.estadísticas?.vistas || '0'}
• *Likes:* ${data.estadísticas?.['Me gusta'] || '0'}
• *Comentarios:* ${data.estadísticas?.comentario || '0'}
• *Compartidos:* ${data.estadísticas?.compartir || '0'}

🎵 *Audio:*
• *Pista:* ${data.music_info?.título || 'Original'}
• *Artista:* ${data.music_info?.autor || 'Desconocido'}

🛡️ *Comercial:* ${data.metadatos?.commercial_video ? 'Sí' : 'No'}`;

        if (videoURL) {
            // Envío del video
            await conn.sendFile(m.chat, videoURL, "tiktok.mp4", caption, m);

            // Envío del audio con retardo
            if (audioURL) {
                setTimeout(async () => {
                    await conn.sendFile(m.chat, audioURL, "audio.mp3", "", m, null, { mimetype: 'audio/mp4' });
                }, 1500);
            }
        } else {
            throw "*[ ❌ ] No se pudo obtener el archivo de video.*";
        }

    } catch (error) {
        conn.reply(m.chat, `*[ ⚠️ ] Error:* ${error.message || error}`, m);
    }
};

handler.help = ['tiktok2']
handler.tags = ['descargas']
handler.command = /^(tiktok2|tt2|tt2dl)$/i;

export default handler

// Función mejorada con User-Agent para evitar bloqueos
async function tiktokdl(url) {
    try {
        const apiUrl = `https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(url)}`;
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
}
