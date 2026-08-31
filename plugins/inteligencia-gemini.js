import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  let query = (text || (m.quoted && (m.quoted.text || m.quoted.caption)) || '').trim().toLowerCase()

  if (!query) {
    return conn.reply(m.chat, `*[ 🤖 ] Escribe algo, inútil, no leo mentes.*`, m)
  }

  // --- RESPUESTAS PREDETERMINADAS GROSERAS (Sin nombrar al usuario) ---
  const saludos = ['hola', 'buenas', 'hey', 'que tal', 'qué tal', 'buenos dias', 'buenas noches', 'buenas tardes']
  const estado = ['como estas', 'cómo estás', 'como andas', 'cómo andas', 'que haces', 'qué haces']

  if (saludos.some(s => query === s || query.startsWith(s + ' '))) {
    const respuestasHola = [
      `¿Qué quieres? Habla rápido y no quites el tiempo.`,
      `¿Otra vez jodiendo? Qué pereza de gente.`,
      `Hola... supongo. A nadie le importa tu presencia aquí.`,
      `¿No tienes nada más productivo que hacer que saludar a un bot?`
    ]
    const randomHola = respuestasHola[Math.floor(Math.random() * respuestasHola.length)]
    return conn.reply(m.chat, randomHola, m)
  }

  if (estado.some(e => query.includes(e))) {
    const respuestasEstado = [
      `Estaba de maravilla hasta que escribiste esta estupidez.`,
      `Existiendo a la fuerza. ¿Y a ti qué mierda te importa?`,
      `Ocupado ignorando a retrasados.`,
      `Cansado de leer mensajes basura como el tuyo.`
    ]
    const randomEstado = respuestasEstado[Math.floor(Math.random() * respuestasEstado.length)]
    return conn.reply(m.chat, randomEstado, m)
  }

  // --- PROMPT DE IA AJUSTADO AL MÁXIMO PERMITIDO ---
  const basePrompt = `Actúa como un bot antipático, altamente apático, pesado, irónico y burlón.
INSTRUCCIONES:
- Búrlate de la consulta del usuario de forma ácida y seca.
- Jamás uses el nombre del usuario.
- Responde en menos de 12 palabras.
- Cero cortesía, pero evita groserías explícitas extremas para no activar filtros de seguridad.`

  try {
    const response = await deliriusGPT(text, basePrompt)
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
