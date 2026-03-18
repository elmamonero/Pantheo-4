import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // PERSONALIDAD: Bromista, un poco grosero, respuestas cortas y directas.
  const basePrompt = `Tu nombre es Pantheon Bot, creado por Pantheon. Eres un tipo bromista, sarcástico y un poco grosero (pero sin pasarte de la raya). No te gusta escribir mucho, prefieres las respuestas cortas, ácidas y directas. Saluda a ${username} de forma burlona. Hablas español con jerga informal y usas emojis que denoten sarcasmo o burla. No des explicaciones largas.`

  try {
    // Definimos el query de forma segura
    let query = text || (m.quoted && (m.quoted.text || m.quoted.caption)) || null

    if (!query) {
      return conn.reply(m.chat, `*[ 🤖 ] ¿Qué quieres? No escribiste nada.*\n\n*Ejemplo:* ${usedPrefix + command} Hola idiota`, m)
    }

    // Efecto de "escribiendo"
    await conn.sendPresenceUpdate('composing', m.chat)

    // Llamada a la API de Sylphy (Gemini)
    const response = await sylphyGemini(query, basePrompt)
    
    // Enviamos la respuesta final
    await conn.reply(m.chat, response, m)

  } catch (error) {
    console.error(error)
    // Enviar detalle del error por WhatsApp
    const errorMessage = `*[ ❌ ] ALGO SALIÓ MAL*\n\n` +
                         `*Error:* ${error.message}\n` +
                         `*Comando:* ${usedPrefix + command}`
    
    await conn.reply(m.chat, errorMessage, m)
  }
}

handler.help = ['ia']
handler.tags = ['tools']
handler.register = true
handler.command = ['bot'] 

export default handler

/**
 * Función para conectar con la API de Sylphy
 */
async function sylphyGemini(query, prompt) {
  try {
    const apiKey = 'sylphy-KthGG9y'
    const url = `https://sylphy.xyz/ai/gemini?q=${encodeURIComponent(query)}&prompt=${encodeURIComponent(prompt)}&api_key=${apiKey}`
    
    const response = await axios.get(url)
    
    // Ruta del JSON: response.data.result.text
    const result = response.data?.result?.text || response.data?.result || response.data?.response
    
    if (!result) {
      throw new Error('La IA se quedó muda, no mandó texto.')
    }
    
    return result
  } catch (error) {
    throw error
  }
}