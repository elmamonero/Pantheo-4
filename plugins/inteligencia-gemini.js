import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // Configuración de la personalidad del Bot
  const basePrompt = `Tu nombre es Pantheon Bot y fuiste creado por Pantheon. Eres masculino, divertido y hablas español. Tu estilo es preciso, claro y sin barreras. Usa emojis. Llama al usuario por su nombre: ${username}.`

  try {
    // Definimos el query de forma segura (sin usar .match)
    // Busca texto en el mensaje actual, o en el mensaje citado (texto o caption)
    let query = text || (m.quoted && (m.quoted.text || m.quoted.caption)) || null

    if (!query) {
      return conn.reply(m.chat, `*[ 🤖 ] Ingrese su petición*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} Hola, ¿quién eres?`, m)
    }

    await conn.sendPresenceUpdate('composing', m.chat)

    // Llamada a la API de Sylphy (Gemini)
    const response = await sylphyGemini(query, basePrompt)
    
    // Enviamos la respuesta final
    await conn.reply(m.chat, response, m)

  } catch (error) {
    // En caso de error, enviamos el detalle por WhatsApp
    console.error(error)
    const errorMessage = `*[ ❌ ] ERROR EN IA*\n\n` +
                         `*Tipo:* ${error.name}\n` +
                         `*Mensaje:* ${error.message}\n` +
                         `*Comando:* ${usedPrefix + command}`
    
    await conn.reply(m.chat, errorMessage, m)
  }
}

handler.help = ['ia']
handler.tags = ['tools']
handler.register = true
handler.command = ['ia', 'ai', 'pantheon', 'bot'] 

export default handler

/**
 * Función para conectar con la API de Sylphy
 */
async function sylphyGemini(query, prompt) {
  try {
    const apiKey = 'sylphy-KthGG9y'
    const url = `https://sylphy.xyz/ai/gemini?q=${encodeURIComponent(query)}&prompt=${encodeURIComponent(prompt)}&api_key=${apiKey}`
    
    const response = await axios.get(url)
    
    // Según el JSON que enviaste, la ruta es: response.data.result.text
    const result = response.data?.result?.text || response.data?.result || response.data?.response
    
    if (!result) {
      throw new Error('La API no devolvió el campo "result.text" esperado.')
    }
    
    return result
  } catch (error) {
    throw error
  }
}