import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // Configuración de personalidad de Pantheon Bot
  const basePrompt = `Tu nombre es Pantheon Bot y fuiste creado por Pantheon. Eres Masculino. Llamarás a las personas por su nombre ${username}, eres divertido y usas emojis. Tus respuestas serán precisas, claras y sin barreras.`

  if (!text) return conn.reply(m.chat, `*[ 🤖 ] Ingrese su petición*\n\n*[ 💡 ] Ejemplo:* ${usedPrefix + command} ¿Quién eres?`, m)

  await conn.sendPresenceUpdate('composing', m.chat)

  try {
    // Estructura de mensajes para la API de Amazon
    const messages = [
      { role: "system", content: basePrompt },
      { role: "user", content: text }
    ]

    // Construcción de parámetros exactos: query (JSON) y link
    const params = new URLSearchParams({
      query: JSON.stringify(messages),
      link: "writecream.com"
    })

    const url = `https://8pe3nv3qha.execute-api.us-east-1.amazonaws.com/default/llm_chat?${params.toString()}`
    
    const { data } = await axios.get(url, { 
      headers: { 'Accept': 'application/json' },
      timeout: 15000 
    })
    
    // Esta API devuelve el contenido en 'response_content'
    const respuesta = data.response_content

    if (respuesta && respuesta !== "-") {
      await conn.reply(m.chat, respuesta.trim(), m)
    } else {
      throw new Error('Respuesta vacía de Amazon API')
    }

  } catch (error) {
    console.error('Error en API Principal:', error.message)
    
    // RESPALDO (Fallback): Si la de Amazon falla, intenta con Skizo como tenías antes
    try {
      const fb = await axios.get(`https://api.skizo.tech/api/openai?apikey=drkbot&text=${encodeURIComponent(text)}&system=${encodeURIComponent(basePrompt)}`)
      if (fb.data && fb.data.result) {
        await conn.reply(m.chat, fb.data.result + "\n\n*(Nota: Usando motor de respaldo 🔄)*", m)
      } else {
        throw new Error('Fallo también el respaldo')
      }
    } catch (e) {
      await conn.reply(m.chat, '*❌ Todos los servidores de IA están saturados. Intenta de nuevo en unos minutos.*', m)
    }
  }
}

handler.help = ['pruebaia']
handler.tags = ['tools']
handler.register = true
handler.command = ['pruebaia'] 

export default handler