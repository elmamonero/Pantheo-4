let handler = async (m, { conn, participants }) => {
    // Filtrar administradores
    const gAdmins = participants.filter(p => p.admin);
    const botId = conn.user.jid || conn.user.id;
    
    // gNoAdmins: Filtramos para que NO sea el bot, NO sea admin y NO sea el creador del grupo
    const gNoAdmins = participants.filter(p => !p.admin && p.id !== botId);

    if (gNoAdmins.length === 0) {
        return m.reply('*[ ⚠️ ] No hay usuarios (no admins) disponibles en este grupo para jugar.*');
    }

    try {
        m.react('🎰');

        // Enviar mensaje inicial (Corregida la coma que faltaba)
        let msg = await conn.reply(m.chat, '*[ 🎰 ] La ruleta está comenzando a girar...*', m);

        // Pequeña cuenta regresiva/animación editando el mensaje
        const countdown = [
            '*[ 🎰 ] ⚪ La ruleta gira...*',
            '*[ 🎰 ] ⚫ La ruleta gira...*',
            '*[ 🎰 ] 🔴 ¡Ya casi se detiene!*'
        ];

        for (let i = 0; i < countdown.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            await conn.sendMessage(m.chat, { text: countdown[i], edit: msg.key });
        }

        // Elegir usuario aleatorio de la lista de NO administradores
        const randomUser = gNoAdmins[Math.floor(Math.random() * gNoAdmins.length)].id;
        
        // Formatear mención
        const mention = `@${randomUser.split('@')[0]}`;

        // Anunciar al elegido
        await new Promise(resolve => setTimeout(resolve, 1000));
        await conn.sendMessage(m.chat, { 
            text: `*[ 🎰 ] La ruleta ha elegido a:*\n\n${mention}\n\n😈 *¡Adiós, nos vemos en el lobby!*`, 
            mentions: [randomUser] 
        }, { quoted: m });

        // Esperar para dramatismo
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Eliminar al usuario
        await conn.groupParticipantsUpdate(m.chat, [randomUser], 'remove');

        // Mensaje final
        await conn.reply(m.chat, `*Bueno, un usuario menos. La limpieza ha terminado 👻*`, null);
        m.react('✅');

    } catch (e) {
        console.error(e);
        m.reply('*[ ✖️ ] Hubo un error al intentar ejecutar la ruleta.*');
    }
};

handler.help = ['ruletaban'];
handler.tags = ['fun'];
handler.command = /^(ruletaban|rban)$/i;

handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
