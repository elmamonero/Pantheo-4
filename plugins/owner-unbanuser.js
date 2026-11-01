let handler = async (m, { conn, args }) => {
    let user;
    let db = global.db.data.users;
    
    if (m.quoted) {
        user = m.quoted.sender;
    } else if (args.length >= 1) {
        user = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    } else {
        await conn.reply(m.chat, `[ ℹ️ ] Etiqueta o responde al mensaje del usuario que quieras desbanear.`, m);
        return;
    }

    let userName = 'Usuario';
    try {
        userName = await conn.getName(user);
    } catch {}

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

    db[user].banned = false;
    db[user].banRazon = '';
    
    let userNumber = user.split('@')[0];
    
    await conn.reply(m.chat, `*[ ✅️ ] El usuario @${userNumber} ha sido desbaneado.*`, m, { mentionedJid: [user] });
};

handler.help = ['unbanuser *<@tag>*'];
handler.command = ['unbanuser'];
handler.tags = ['owner'];
handler.rowner = true;

export default handler;
