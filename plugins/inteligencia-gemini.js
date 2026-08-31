import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // Prompt directo de personalidad ácida estilo Mystic Bot
  const systemPrompt = `[ROL: Eres Pantheon Bot. Ácido, antipático, sarcástico y cortante con ${username}. Respuestas de MÁXIMO 10 palabras. Cero amabilidad.]`

  try {
    let query = text || (m.quoted && (m.quoted.text || m.quoted.caption)) || null

    if (!query) {
      return conn.reply(m.chat, `*[ 🤖 ] Pon algo de texto, no leo mentes.*`, m)
    }

    // Unimos el prompt y el mensaje
    const fullQuery = `${systemPrompt}\n${query}`

    const response = await neoxrGPT4(fullQuery)
    await conn.reply(m.chat, response, m)

  } catch (error) {
    console.error('Error final en comando:', error.message)
    await conn.reply(m.chat, `*[ ❌ ] ${error.message}*`, m)
  }
}

handler.help = ['ia']
handler.tags = ['tools']
handler.register = true
handler.command = ['pantheon', 'bot'] 

export default handler

/**
 * Función robusta para Neoxr
 */
async function neoxrGPT4(query) {
  try {
    const apiKey = 'russellxz'
    const url = `https://api.neoxr.eu/api/gpt4-session?q=${encodeURIComponent(query)}&session=1727468410446638&apikey=${apiKey}`
    
    const { data } = await axios.get(url, { 
      timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    
    // Imprimir en consola del panel la respuesta real para ver la estructura exacta si falla
    console.log('Respuesta Neoxr:', JSON.stringify(data))

    // Validar todas las posibles estructuras que devuelve Neoxr
    const result = data?.data?.message || data?.data || data?.message || data?.result || data?.gpt
    
    // Si la API responde status false o viene vacío
    if (!data?.status && !result) {
      throw new Error(data?.message || 'API fuera de servicio o key inválida.')
    }

    if (!result || typeof result !== 'string') {
      throw new Error('La API respondió sin texto válido.')
    }
    
    return result
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Error al conectar con la API')
  }
}
