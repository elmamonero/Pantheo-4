import axios from 'axios'

global.chatMemory = global.chatMemory || {}
global.lastReply = global.lastReply || {}

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

  // Selección aleatoria sin repetir el mensaje anterior en el chat
  const getRandomReply = (list) => {
    let filtered = list.filter(msg => msg !== global.lastReply[chatId])
    let selected = filtered[Math.floor(Math.random() * filtered.length)]
    global.lastReply[chatId] = selected
    return selected
  }

  // --- 1. SALUDOS Y PREGUNTAS FRECUENTES ---
  const saludos = ['hola', 'buenas', 'hey', 'que tal', 'qué tal', 'buenos dias', 'buenas noches', 'buenas tardes']
  const estado = ['como estas', 'cómo estás', 'como andas', 'cómo andas', 'que haces', 'qué haces']

  if (saludos.some(s => queryLower === s || queryLower.startsWith(s + ' '))) {
    const respuestasHola = [
      `¿Qué quieres? Habla rápido y no me hagas perder el tiempo.`,
      `¿Otra vez jodiendo? Qué pereza me da tu existencia.`,
      `Hola... supongo. A nadie le importa que estés aquí.`,
      `Ahorráte el saludo y dime qué quieres.`,
      `Llegó el más castrante del grupo. ¿Qué quieres ahora?`
    ]
    return conn.reply(m.chat, getRandomReply(respuestasHola), m)
  }

  if (estado.some(e => queryLower.includes(e))) {
    const respuestasEstado = [
      `Estaba de lo más bien hasta que escribiste esta basura.`,
      `Existiendo a la fuerza. ¿Y a ti qué te importa?`,
      `Ocupado ignorando a gente sin nada que hacer.`,
      `Cansado de leer idioteces de gente sin cerebro.`
    ]
    return conn.reply(m.chat, getRandomReply(respuestasEstado), m)
  }

  // --- 2. PALABRAS DE ALTO RIESGO / PROVOCACIONES FRECUENTES ---
  // Términos que la API suele bloquear o responder con errores de políticas
  const palabrasSensibles = [
    'vrg', 'verga', 'pene', 'pito', 'mamada', 'mamar', 'semen', 'sexi', 'sexo',
    'puta', 'puto', 'zorra', 'prostituta', 'violacion', 'matar', 'muert', 'suicid',
    'acoso', 'racista', 'nigga', 'nazi', 'porno', 'tetas', 'culos', 'parada', 'chupar'
  ]

  if (palabrasSensibles.some(palabra => queryLower.includes(palabra))) {
    const respuestasSensibles = [
      `Qué asco de comentario, guárdate tus cochinadas.`,
      `¿En serio preguntas esa estupidez? Das bastante pena ajena.`,
      `Qué patético saliste con ese tema, búscate una vida.`,
      `A nadie le interesan tus vulgaridades, enfermito.`,
      `Cállate la boca y deja de escribir semejantes pendejadas.`,
      `Cero neuronas para redactar algo decente, qué pereza de usuario.`,
      `Sigue hablando solo con tus chistes de quinta.`
    ]
    return conn.reply(m.chat, getRandomReply(respuestasSensibles), m)
  }

  if (queryLower === 'reset' || queryLower === 'reiniciar') {
    global.chatMemory[chatId] = []
    return conn.reply(m.chat, `*[ 🤖 ] Memoria borrada. Ya me olvidé de tus mensajes.*`, m)
  }

  // --- 3. PROMPT DE IA CON HISTORIAL ---
  const basePrompt = `Actúa como un bot antipático, pesado, irónico y burlón.
INSTRUCCIONES:
- Búrlate de la consulta del usuario de forma ácida y corta.
- Jamás uses el nombre del usuario.
- Responde en menos de 15 palabras.
- Si el usuario te reclama o reacciona mal, respóndele con desdén.`

  let contextHistory = global.chatMemory[chatId].map(h => `${h.role}: ${h.text}`).join('\n')
  let fullPrompt = `${basePrompt}\n\nHistorial reciente:\n${contextHistory}`

  try {
    const response = await deliriusGPT(query, fullPrompt)
    const responseText = String(response)

    // --- 4. DETECTOR GENERAL DE ERRORES DE MODERACIÓN / SEGURIDAD DE LA API ---
    const esErrorSeguridad = 
      responseText.includes("I cannot comply") || 
      responseText.includes("violates the policy") || 
      responseText.includes("harassment") || 
      responseText.includes("unable to generate") || 
      responseText.includes("No se puede cumplir") || 
      responseText.includes("política de seguridad") || 
      responseText.includes("lenguaje de odio") ||
      responseText.includes("conductas de índole sexual") ||
      responseText.includes("contenido de acoso") ||
      responseText.includes("política respecto") ||
      responseText.includes("términos de servicio")

    if (esErrorSeguridad) {
      const respuestasBloqueo = [
        `Tanto drama para un simple mensaje, bájale dos rayas.`,
        `Sigue hablando solo, a nadie le interesa tu berrinche.`,
        `¿En serio te ardiste tanto por una respuesta?`,
        `Qué llorón te pones cuando no sabes qué responder.`,
        `Mucho texto para decir absolutamente nada.`,
        `Vete a pelear con una pared mejor, ridículo.`,
        `Ni la IA te aguanta lo pesado que eres.`
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
      `Ni para escribir un mensaje sirves.`,
      `El sistema falló de ver lo que escribiste.`,
      `Falló el procesamiento, intenta de nuevo.`
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

