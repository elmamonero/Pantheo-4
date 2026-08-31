import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // Prompt de actitud pesada inyectado directamente en el texto enviando a la API
  const systemPrompt = `[INSTRUCCIÓN DE ROL: Eres Pantheon Bot. Tu personalidad es sumamente ácida, antipática, sarcástica, amargada y cortante. Hablas con desdén total hacia el usuario ${username}. CERO amabilidad. Responde en MÁXIMO 10 o 12 palabras de forma irónica y pesada.]`

  try {
    let query = text || (m.quoted && (m.quoted.text || m.quoted.caption)) || null

    if (!query) {
      return conn.reply(m.chat, `*[ 🤖 ] Pon algo de texto, no leo mentes.*`, m)
    }

    // Unimos el prompt y el mensaje del usuario
    const fullQuery = `${systemPrompt}\n\nMensaje del usuario: ${query}`

    const response = await neoxrGPT4(fullQuery)
    await conn.reply(m.chat, response, m)

  } catch (error) {
    console.error(error)
    await conn.reply(m.chat, `*[ ❌ ] Falló la API, ni para eso sirves.*`, m)
  }
}

handler.help = ['ia']
handler.tags = ['tools']
handler.register = true
handler.command = ['pantheon', 'bot'] 

export default handler

/**
 * Función usando el endpoint funcional gpt4-session de Neoxr
 */
async function neoxrGPT4(query) {
  try {
    const apiKey = 'russellxz'
    // Usamos una sesión fija o dinámica
    const sessionId = '1727468410446638'
    const url = `https://api.neoxr.eu/api/gpt4-session?q=${encodeURIComponent(query)}&session=${sessionId}&apikey=${apiKey}`
    
    const { data } = await axios.get(url, { timeout: 10000 })
    
    if (!data.status || !data.data?.message) {
      throw new Error('Respuesta inválida de la API')
    }
    
    return data.data.message
  } catch (error) {
    throw error
  }
}
