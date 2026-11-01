let handler = async (m, { conn, args }) => {
    let user;
    let db = global.db.data.users;
    
    if (m.quoted) {
        user = m.quoted.sender;
    } else if (args.length >= 1) {
        user = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    } else {
        await conn.reply(m.chat, `[ ℹ️ ] Etiqueta o responde al mensaje del usuario que quieras banear.`, m);
        return;
    }

    // Obtenemos el nombre de forma segura con un try/catch
    let userName = 'Usuario';
    try {
        userName = await conn.getName(user);
    } catch {}

    // Si el usuario no existe en la base de datos, lo inicializamos automáticamente
    if (!db[user]) {
        db[user] = {
            exp: 0,
            limit: 0,
            lastclaim: 0,
            registered: false,
            name: userName,
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
    
    const nn = await conn.getName(m.sender).catch(() => 'Propietario');
    
    await conn.reply(m.chat, `*[ ✅️ ] El usuario \`${userName}\` ha sido baneado del bot.*`, m, { mentionedJid: [user] });
    
    try {
        await conn.reply('50587489794@s.whatsapp.net', `*[ ℹ️ ] El usuario \`${userName}\` (${user}) ha sido baneado por \`${nn}\`.*`, null);
    } catch {}
};

handler.help = ['banuser *<@tag>*'];
handler.command = ['banuser', 'ban'];
handler.tags = ['owner'];
handler.rowner = true;

export default handler;
