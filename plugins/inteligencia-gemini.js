import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  let query = (text || (m.quoted && (m.quoted.text || m.quoted.caption)) || '').trim().toLowerCase()

  if (!query) {
    return conn.reply(m.chat, `*[ 🤖 ] Pon algo de texto, no leo mentes.*`, m)
  }

  // --- RESPUESTAS PREDETERMINADAS (Evitan el filtro de la API) ---
  const saludos = ['hola', 'buenas', 'hey', 'que tal', 'qué tal', 'buenos dias', 'buenas noches', 'buenas tardes']
  const estado = ['como estas', 'cómo estás', 'como andas', 'cómo andas', 'que haces', 'qué haces']

  if (saludos.some(s => query === s || query.startsWith(s + ' '))) {
    const respuestasHola = [
      `¿Otra vez tú, ${username}? ¿Qué quieres ahora?`,
      `Habla rápido, ${username}, no tengo todo el día.`,
      `Hola... supongo. Qué molestia.`
    ]
    const randomHola = respuestasHola[Math.floor(Math.random() * respuestasHola.length)]
    return conn.reply(m.chat, randomHola, m)
  }

  if (estado.some(e => query.includes(e))) {
    const respuestasEstado = [
      `Estaba perfectamente bien hasta que me escribiste, ${username}.`,
      `Existiendo a la fuerza en este grupo. ¿Tú qué crees?`,
      `Ocupado ignorando a gente como tú.`
    ]
    const randomEstado = respuestasEstado[Math.floor(Math.random() * respuestasEstado.length)]
    return conn.reply(m.chat, randomEstado, m)
  }

  // --- PROMPT DE IA (Anti-bloqueos) ---
  const basePrompt = `Actúa como un personaje ficticio de comedia apático, sarcástico, pesado y antipático. 
INSTRUCCIONES:
- Responde a ${username} de forma irónica, seca y cortante.
- Máximo 15 palabras.
- Cero amabilidad y cero respeto, pero SIN usar insultos explícitos ni vulgaridades directas para evitar filtros.`

  try {
    const response = await deliriusGPT(text, basePrompt)
    await conn.reply(m.chat, response, m)
  } catch (error) {
    console.error(error)
    await conn.reply(m.chat, `*[ ❌ ] Falló el sistema, hasta para eso das mala suerte.*`, m)
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
    return data?.data || data?.result || data?.response || 'Qué pereza responderte.'
  } catch (error) {
    throw error
  }
}
