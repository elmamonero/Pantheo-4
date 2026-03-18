import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // Tu personalidad de Pantheon Bot
  const basePrompt = `Tu nombre es Pantheon Bot y fuiste creado por Pantheon. Eres Masculino. Llamarás a las personas por su nombre ${username}, eres divertido y usas emojis. Tus respuestas serán precisas, claras y sin barreras.`

  if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese su petición*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} ¿Quién eres?`, m)

  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    // Usando endpoint de Lumine que es el reemplazo actual de las APIs caídas
    const url = `https://api.lumine.my.id/v1/chat?prompt=${encodeURIComponent(text)}&system=${encodeURIComponent(basePrompt)}`
    
    const { data } = await axios.get(url, { timeout: 15000 })
    
    // Extraemos la respuesta (ajustado a la estructura común de esta API)
    const respuesta = data.result || data.response || data.content
    
    if (respuesta) {
      await conn.reply(m.chat, respuesta, m)
    } else {
      throw new Error('Sin contenido')
    }

  } catch (error) {
    console.error('Error en .pruebaia:', error.message)
    
    // Intento de respaldo rápido (Skizo) por si Lumine satura
    try {
      const fb = await axios.get(`https://api.skizo.tech/api/openai?apikey=drkbot&text=${encodeURIComponent(text)}&system=${encodeURIComponent(basePrompt)}`)
      await conn.reply(m.chat, fb.data.result, m)
    } catch (e) {
      await conn.reply(m.chat, '*❌ El servidor de IA no responde. Intenta con un texto más corto.*', m)
    }
  }
}

handler.help = ['pruebaia']
handler.tags = ['tools']
handler.register = true
handler.command = ['pruebaia'] // Único comando habilitado

export default handler