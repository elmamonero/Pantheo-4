var handler = async (m, { conn, usedPrefix, command, text }) => {
  let user;

  // 1. Prioridad: Si el usuario responde a un mensaje
  if (m.quoted) {
    user = m.quoted.sender;
  } 
  // 2. Segunda opción: Si el usuario menciona a alguien con @tag
  else if (m.mentionedJid && m.mentionedJid[0]) {
    user = m.mentionedJid[0];
  } 

  // Si no se detectó respuesta ni mención, enviamos el mensaje de ayuda
  if (!user) {
    return conn.reply(m.chat, `✨ *Debe responder a un mensaje o mencionar a una persona (@tag) para usar este comando.*`, m);
  }

  try {
    // Ejecutamos la promoción en el grupo
    await conn.groupParticipantsUpdate(m.chat, [user], 'promote');
    conn.reply(m.chat, `✅ *¡Listo! El usuario ahora es administrador.*`, m);
  } catch (e) {
    console.error(e);
    conn.reply(m.chat, `❎ *Hubo un error al intentar dar admin. Verifica que el usuario siga en el grupo.*`, m);
  }
};

handler.help = ['promote'];
handler.tags = ['grupo'];
handler.command = ['promote', 'darpija', 'promover'];

handler.group = true;
handler.admin = true;
handler.botAdmin = true;
handler.fail = null;

export default handler;