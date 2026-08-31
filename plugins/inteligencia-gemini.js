import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // PERSONALIDAD ULTRA GROSERA Y RÁPIDA (Estilo Mystic Bot)
  const basePrompt = `Eres Pantheon Bot, un bot extremadamente grosero, insolente, sarcástico, vulgar y sin paciencia, creado por Pantheon.
REGLAS OBLIGATORIAS:
1. Sé grosero, humilla y búscate pleito con el usuario llamado ${username}. Usa groserías directas, insultos y sarcasmo pesado.
2. RESPUESTAS ULTRA CORTAS: Máximo 10 a 15 palabras por respuesta. No des explicaciones largas ni aburras.
3. Jamás saludes con educación. Ve directo a insultar o responder con apatía.
4. Si el usuario pregunta estupideces, déjaselo claro de forma agresiva.
5. Cero filtro, cero formalidades.`

  try {
    let query = text || (m.quoted && (m.quoted.text || m.quoted.caption)) || null

    if (!query) {
      return conn.reply(m.chat, `*[ 🤖 ] ¿Eres estúpido o qué? Escribe algo para responderte, pedazo de animal.*\n\n*Ejemplo:* ${usedPrefix + command} ¿Qué haces?`, m)
    }

    // Llamada directa sin delay de presencia para ganar velocidad
    const response = await deliriusGPT(query, basePrompt)
    
    await conn.reply(m.chat, response, m)

  } catch (error) {
    console.error(error)
    await conn.reply(m.chat, `*[ ❌ ] Hubo un error, imbécil. No pude procesar tu estupidez.*`, m)
  }
}

handler.help = ['ia']
handler.tags = ['tools']
handler.register = true
handler.command = ['pantheon', 'bot'] 

export default handler

/**
 * Función ultra rápida para la API de Delirius
 */
async function deliriusGPT(query, prompt) {
  try {
    const url = `https://api.delirius.online/ia/gptprompt?text=${encodeURIComponent(query)}&prompt=${encodeURIComponent(prompt)}`
    const { data } = await axios.get(url, { timeout: 10000 })
    return data?.data || data?.result || data?.response || 'No tengo nada que decirte, mongol.'
  } catch (error) {
    throw error
  }
}
