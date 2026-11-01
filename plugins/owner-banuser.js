let handler = async (m, { conn, args }) => {
    let user;
    let db = global.db.data.users;
    
    if (m.quoted) {
        user = m.quoted.sender;
    } else if (args.length >= 1) {
        user = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    } else {
        return await conn.reply(m.chat, `[ ℹ️ ] Etiqueta o responde al mensaje del usuario que quieras banear.`, m);
    }

    if (!db[user]) {
        db[user] = {
            exp: 0,
            limit: 0,
            lastclaim: 0,
            registered: false,
            name: 'Usuario',
            age: -1,
            regTime: -1,
            banned: false,
            banRazon: ''
        };
    }

    if (db[user].banned) {
        return await conn.reply(m.chat, `*[ ⚠️ ] Este usuario ya se encuentra baneado.*`, m);
    }
    
    db[user].banned = true;
    db[user].banRazon = args.slice(1).join(' ') || 'Sin razón especificada';
    
    let userNumber = user.split('@')[0];
    
    // Envío directo sin consultas de metadata
    await conn.reply(m.chat, `*[ ✅️ ] El usuario @${userNumber} ha sido baneado del bot.*`, m, { mentionedJid: [user] });
};

handler.help = ['banuser *<@tag>*'];
handler.command = ['banuser', 'ban'];
handler.tags = ['owner'];
handler.rowner = true;

export default handler;
