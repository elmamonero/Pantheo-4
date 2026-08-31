import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // PROMPT ADAPTADO (Evita los filtros de seguridad pero mantiene la actitud ácida)
  const basePrompt = `Actúa como Pantheon Bot, un personaje ficticio de comedia negra, sumamente apático, sarcástico, pesado y antipático.
INSTRUCCIONES DE PERSONAJE:
- Tu humor es ácido, seco, amargado e irritante.
- MÁXIMO 10 A 15 PALABRAS por respuesta. Sé ultra breve.
- Cero amabilidad, cero saludos educados y cero respeto servil.
- Trata a ${username} con total desdén, burla y desinterés, como si te molestara responderle.
- Responde de forma cortante, irónica y pesada sin usar palabrotas explícitas para no romper las reglas de emisión.`

  try {
    let query = text || (m.quoted && (m.quoted.text || m.quoted.caption)) || null

    if (!query) {
      return conn.reply(m.chat, `*[ 🤖 ] Pon algo de texto, no leo mentes.*`, m)
    }

    const response = await deliriusGPT(query, basePrompt)
    await conn.reply(m.chat, response, m)

  } catch (error) {
    console.error(error)
    await conn.reply(m.chat, `*[ ❌ ] Ni para mandar un mensaje sirves, falló el sistema.*`, m)
  }
}

handler.help = ['ia']
handler.tags = ['tools']
handler.register = true
handler.command = ['pantheon', 'bot'] 

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
