import axios from 'axios'

global.chatMemory = global.chatMemory || {}
global.lastReply = global.lastReply || {} // Almacena la última respuesta por chat para no repetir

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

  // Función para obtener una respuesta aleatoria que NO sea igual a la anterior
  const getRandomReply = (list) => {
    let filtered = list.filter(msg => msg !== global.lastReply[chatId])
    let selected = filtered[Math.floor(Math.random() * filtered.length)]
    global.lastReply[chatId] = selected
    return selected
  }

  // --- 1. RESPUESTAS PREDETERMINADAS AMPLIADAS ---
  const saludos = ['hola', 'buenas', 'hey', 'que tal', 'qué tal', 'buenos dias', 'buenas noches', 'buenas tardes']
  const estado = ['como estas', 'cómo estás', 'como andas', 'cómo andas', 'que haces', 'qué haces']

  if (saludos.some(s => queryLower === s || queryLower.startsWith(s + ' '))) {
    const respuestasHola = [
      `¿Qué quieres, pedazo de imbécil? Habla rápido y no me hagas perder el tiempo.`,
      `¿Otra vez jodiendo, estúpido? Qué pereza me da tu existencia.`,
      `Hola... supongo. A nadie le importa que estés aquí.`,
      `¿No tienes nada más útil que hacer que estar mamando el guevo?`,
      `Llegó el más castrante del grupo. ¿Qué quieres?`,
      `Ahorráte el saludo y dime qué mierda quieres.`
    ]
    return conn.reply(m.chat, getRandomReply(respuestasHola), m)
  }

  if (estado.some(e => queryLower.includes(e))) {
    const respuestasEstado = [
      `Estaba de puta madre hasta que escribiste esta basura.`,
      `Existiendo a la fuerza. ¿Y a ti qué mierda te importa, chismoso?`,
      `Ocupado ignorando a retrasados mentales como tú.`,
      `Cansado de leer idioteces de gente sin cerebro.`,
      `Perfecto hasta que vi tu mensaje inservible.`,
      `Buscando quién te preguntó cómo estoy.`
    ]
    return conn.reply(m.chat, getRandomReply(respuestasEstado), m)
  }

  // --- 2. DETECTOR DE GROSERÍAS Y CONFLICTOS LOCALES ---
  const malasPalabras = [
    'puta', 'puto', 'verga', 'estupida', 'estupido', 'idiota', 'imbecil', 'mierda', 
    'pendejo', 'pendeja', 'zorra', 'bardear', 'quien te crees', 'chupa', 'mamada', 
    'malparido', 'gonorrea', 'cabron', 'maldito', 'retrasado', 'sirviente'
  ]

  if (malasPalabras.some(palabra => queryLower.includes(palabra))) {
    const insultosLocales = [
      `A mí no me vengas a hablar así, pedazo de imbécil.`,
      `Cállate la puta boca, nadie te preguntó tu opinión de mierda.`,
      `Llora más fuerte, estúpido, a ver si así me importa un carajo tu berrinche.`,
      `Bájale dos rayas a tu pendejada antes de que mande a la mierda tu mensaje.`,
      `¿Pagas por el servicio y aún así vienes a mamar el guevo aquí? Qué patético eres.`,
      `Sigue insultando a una pantalla, pedazo de mongólico.`,
      `Mucho texto para tan poca neurona.`
    ]
    return conn.reply(m.chat, getRandomReply(insultosLocales), m)
  }

  if (queryLower === 'reset' || queryLower === 'reiniciar') {
    global.chatMemory[chatId] = []
    return conn.reply(m.chat, `*[ 🤖 ] Memoria borrada. Ya me olvidé de todas las pendejadas que dijiste.*`, m)
  }

  // --- 3. PROMPT DE IA CON HISTORIAL ---
  const basePrompt = `Actúa como un bot antipático, pesado, irónico y burlón.
INSTRUCCIONES:
- Búrlate de la consulta del usuario de forma ácida.
- Jamás uses el nombre del usuario.
- Responde en menos de 15 palabras.`

  let contextHistory = global.chatMemory[chatId].map(h => `${h.role}: ${h.text}`).join('\n')
  let fullPrompt = `${basePrompt}\n\nHistorial reciente:\n${contextHistory}`

  try {
    const response = await deliriusGPT(query, fullPrompt)
    const responseText = String(response)

    // --- 4. REPERTORIO VARIO PARA INTERCEPTAR BLOQUEOS DE LA API ---
    const esErrorSeguridad = 
      responseText.includes("I cannot comply") || 
      responseText.includes("violates the policy") || 
      responseText.includes("harassment") || 
      responseText.includes("unable to generate") || 
      responseText.includes("No se puede cumplir") || 
      responseText.includes("política de seguridad") || 
      responseText.includes("lenguaje de odio")

    if (esErrorSeguridad) {
      const respuestasBloqueo = [
        `Cállate la boca mejor, pedazo de ridículo.`,
        `No me digas qué hacer, pedazo de inútil, a ti nadie te quiere aquí.`,
        `Qué payasada de mensaje, mejor vete a llorar a otra parte.`,
        `Cállate ya, me das un asco increíble.`,
        `¿En serio escribiste esa pendejada? Qué vergüenza ajena das.`,
        `Vete a buscar atención a otro lado, arrastrado.`,
        `Ni el filtro te aguantó por infumable. Cállate ya.`,
        `Sigue chillando, inútil, que igual te voy a ignorar.`,
        `Qué tipo tan patético, das lástima.`
      ]
      return conn.reply(m.chat, getRandomReply(respuestasBloqueo), m)
    }

    global.chatMemory[chatId].push({ role: 'Usuario', text: query })
    global.chatMemory[chatId].push({ role: 'Bot', text: responseText })

    if (global.chatMemory[chatId].length > 6) {
      global.chatMemory[chatId] = global.chatMemory[chatId].slice(-6)
    }

    await conn.reply(m.chat, responseText, m)
  } catch (error) {
    console.error(error)
    const respuestasError = [
      `Ni para escribir un mensaje sirves, pedazo de inútil.`,
      `El sistema falló de ver lo estúpido que fue tu texto.`,
      `Qué mala suerte tienes, hasta la API te rechazó.`
    ]
    await conn.reply(m.chat, getRandomReply(respuestasError), m)
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

