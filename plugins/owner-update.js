import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

let handler = async (m, { conn, text }) => {
    await m.react('🕓')
    
    try {
        const command = 'git pull' + (m.fromMe && text ? ' ' + text : '')
        
        // Se ejecuta de manera asíncrona sin bloquear el bot
        const { stdout, stderr } = await execPromise(command)
        
        const output = stdout || stderr || 'Sin salida de texto.'
        
        await conn.reply(m.chat, `《★》𝘼𝙘𝙩𝙪𝙖𝙡𝙞𝙯𝙖𝙙𝙤 𝘾𝙤𝙣 𝙀𝙭𝙞𝙩𝙤 ✔\n\n${output.trim()}`, m)
        await m.react('✅')
    } catch (error) {
        console.error(error)
        await conn.reply(m.chat, `《❌》 Error durante la actualización:\n\n${error.message}`, m)
        await m.react('❌')
    }
}

handler.help = ['update']
handler.tags = ['owner']
handler.command = ['update', 'actualizar', 'fix', 'fixed'] 
handler.rowner = true

export default handler
