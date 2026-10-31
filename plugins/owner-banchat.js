let handler = async (m, { conn }) => {
    if (!(m.chat in global.db.data.chats)) return conn.reply(m.chat, '*Este chat no está registrado*', m)
    let chat = global.db.data.chats[m.chat]
    if (chat.isBanned) return conn.reply(m.chat, 'El bot ya está baneado en este chat', m)
    chat.isBanned = true
    await conn.reply(m.chat, `❌ El bot ha sido desactivado en este chat.`, m)
}

handler.help = ['banchat'];
handler.tags = ['owner'];
handler.command = ['banchat', 'banearchat'];
handler.rowner = true;

export default handler;
