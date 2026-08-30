import fetch from 'node-fetch'

var handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return m.reply(
      `*[ 🔗 ] Ingrese el enlace de TikTok*\n\n` +
      `*Ejemplo:* ${usedPrefix + command} https://vt.tiktok.com/ZSVNmoTLc/`
    )
  }

  try {
    await conn.reply(
      m.chat,
      '*[ ⏳ ] Procesando información del video...*',
      m
    )

    const res = await tiktokdl(args[0])

    if (!res || !res.result) {
      return m.reply('*[ ❌ ] La API no respondió correctamente.*')
    }

    const data = res.result

    const videoURL =
      data.data ||
      data.alternativas?.hd ||
      data.alternativas?.selected ||
      data.alternativas?.seleccionado

    const audioURL = data.music_info?.url

    const sizeMb = data.size?.nowm
      ? (data.size.nowm / (1024 * 1024)).toFixed(2)
      : 'N/A'

    const sizeHdMb = data.size?.nowm_hd
      ? (data.size.nowm_hd / (1024 * 1024)).toFixed(2)
      : 'N/A'

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
└ 🛍️ *Comercial:* ${data.metadata?.commercial_video ? '✅ Sí' : '❌ No'}`

    if (!videoURL) {
      return m.reply('*[ ❌ ] No se pudo obtener el archivo de video.*')
    }

    await conn.sendFile(
      m.chat,
      videoURL,
      'tiktok.mp4',
      caption,
      m
    )

    // Regex escapada correctamente:
    if (!audioURL || !/^https?:\/\//i.test(audioURL)) {
      return
    }

    try {
      const audioResponse = await fetch(audioURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          Referer: 'https://www.tiktok.com/'
        }
      })

      if (!audioResponse.ok) {
        throw new Error(
          `Error descargando audio: HTTP ${audioResponse.status}`
        )
      }

      const audioBuffer = Buffer.from(
        await audioResponse.arrayBuffer()
      )

      if (audioBuffer.length < 10000) {
        throw new Error(
          'El archivo de audio está vacío, incompleto o bloqueado.'
        )
      }

      await conn.sendMessage(
        m.chat,
        {
          audio: audioBuffer,
          mimetype: 'audio/mpeg',
          fileName: 'tiktok.mp3',
          ptt: false
        },
        {
          quoted: m
        }
      )
    } catch (audioErr) {
      console.error('Error enviando audio de TikTok:', audioErr)

      await m.reply(
        '*[ ⚠️ ] El video se envió correctamente, pero no se pudo enviar el audio.*'
      )
    }
  } catch (e) {
    console.error('Error en comando TikTok:', e)

    await m.reply(`*[ ❌ ] Error:* ${e.message}`)
  }
}

handler.help = ['tiktok2 <url>']
handler.tags = ['descargas']
handler.command = /^(tiktok2|tt2|tt2dl)$/i

export default handler

async function tiktokdl(url) {
  try {
    const api = `https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(url)}`

    const response = await fetch(api, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })

    if (!response.ok) {
      throw new Error(`La API respondió HTTP ${response.status}`)
    }

    return await response.json()
  } catch (e) {
    console.error('Error consultando API TikTok:', e)
    return null
  }
}
