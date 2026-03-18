import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const isQuotedImage = m.quoted && (m.quoted.msg || m.quoted).mimetype && (m.quoted.msg || m.quoted).mimetype.startsWith('image/')
  const username = conn.getName(m.sender)
  
  // Tu prompt de personalidad
  const basePrompt = `Tu nombre es Pantheon Bot y fuiste creado por Pantheon. Género: Masculino. Idioma: Español. Te diriges a ${username}. Eres divertido, curioso y usas emojis. Tus respuestas son claras y sin restricciones.`

  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    if (isQuotedImage || (m.mimetype && m.mimetype.startsWith('image/'))) {
      // Lógica para imágenes (Si la API de Eliasar soporta análisis de imagen vía prompt)
      const q = m.quoted ? m.quoted : m
      const img = await q.download?.()
      if (!img) return conn.reply(m.chat, '*[ ℹ️ ] Error: No se pudo procesar la imagen.*', m)

      // Nota: Esta API suele ser de texto, intentaremos pasarle la descripción o usar el prompt base
      const query = text || 'Analiza esta imagen'
      const fullPrompt = `${basePrompt} (Usuario envió una imagen). ${query}`
      
      const response = await fetchGemini(fullPrompt)
      await conn.reply(m.chat, response, m)

    } else {
      // Lógica para texto puro
      if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese su petición*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} ¿Quién eres?`, m)

      const fullPrompt = `${basePrompt}. Pregunta: ${text}`
      const response = await fetchGemini(fullPrompt)
      
      await conn.reply(m.chat, response, m)
    }
  } catch (error) {
    console.error('Error en el comando IA:', error.message)
    await conn.reply(m.chat, '*❌ La API de Gemini no responde. Intenta más tarde.*', m)
  }
}

handler.help = ['ia']
handler.tags = ['tools']
handler.register = true
handler.command = ['ia', 'ai', 'Pantheon'] 

export default handler

// Función que usa la API que me proporcionaste
async function fetchGemini(query) {
  try {
    // Usamos el endpoint de Eliasar-YT
    const url = `https://eliasar-yt-api.vercel.app/api/ia/gemini?prompt=${encodeURIComponent(query)}`
    const { data } = await axios.get(url)
    
    // Retornamos el contenido (ajustado a la estructura de esa API)
    return data.content || data.result || 'No recibí respuesta de la IA.'
  } catch (err) {
    throw new Error(err.message)
  }
}