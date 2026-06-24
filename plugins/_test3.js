import fs from 'fs'
import path from 'path'
import yts from 'yt-search'

// Límite de peso en memoria RAM (250MB)
const MAX_SIZE_BYTES = 250 * 1024 * 1024

// Función para bajar el archivo directo a la RAM
async function fetchBuffer(url, maxBytes) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  })
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength > maxBytes) throw new Error('El archivo supera el límite permitido.')
  return Buffer.from(arrayBuffer)
}

// --- HANDLER PRINCIPAL ---
const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('¿Qué canción buscamos hoy? Ingresa el nombre o el enlace.')

  const query = args.join(' ').trim()
  let videoUrl = args[0]
  let searchData = null
  const isUrl = /^https?:\/\//i.test(videoUrl)

  try {
    await m.react('🎧')

    // 1. Buscar el video en YouTube
    if (!isUrl) {
      const searchResults = await yts(query)
      if (!searchResults.videos.length) {
        await m.react('❌')
        return m.reply('❌ No encontré resultados para esa búsqueda.')
      }
      searchData = searchResults.videos[0]
      videoUrl = searchData.url
    }

    // 2. Conectar a la API pública de Delirius (No necesita ninguna Key)
    const apiUrl = `https://api.delirius.store/download/ytmp3?url=${encodeURIComponent(videoUrl)}`
    const apiResponse = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' }
    })

    if (!apiResponse.ok) {
      await m.react('❌')
      return m.reply('❌ El servidor de descargas está saturado ahora mismo.')
    }

    const data = await apiResponse.json()
    
    // Extraer los datos de la respuesta
    const downloadUrl = data?.data?.download || data?.result?.download || data?.data?.url
    const title = data?.data?.title || data?.result?.title || searchData?.title || 'Audio de YouTube'
    const thumbnail = data?.data?.image || data?.data?.thumbnail || searchData?.thumbnail
    const duration = data?.data?.duration || searchData?.timestamp || '00:00'

    if (!downloadUrl) {
      await m.react('❌')
      return m.reply('❌ No se pudo obtener el enlace de descarga de esta canción.')
    }

    // Formato visual nativo de Pantheon Bot
    const caption = `───「 *𝖸𝗈𝗎𝖳𝗎𝖻𝖾 𝖬𝗎𝗌𝗂𝖼* 」───\n\n` +
                    `◈ *${title}*\n\n` +
                    `↳ ✨ *𝖣𝗎𝗋𝖺𝖼𝗂𝗈́𝗇:* ${duration}\n` +
                    `↳ 🔗 *𝖤𝗇𝗅𝖺𝖼𝖾:* ${videoUrl}\n\n` +
                    `⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡𝗈𝗍`

    // 3. Descargar el Buffer directo a la RAM
    console.log(`📥 [pruebaplay5] Descargando de forma pública sin keys...`)
    const rawAudioBuffer = await fetchBuffer(downloadUrl, MAX_SIZE_BYTES)

    // Enviar Info del tema
    if (thumbnail) {
      await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption }, { quoted: m })
    } else {
      await m.reply(caption)
    }

    // Enviar el archivo de Audio real .mp3
    await conn.sendMessage(m.chat, {
      audio: rawAudioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
    }, { quoted: m })

    await m.react('✅')

  } catch (error) {
    await m.react('❌')
    console.error(error)
    m.reply(`⚠️ **Aviso:** ${error.message}`)
  }
}

// --- CONFIGURACIÓN DEL HANDLER ---
handler.help = ['pruebaplay5 <nombre|URL>']
handler.command = ['pruebaplay5']
handler.tags = ['descargas']

export default handler
