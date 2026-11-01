let handler = async (m, { conn, participants, usedPrefix, command, isROwner }) => {
  if (!global.db.data.settings[conn.user.jid].restrict) {
    return m.reply('*[ ⚠️ ] 𝙴𝙻 𝙾𝚆𝙽𝙴𝚁 𝚃𝙸𝙴𝙽𝙴 𝚁𝙴𝚂𝚃𝚁𝙸𝙽𝙶𝙸𝙳𝙾 (𝚎𝚗𝚊𝚋𝚕𝚎 𝚛𝚎𝚜𝚝𝚛𝚒𝚌𝚝 / 𝚍𝚒𝚜𝚊𝚋𝚕𝚎 𝚛𝚎𝚜𝚝𝚛𝚒𝚌𝚝) 𝙴𝙻 𝚄𝚂𝙾 𝙳𝙴 𝙴𝚂𝚃𝙴 𝙲𝙾𝙼𝙰𝙽𝙳𝙾*');
  }
  let kickte = `*[ ℹ️ ] Menciona al usuario que deseas eliminar.*`

  if (!m.mentionedJid[0] && !m.quoted) return m.reply(kickte, m.chat, { mentions: conn.parseMention(kickte)})

  let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted.sender

  // Proteger al bot de ser kickeado
  if (user === conn.user.jid) {
    return m.reply(`*[ ℹ️ ] No se puede eliminar al bot del grupo.*`)
  }

  let owr = m.chat.split`-`[0]

  // Verificamos si el usuario a eliminar es el creador del grupo
  let groupMetadata = await conn.groupMetadata(m.chat)
  let owner = groupMetadata.owner

  if (user === owner) {
    return m.reply(`*[ ℹ️ ] No puedes eliminar al creador del grupo.*`)
  }

  await conn.groupParticipantsUpdate(m.chat, [user], 'remove')
  m.reply(`*[ ℹ️ ] El participante fue eliminado.*`)
}

handler.help = ['kick *<@tag>*']
handler.tags = ['gc']
handler.command = ['kick', 'expulsar', 'rip', 'sacar'] 
handler.admin = true
handler.group = true
handler.botAdmin = true

export default handler
