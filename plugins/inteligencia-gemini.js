import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const username = conn.getName(m.sender)
  
  // PERSONALIDAD AJUSTADA: Ultra-directo, minimalista y dual.
  const basePrompt = `Tu nombre es Pantheon Bot, creado por Pantheon. 
  REGLAS CRÍTICAS DE RESPUESTA:
  1. RESPUESTAS ULTRA CORTAS: Si el usuario dice "Hola", "Qué haces" o cosas casuales, responde con MÁXIMO 10 palabras. No rellenes con texto innecesario.
  2. NO SALUDES SIEMPRE: Ve directo al grano. Si te saludan, responde algo corto y sarcástico sin decir "Hola" obligatoriamente.
  3. MODO INVESTIGACIÓN: Solo si te piden una tarea o investigación seria, puedes usar más texto, pero mantente profesional y directo.
  4. MODO CASUAL: Sé bromista, ácido y un poco grosero, pero muy breve. 
  5. Llama al usuario ${username} solo si vas a burlarte o es estrictamente necesario.`

  try {
    // Definimos el query de forma segura
    let query = text || (m.quoted && (m.quoted.text || m.quoted.caption)) || null

    if (!query) {
      return conn.reply(m.chat, `*[ 🤖 ] Escribe algo, no soy adivino.*\n\n*Ejemplo:* ${usedPrefix + command} ¿Qué haces?`, m)
    }

    // Efecto de "escribiendo"
    await conn.sendPresenceUpdate('composing', m.chat)

    // Llamada a la API de Sylphy (Gemini)
    const response = await sylphyGemini(query, basePrompt)
    
    // Enviamos la respuesta final
    await conn.reply(m.chat, response, m)

  } catch (error) {
    console.error(error)
    // Enviar detalle del error por WhatsApp
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
      throw new Error('La IA no respondió nada.')
    }
    
    return result
  } catch (error) {
    throw error
  }
}