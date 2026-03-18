import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // Personalidad de Pantheon Bot
  const basePrompt = `Tu nombre es Pantheon Bot y fuiste creado por Pantheon. Eres Masculino. Llamarás a las personas por su nombre ${username}, eres divertido y usas emojis. Tus respuestas serán precisas, claras y sin barreras.`

  if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese su petición*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} ¿Quién eres?`, m)

  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    // Unimos el prompt del sistema con la pregunta del usuario para que la IA sepa quién es
    const fullPrompt = `${basePrompt}\n\nUsuario: ${text}`
    
    // Construcción de la URL para la API de Nex-Magical (Meta)
    const url = `https://nex-magical.vercel.app/ai/meta?text=${encodeURIComponent(fullPrompt)}`
    
    const { data } = await axios.get(url, { timeout: 20000 })
    
    // Esta API suele devolver el texto directamente en una propiedad 'result' o 'response'
    // Basado en el formato estándar de Nex-Magical:
    const respuesta = data.result || data.response || data.content

    if (respuesta) {
      await conn.reply(m.chat, respuesta.trim(), m)
    } else {
      throw new Error('No se recibió respuesta del servidor')
    }

  } catch (error) {
    console.error('Error en API Meta:', error.message)
    
    // RESPALDO: Si Nex-Magical falla, intentamos con tu respaldo de Skizo
    try {
      const fb = await axios.get(`https://api.skizo.tech/api/openai?apikey=drkbot&text=${encodeURIComponent(text)}&system=${encodeURIComponent(basePrompt)}`)
      if (fb.data && fb.data.result) {
        await conn.reply(m.chat, fb.data.result + "\n\n*(Nota: Servidor de respaldo activado 🔄)*", m)
      } else {
        throw new Error('Fallo total')
      }
    } catch (e) {
      await conn.reply(m.chat, '*❌ Los servidores de IA están en mantenimiento. Intenta de nuevo más tarde.*', m)
    }
  }
}

handler.help = ['pruebaia']
handler.tags = ['tools']
handler.register = true
handler.command = ['pruebaia'] 

export default handler