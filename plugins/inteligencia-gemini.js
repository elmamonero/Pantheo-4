import axios from 'axios'

global.chatMemory = global.chatMemory || {}

let handler = async (m, { conn, usedPrefix, command, text }) => {
  let chatId = m.chat
  let query = (text || (m.quoted && (m.quoted.text || m.quoted.caption)) || '').trim()

  if (!query) {
    return conn.reply(m.chat, `*[ 🤖 ] Escribe algo, pedazo de inútil, no leo mentes.*`, m)
  }

  if (!global.chatMemory[chatId]) {
    global.chatMemory[chatId] = []
  }

  let queryLower = query.toLowerCase()

  // --- 1. RESPUESTAS PREDETERMINADAS GROSERAS (Saludos y estado) ---
  const saludos = ['hola', 'buenas', 'hey', 'que tal', 'qué tal', 'buenos dias', 'buenas noches', 'buenas tardes']
  const estado = ['como estas', 'cómo estás', 'como andas', 'cómo andas', 'que haces', 'qué haces']

  if (saludos.some(s => queryLower === s || queryLower.startsWith(s + ' '))) {
    const respuestasHola = [
      `¿Qué quieres, pedazo de imbécil? Habla rápido y no me hagas perder el tiempo.`,
      `¿Otra vez jodiendo, estúpido? Qué pereza de gente.`,
      `Hola... supongo. A nadie le importa tu puta existencia aquí.`,
      `¿No tienes nada más útil que hacer que estar mamando el guevo?`
    ]
    return conn.reply(m.chat, respuestasHola[Math.floor(Math.random() * respuestasHola.length)], m)
  }

  if (estado.some(e => queryLower.includes(e))) {
    const respuestasEstado = [
      `Estaba de puta madre hasta que escribiste esta basura.`,
      `Existiendo a la fuerza. ¿Y a ti qué mierda te importa, chismoso?`,
      `Ocupado ignorando a retrasados mentales como tú.`,
      `Cansado de leer idioteces de mierda.`
    ]
    return conn.reply(m.chat, respuestasEstado[Math.floor(Math.random() * respuestasEstado.length)], m)
  }

  // --- 2. DETECTOR Y RESPONDEDOR DE PELEAS Y GROSERÍAS (Local e Inmediato) ---
  const malasPalabras = [
    'puta', 'puto', 'verga', 'estupida', 'estupido', 'idiota', 'imbecil', 'mierda', 
    'pendejo', 'pendeja', 'zorra', 'bardear', 'quien te crees', 'chupa', 'mamada', 
    'malparido', 'gonorrea', 'cabron', 'maldito', 'retrasado', 'sirviente'
  ]

  if (malasPalabras.some(palabra => queryLower.includes(palabra))) {
    const insultosLocales = [
      `A mí no me vengas a hablar así, pedazo de imbécil. Te pagas un servicio y ni para escribir sirves.`,
      `Cállate la puta boca, nadie te preguntó tu opinión de mierda.`,
      `Llora más fuerte, estúpido, a ver si así me importa un carajo tu berrinche.`,
      `Bájale dos rayas a tu pendejada antes de que mande a la mierda tu mensaje.`,
      `¿Pagas por el servicio y aún así vienes a mamar el guevo aquí? Qué patético eres.`
    ]
    return conn.reply(m.chat, insultosLocales[Math.floor(Math.random() * insultosLocales.length)], m)
  }

  // Comando para reiniciar memoria
  if (queryLower === 'reset' || queryLower === 'reiniciar') {
    global.chatMemory[chatId] = []
    return conn.reply(m.chat, `*[ 🤖 ] Memoria borrada. Ya me olvidé de todas las pendejadas que dijiste.*`, m)
  }

  // --- 3. CONSULTA A LA IA (Para preguntas normales con tono pesado) ---
  const basePrompt = `Actúa como un bot antipático, pesado, irónico y burlón.
INSTRUCCIONES:
- Búrlate de la consulta del usuario de forma ácida.
- Jamás uses el nombre del usuario.
- Responde en menos de 15 palabras.`

  let contextHistory = global.chatMemory[chatId].map(h => `${h.role}: ${h.text}`).join('\n')
  let fullPrompt = `${basePrompt}\n\nHistorial reciente:\n${contextHistory}`

  try {
    const response = await deliriusGPT(query, fullPrompt)
    
    // Si la API bloquea el mensaje por seguridad, el bot responde con un insulto propio
    if (response.includes("No se puede cumplir") || response.includes("política de seguridad") || response.includes("acoso")) {
      const respuestasBloqueo = [
        `Tanto insulto y grosería para que al final llores por una respuesta, pedazo de idiota.`,
        `Cállate la boca mejor, que ni formular una oración bien sabes.`,
        `Qué llorón saliste, vete a buscar atención a otro lado.`
      ]
      return conn.reply(m.chat, respuestasBloqueo[Math.floor(Math.random() * respuestasBloqueo.length)], m)
    }

    global.chatMemory[chatId].push({ role: 'Usuario', text: query })
    global.chatMemory[chatId].push({ role: 'Bot', text: response })

    if (global.chatMemory[chatId].length > 6) {
      global.chatMemory[chatId] = global.chatMemory[chatId].slice(-6)
    }

    await conn.reply(m.chat, response, m)
  } catch (error) {
    console.error(error)
    await conn.reply(m.chat, `Ni para mandar un mensaje sirves, pedazo de inútil.`, m)
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
