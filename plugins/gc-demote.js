const handler = async (m, { conn, usedPrefix, text }) => {
  let user;

  // 1. Prioridad: Si responde a un mensaje
  if (m.quoted) {
    user = m.quoted.sender;
  } 
  // 2. Segunda opción: Si menciona a alguien con @tag
  else if (m.mentionedJid && m.mentionedJid[0]) {
    user = m.mentionedJid[0];
  } 

  // Si no hay respuesta ni mención, enviamos mensaje de ayuda
  if (!user) {
    return conn.reply(m.chat, `*[ ℹ️ ] Debe responder a un mensaje o mencionar a un usuario (@tag) para quitarle el admin.*`, m);
  }

  try {
    const groupMetadata = await conn.groupMetadata(m.chat);
    
    // Verificación de seguridad: No intentar degradar al creador del grupo
    if (user === groupMetadata.owner) {
      return conn.reply(m.chat, `*[ ⚠️ ] No se puede degradar al creador del grupo.*`, m);
    }

    // Ejecutamos la acción de quitar admin (demote)
    await conn.groupParticipantsUpdate(m.chat, [user], 'demote');
    conn.reply(m.chat, `*[ ✅ ] Usuario degradado con éxito.*`, m);

  } catch (e) {
    console.error(e);
    conn.reply(m.chat, `*[ ❎ ] Hubo un error al intentar quitar el admin.*`, m);
  }
};

handler.help = ['demote @tag'];
handler.tags = ['grupo'];
handler.command = /^(demote|quitarpoder|quitaradmin|quitarpija)$/i;

handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;