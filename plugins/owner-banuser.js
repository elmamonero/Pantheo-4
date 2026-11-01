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

    if (db[user]) {
        if (db[user].banned) {
            return await conn.reply(m.chat, `*[ ⚠️ ] Este usuario ya se encuentra baneado.*`, m);
        }
        
        db[user].banned = true;
        db[user].banRazon = args.slice(1).join(' ') || 'Sin razón especificada';
        
        const nametag = await conn.getName(user);
        const nn = conn.getName(m.sender);
        
        await conn.reply(m.chat, `*[ ✅️ ] El usuario \`${nametag}\` ha sido baneado del bot.*`, m, { mentionedJid: [user] });
        
        // Notificación opcional al creador
        try {
            await conn.reply('50587489794@s.whatsapp.net', `*[ ℹ️ ] El usuario \`${nametag}\` (${user}) ha sido baneado por \`${nn}\`.*`, null);
        } catch {}
        
    } else {
        await conn.reply(m.chat, `*[ ⚠️ ] El usuario no está registrado en la base de datos.*`, m);
    }
};

handler.help = ['banuser *<@tag>*'];
handler.command = ['banuser', 'ban'];
handler.tags = ['owner'];
handler.rowner = true;

export default handler;
