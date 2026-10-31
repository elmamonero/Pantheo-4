let handler = async (m, { conn, usedPrefix, command }) => {
    let txt = `╭━━━〔 👑 **PANEL DE CREADOR** 👑 〕━━━⬣\n`
    txt += `┃ Hola, Propietario. Aquí tienes los\n`
    txt += `┃ comandos de control y moderación.\n`
    txt += `╰━━━━━━━━━━━━━━━━━━━━━━⬣\n\n`

    // --- SECCIÓN 1: SISTEMA Y CONTROL (Máxima prioridad) ---
    txt += `┌───「 ⚙️ **SISTEMA Y CONTROL** 」\n`
    txt += `▢ ${usedPrefix}restart\n`
    txt += `   └ Reinicia el bot por completo.\n`
    txt += `▢ ${usedPrefix}update\n`
    txt += `   └ Actualiza los archivos del bot.\n`
    txt += `▢ ${usedPrefix}rev\n`
    txt += `   └ Evalúa código JS rápidamente.\n`
    txt += `└─────────────────────⬣\n\n`

    // --- SECCIÓN 2: MODERACIÓN Y GRUPOS ---
    txt += `┌───「 🛡️ **MODERACIÓN Y GRUPOS** 」\n`
    txt += `▢ ${usedPrefix}banchat / ${usedPrefix}unbanchat\n`
    txt += `   └ Bloquea o desbloquea el bot en un chat.\n`
    txt += `▢ ${usedPrefix}autoadmin\n`
    txt += `   └ Otorga admin al bot en el grupo.\n`
    txt += `▢ ${usedPrefix}blocklist\n`
    txt += `   └ Administra la lista negra de usuarios.\n`
    txt += `▢ ${usedPrefix}join <enlace>\n`
    txt += `   └ Obliga al bot a unirse a un grupo.\n`
    txt += `▢ ${usedPrefix}salir\n`
    txt += `   └ Hace que el bot abandone el grupo.\n`
    txt += `└─────────────────────⬣\n\n`

    // --- SECCIÓN 3: UTILIDADES Y EXTRAS ---
    txt += `┌───「 ⚡ **EXTRAS Y MONITOREO** 」\n`
    txt += `▢ ${usedPrefix}grouplist\n`
    txt += `   └ Muestra la lista de grupos activos.\n`
    txt += `▢ ${usedPrefix}chetar\n`
    txt += `   └ Ejecuta comandos de optimización.\n`
    txt += `└─────────────────────⬣\n\n`

    txt += `> 📌 *Panel de control del bot.*`;

    await conn.reply(m.chat, txt, m, { 
        contextInfo: { 
            mentionedJid: [m.sender],
            externalAdReply: {
                title: '👑 M E N U • C R E A D O R 👑',
                body: 'Panel de Control Avanzado',
                thumbnailUrl: 'https://qu.ax/XqWJ.jpg',
                sourceUrl: '',
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    });
}

handler.help = ['menuowner', 'menucreador'];
handler.tags = ['owner'];
handler.command = ['menuowner', 'menucreador'];
handler.rowner = true; 

export default handler;
