let handler = async (m, { conn, participants }) => {
    // 1. Filtrar solo a los que NO son admins y NO son el bot
    const botId = conn.user.jid || conn.user.id;
    const gNoAdmins = participants.filter(p => !p.admin && p.id !== botId);

    if (gNoAdmins.length === 0) {
        return m.reply('*[ ⚠️ ] No hay usuarios comunes para eliminar. Todos aquí son intocables (Admins).*');
    }

    try {
        await m.react('🎰');

        // 2. Mensaje inicial de la ruleta
        let msg = await conn.reply(m.chat, '*[ 🎰 ] La ruleta de la muerte está girando...*', m);

        // Animación de edición para generar suspenso
        const frames = [
            '*[ 🎰 ] ⚪ Girando...*',
            '*[ 🎰 ] ⚫ Girando...*',
            '*[ 🎰 ] 🔴 ¡SE DETUVO!*'
        ];

        for (let frame of frames) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            await conn.sendMessage(m.chat, { text: frame, edit: msg.key });
        }

        // 3. Elección 100% aleatoria
        const victimIndex = Math.floor(Math.random() * gNoAdmins.length);
        const victim = gNoAdmins[victimIndex].id;
        const tag = `@${victim.split('@')[0]}`;

        // 4. Anuncio del perdedor
        await new Promise(resolve => setTimeout(resolve, 1000));
        await conn.sendMessage(m.chat, { 
            text: `*[ 🎰 ] El destino ha hablado:*\n\n${tag}\n\n😈 *¡Fuera del grupo!*`, 
            mentions: [victim] 
        }, { quoted: m });

        // Espera dramática antes del ban
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 5. Ejecución (Eliminar usuario)
        await conn.groupParticipantsUpdate(m.chat, [victim], 'remove');

        // Reacción final de éxito (Sin mensaje extra de spam)
        await m.react('✅');

    } catch (e) {
        console.error(e);
        await m.react('✖️');
        m.reply('*[ ✖️ ] No pude eliminar al usuario. Revisa mis permisos de Admin.*');
    }
};

handler.help = ['ruletaban'];
handler.tags = ['fun'];
handler.command = /^(ruletaban|rban)$/i;

handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
