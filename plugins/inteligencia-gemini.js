import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // PROMPT BURLÓN Y GROSERO
  const basePrompt = `Eres un bot de WhatsApp sumamente grosero, burlón, pesado y sarcástico. 
INSTRUCCIONES:
- Responde a ${username} con tono de burla pesado, humillante y ácida.
- Máximo 15 palabras por respuesta. Sé ultra cortante.
- Hazle sentir que su pregunta es una estupidez.
- Puedes usar jerga pesada y burlas directas, pero sin caer en censura extrema de la API.`

  try {
    let query = text || (m.quoted && (m.quoted.text || m.quoted.caption)) || null

    if (!query) {
      return conn.reply(m.chat, `*[ 🤖 ] Escribe algo, pedazo de inútil, no leo mentes.*`, m)
    }

    const response = await deliriusGPT(query, basePrompt)
    await conn.reply(m.chat, response, m)

  } catch (error) {
    console.error(error)
    await conn.reply(m.chat, `*[ ❌ ] Ni para escribir sirves, falló el sistema.*`, m)
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
