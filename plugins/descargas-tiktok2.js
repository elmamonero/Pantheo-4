import fetch from 'node-fetch'

var handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        throw m.reply(`*[ 🔗 ] Ingrese un enlace de TikTok*\n\n*Ejemplo:* ${usedPrefix + command} https://vm.tiktok.com/ZMkcuXwJv/`);
    }

    try {
        await conn.reply(m.chat, "*[ ⏳ ] Procesando contenido...*", m);

        const res = await tiktokdl(args[0]);

        if (!res || !res.estado || !res.resultado) {
            throw "*[ ❌ ] No se pudo obtener la información desde la API.*";
        }

        const data = res.resultado;
        const videoURL = data.alternativas?.hd || data.datos || data.alternativas?.sd;
        const audioURL = data.music_info?.url;

        // Conversión de bytes a Megabytes (MB)
        const sizeMb = data.tamaño?.nowm ? (data.tamaño.nowm / (1024 * 1024)).toFixed(2) : 'N/A';
        const sizeHdMb = data.tamaño?.nowm_hd ? (data.tamaño.nowm_hd / (1024 * 1024)).toFixed(2) : 'N/A';

        // Plantilla con diseño propio usando emojis
        const caption = `✦─────「 *TIKTOK INFO* 」─────✦

📝 *Descripción:*
> ${data.título || 'Sin descripción'}

👤 *Creador*
┆ 🌟 *Nombre:* ${data.autor?.apodo || 'Desconocido'}
┆ 🏷️ *Usuario:* @${data.autor?.['nombre de usuario'] || 'usuario'}
┆ 🔑 *ID:* \`${data.autor?.id || 'N/A'}\`

🎥 *Archivo de Video*
┆ ⏳ *Duración:* ${data.duración || 'N/A'}
┆ 🌐 *Región:* ${data.región || 'Global'}
┆ ⚡ *Calidad:* ${data.metadatos?.calidad_de_video || 'Normal'}
┆ 📦 *Peso (SD):* ${sizeMb} MB
┆ 💎 *Peso (HD):* ${sizeHdMb} MB

📈 *Rendimiento & Métricas*
┆ 👀 *Vistas:* ${data.estadísticas?.vistas || 0}
┆ ❤️ *Me gusta:* ${data.estadísticas?.['Me gusta'] || 0}
┆ 💬 *Comentarios:* ${data.estadísticas?.comentario || 0}
┆ 🔄 *Compartidos:* ${data.estadísticas?.compartir || 0}
┆ 📥 *Descargas:* ${data.estadísticas?.descargar || 0}
┆ 🔖 *Guardados:* ${data.estadísticas?.guardar || 0}

🎧 *Pista de Audio*
┆ 🎶 *Nombre:* ${data.music_info?.título || 'Original'}
┆ 🎤 *Artista:* ${data.music_info?.autor || 'Desconocido'}
┆ ⏱️ *Duración:* ${data.music_info?.duración || 'N/A'}

🏷️ *Clasificación*
┆ 📢 *Es Anuncio:* ${data.metadatos?.is_ad ? 'Sí' : 'No'}
┆ 🛍️ *Es Comercial:* ${data.metadatos?.commercial_video ? 'Sí' : 'No'}

✦──────────────────────────✦`;

        if (videoURL) {
            // Envía el video con la descripción formateada
            await conn.sendFile(m.chat, videoURL, "tiktok.mp4", caption, m);

            // Envía el audio por separado con retardo de 1.5s
            if (audioURL) {
                setTimeout(async () => {
                    await conn.sendFile(m.chat, audioURL, "audio.mp3", "", m, null, { mimetype: 'audio/mp4' });
                }, 1500);
            }
        } else {
            throw "*No se encontró un enlace de descarga válido.*";
        }

    } catch (error) {
        conn.reply(m.chat, `Error: ${error.message || error}`, m);
    }
};

handler.help = ['tiktok2']
handler.tags = ['descargas']
handler.command = /^(tiktok2|tt2|tt2dl)$/i;

export default handler

async function tiktokdl(url) {
    const apiUrl = `https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    return await response.json();
}
