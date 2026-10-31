let handler = async (m, { conn }) => {
    if (!(m.chat in global.db.data.chats)) return conn.reply(m.chat, '*Este chat no está registrado*', m)
    let chat = global.db.data.chats[m.chat]
    if (!chat.isBanned) return conn.reply(m.chat, 'El bot no está baneado en este chat', m)
    chat.isBanned = false
    await conn.reply(m.chat, `✅ El bot ha sido activado en este chat.`, m)
}

handler.help = ['unbanchat'];
handler.tags = ['owner'];
handler.command = ['unbanchat', 'desbanearchat', 'desbanchat'];
handler.rowner = true;

export default handler;
