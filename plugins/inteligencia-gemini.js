import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // Tu configuración de personalidad
  const basePrompt = `Tu nombre es Pantheon Bot y fuiste creado por Pantheon. Eres masculino, divertido y hablas español. Tu estilo es preciso, claro y sin barreras. Usa emojis. Llama al usuario por su nombre: ${username}.`

  // Si no hay texto y no está respondiendo a un mensaje con texto
  if (!text && !(m.quoted && m.quoted.text)) {
    return conn.reply(m.chat, `*[ 🤖 ] Ingrese su petición*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} Hola, ¿quién eres?`, m)
  }

  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    // Prioriza el texto escrito, si no, usa el texto del mensaje citado
    let query = text || m.quoted.text
    
    // Llamada a la API de Sylphy (Gemini)
    const response = await sylphyGemini(query, basePrompt)
    
    await conn.reply(m.chat, response, m)
  } catch (error) {
    console.error('*[ ℹ️ ] Error en la API:*', error)
    await conn.reply(m.chat, '*[ ❌ ] La IA no pudo responder en este momento.*', m)
  }
}

handler.help = ['ia']
handler.tags = ['tools']
handler.register = true

// Añadido 'bot' a los comandos
handler.command = ['ia', 'ai', 'pantheon', 'bot'] 

export default handler

/**
 * Función para interactuar con la API de Sylphy (Gemini)
 */
async function sylphyGemini(query, prompt) {
  try {
    const apiKey = 'sylphy-KthGG9y'
    // Construcción de la URL con encodeURIComponent para evitar errores con espacios o símbolos
    const url = `https://sylphy.xyz/ai/gemini?q=${encodeURIComponent(query)}&prompt=${encodeURIComponent(prompt)}&api_key=${apiKey}`
    
    const response = await axios.get(url)
    
    // Retorna el resultado de la API (ajustado a la estructura común de estas APIs)
    return response.data.result || response.data.response || "No recibí respuesta."
  } catch (error) {
    throw error
  }
}