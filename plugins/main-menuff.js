// By WillZek   

let handler = async (m, { conn, usedPrefix }) => {  

    let ff = `👑 𝗠𝗘𝗡𝗨 𝗙𝗥𝗘𝗘 𝗙𝗜𝗥𝗘 👑  
    〔 👑 𝙁𝙍𝙀𝙀 𝙁𝙄𝙍𝙀 👑 〕  
    ╭───── • 🌟 • ─────╮  
    ├❧ 🎫 ${usedPrefix}donarsala  
    ├❧ 🎟 ${usedPrefix}sorteo  
    ├❧ 🗼 ${usedPrefix}bermuda  
    ├❧ 🏜 ${usedPrefix}kalahari  
    ├❧ 🏝 ${usedPrefix}purgatorio  
    ├❧ 🥊 ${usedPrefix}cuadrilatero  
    ╰───── • 🌟 • ─────╯  
    
    ⇝ ⚔ LISTAS VERSUS ⚔ ⇜  
    ╭───── • 🌟 • ─────╮  
    ├❧ 📜 ${usedPrefix}vs4  
    ├❧ 📜 ${usedPrefix}vs6  
    ├❧ 📜 ${usedPrefix}vs8  
    ├❧ 📜 ${usedPrefix}vs12  
    ├❧ 📜 ${usedPrefix}vs16  
    ├❧ 📜 ${usedPrefix}vs20  
    ├❧ 📜 ${usedPrefix}vs24  
    ├❧ 📜 ${usedPrefix}interna4  
    ├❧ 📜 ${usedPrefix}interna6  
    ├❧ 🌸 ${usedPrefix}vs4fem  
    ├❧ 🌸 ${usedPrefix}vs6fem  
    ├❧ 🌸 ${usedPrefix}vs8fem  
    ├❧ 🌸 ${usedPrefix}vs12fem  
    ├❧ 🌸 ${usedPrefix}vs16fem  
    ├❧ 🌸 ${usedPrefix}vs20fem  
    ├❧ 🌸 ${usedPrefix}vs24fem  
    ├❧ 💖 ${usedPrefix}interna4fem  
    ├❧ 💖 ${usedPrefix}interna6fem  
    ├❧ 🔷 ${usedPrefix}hexagonal  
    ├❧ 🏆 ${usedPrefix}scrim  
    ├❧ 🥇 ${usedPrefix}guerra  
    ╰───── • 🌟 • ─────╯  
    
    ⇝ 📋 REGLAS VERSUS 📋 ⇜  
    ╭───── • 🌟 • ─────╮  
    ├❧ 📑 ${usedPrefix}reglasclk  
    ├❧ 📜 ${usedPrefix}reglascuadri  
    ├❧ 👑 ${usedPrefix}reglastreino  
    ├❧ 🏰 ${usedPrefix}reglas8imperios  
    ├❧ 👺 ${usedPrefix}reglasapostado  
    ├❧ 🎮 ${usedPrefix}reglaslideres  
    ├❧ 🎮 ${usedPrefix}reglaslideres2  
    ╰───── • 🌟 • ─────╯`;  

    let img = 'https://files.evogb.win/ES9dd5.jpg';  

    conn.sendMessage(m.chat, {  
        text: ff,  
        contextInfo: {  
            externalAdReply: {  
                title: '𓂂𓏸  𐅹੭੭ ᴍᴇɴᴜ ᴅᴇ ғʀᴇᴇ ғɪʀᴇ 🌙 ᦡᦡ',  
                body: dev,  
                thumbnailUrl: img,  
                sourceUrl: redes,  
                mediaType: 1,  
                renderLargerThumbnail: true  
            }  
        }  
    }, { quoted: fkontak });  
    
    m.react('🔫');  
}  

handler.help = ['menuff (Menu Free Fire)'];  
handler.tag = ['crow'];  
handler.command = ['menuff'];  

export default handler;  
