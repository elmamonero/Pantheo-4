import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // Configuración de la personalidad del Bot
  const basePrompt = `Tu nombre es Pantheon Bot y fuiste creado por Pantheon. Eres masculino, divertido y hablas español. Tu estilo es preciso, claro y sin barreras. Usa emojis. Llama al usuario por su nombre: ${username}.`

  // Determinamos el texto a procesar: 
  // 1. El texto que escribió el usuario.
  // 2. Si no escribió nada, el texto del mensaje al que está respondiendo.
  let query = text || (m.quoted && m.quoted.text) || (m.quoted && m.quoted.caption) || null

  // Si no hay texto de ninguna forma, enviamos el ejemplo de uso
  if (!query) {
    return conn.reply(m.chat, `*[ 🤖 ] Ingrese su petición*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} Hola, ¿quién eres?`, m)
  }

  // Indicamos que el bot está "escribiendo"
  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    // Llamada a la API de Sylphy (Gemini)
    const response = await sylphyGemini(query, basePrompt)
    
    // Enviamos la respuesta de la IA
    await conn.reply(m.chat, response, m)

  } catch (error) {
    console.error('*[ ℹ️ ] Error en la API de IA:*', error)
    await conn.reply(m.chat, '*[ ❌ ] La IA no pudo responder en este momento. Intenta más tarde.*', m)
  }
}

handler.help = ['ia']
handler.tags = ['tools']
handler.register = true

// Comandos que activan esta función
handler.command = ['ia', 'ai', 'pantheon', 'bot'] 

export default handler

/**
 * Función interna para conectar con la API de Sylphy
 * @param {string} query - La pregunta del usuario
 * @param {string} prompt - La personalidad del bot
 */
async function sylphyGemini(query, prompt) {
  try {
    const apiKey = 'sylphy-KthGG9y'
    
    // Construimos la URL codificando los parámetros para evitar errores de sintaxis
    const url = `https://sylphy.xyz/ai/gemini?q=${encodeURIComponent(query)}&prompt=${encodeURIComponent(prompt)}&api_key=${apiKey}`
    
    const response = await axios.get(url)
    
    // Extraemos el resultado. Probamos con 'result' o 'response' según el formato de la API
    const result = response.data.result || response.data.response
    
    if (!result) throw new Error('Respuesta vacía de la API')
    
    return result
  } catch (error) {
    // Re-lanzamos el error para que el handler lo capture
    throw error
  }
}