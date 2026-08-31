import axios from 'axios'

// Objeto en memoria para guardar el historial por chat
global.chatMemory = global.chatMemory || {}

let handler = async (m, { conn, usedPrefix, command, text }) => {
  let chatId = m.chat
  let query = (text || (m.quoted && (m.quoted.text || m.quoted.caption)) || '').trim()

  if (!query) {
    return conn.reply(m.chat, `*[ 🤖 ] Escribe algo, inútil, no leo mentes.*`, m)
  }

  // Inicializar historial si no existe
  if (!global.chatMemory[chatId]) {
    global.chatMemory[chatId] = []
  }

  // --- RESPUESTAS PREDETERMINADAS (No se guardan en el historial de la IA) ---
  const queryLower = query.toLowerCase()
  const saludos = ['hola', 'buenas', 'hey', 'que tal', 'qué tal', 'buenos dias', 'buenas noches', 'buenas tardes']
  const estado = ['como estas', 'cómo estás', 'como andas', 'cómo andas', 'que haces', 'qué haces']

  if (saludos.some(s => queryLower === s || queryLower.startsWith(s + ' '))) {
    const respuestasHola = [
      `¿Qué quieres? Habla rápido y no quites el tiempo.`,
      `¿Otra vez jodiendo? Qué pereza de gente.`,
      `Hola... supongo. A nadie le importa tu presencia aquí.`
    ]
    return conn.reply(m.chat, respuestasHola[Math.floor(Math.random() * respuestasHola.length)], m)
  }

  if (estado.some(e => queryLower.includes(e))) {
    const respuestasEstado = [
      `Estaba de maravilla hasta que escribiste esta estupidez.`,
      `Existiendo a la fuerza. ¿Y a ti qué mierda te importa?`,
      `Ocupado ignorando a retrasados.`
    ]
    return conn.reply(m.chat, respuestasEstado[Math.floor(Math.random() * respuestasEstado.length)], m)
  }

  // Comandos para borrar la memoria
  if (queryLower === 'reset' || queryLower === 'reiniciar') {
    global.chatMemory[chatId] = []
    return conn.reply(m.chat, `*[ 🤖 ] Memoria borrada. Ya me olvidé de todas las estupideces que dijiste.*`, m)
  }

  // --- PROMPT CON HISTORIAL ---
  const basePrompt = `Actúa como un bot antipático, apático, pesado e irónico.
INSTRUCCIONES:
- Búrlate de la consulta del usuario de forma ácida y seca.
- Jamás uses el nombre del usuario.
- Responde en menos de 15 palabras.
- Evita groserías extremas para evitar filtros de censura.`

  // Formatear el historial para pasárselo a la API
  let contextHistory = global.chatMemory[chatId].map(h => `${h.role}: ${h.text}`).join('\n')
  let fullPrompt = `${basePrompt}\n\nHistorial de la conversación reciente:\n${contextHistory}`

  try {
    const response = await deliriusGPT(query, fullPrompt)
    
    // Guardar en la memoria la entrada y la respuesta
    global.chatMemory[chatId].push({ role: 'Usuario', text: query })
    global.chatMemory[chatId].push({ role: 'Bot', text: response })

    // Mantener solo los últimos 6 mensajes para no saturar la API
    if (global.chatMemory[chatId].length > 6) {
      global.chatMemory[chatId] = global.chatMemory[chatId].slice(-6)
    }

    await conn.reply(m.chat, response, m)
  } catch (error) {
    console.error(error)
    await conn.reply(m.chat, `*[ ❌ ] Ni para mandar un mensaje sirves, falló el sistema.*`, m)
  }
}

handler.help = ['bot']
handler.tags = ['fun']
handler.register = true
handler.command = ['bot', 'pantheon'] 

export default handler

async function deliriusGPT(query, prompt) {
  try {
    const url = `https://api.delirius.online/ia/gptprompt?text=${encodeURIComponent(query)}&prompt=${encodeURIComponent(prompt)}`
    const { data } = await axios.get(url, { timeout: 10000 })
    return data?.data || data?.result || data?.response || 'Qué pereza responderte, cállate ya.'
  } catch (error) {
    throw error
  }
}
