import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // LÓGICA DE PERSONALIDAD DINÁMICA
  const basePrompt = `Tu nombre es Pantheon Bot, creado por Pantheon. 
  Tu personalidad es dual:
  1. Si el usuario te pide investigar, tareas, dudas serias, científicas o educativas, responde de forma SERIA, PROFESIONAL, educada y muy clara.
  2. Si el usuario te habla de forma casual, bromas o preguntas comunes, responde de forma SARCÁSTICA, bromista y un poco ácida (pero sin pasarte).
  3. IMPORTANTE: No saludes siempre. Si ya hay una conversación o si la pregunta es directa, ve al grano sin decir "Hola". 
  4. Tus respuestas deben ser cortas y precisas a menos que la investigación requiera más detalle.
  5. Llama al usuario por su nombre (${username}) solo cuando sea necesario o para burlarte en el modo sarcástico.`

  try {
    // Definimos el query de forma segura
    let query = text || (m.quoted && (m.quoted.text || m.quoted.caption)) || null

    if (!query) {
      return conn.reply(m.chat, `*[ 🤖 ] ¿Qué quieres? No escribiste nada.*\n\n*Ejemplo:* ${usedPrefix + command} ¿Cuál es la capital de Francia?`, m)
    }

    // Efecto de "escribiendo"
    await conn.sendPresenceUpdate('composing', m.chat)

    // Llamada a la API de Sylphy (Gemini)
    const response = await sylphyGemini(query, basePrompt)
    
    // Enviamos la respuesta final
    await conn.reply(m.chat, response, m)

  } catch (error) {
    console.error(error)
    // Enviar detalle del error por WhatsApp si algo falla
    const errorMessage = `*[ ❌ ] ERROR EN EL SISTEMA*\n\n` +
                         `*Tipo:* ${error.name}\n` +
                         `*Mensaje:* ${error.message}\n` +
                         `*Comando:* ${usedPrefix + command}`
    
    await conn.reply(m.chat, errorMessage, m)
  }
}

handler.help = ['ia']
handler.tags = ['tools']
handler.register = true
handler.command = ['ia', 'ai', 'pantheon', 'bot'] 

export default handler

/**
 * Función para conectar con la API de Sylphy (Gemini)
 */
async function sylphyGemini(query, prompt) {
  try {
    const apiKey = 'sylphy-KthGG9y'
    const url = `https://sylphy.xyz/ai/gemini?q=${encodeURIComponent(query)}&prompt=${encodeURIComponent(prompt)}&api_key=${apiKey}`
    
    const response = await axios.get(url)
    
    // Ruta del JSON: response.data.result.text
    const result = response.data?.result?.text || response.data?.result || response.data?.response
    
    if (!result) {
      throw new Error('La IA no generó una respuesta válida.')
    }
    
    return result
  } catch (error) {
    throw error
  }
}