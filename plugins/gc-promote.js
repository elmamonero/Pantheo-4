var handler = async (m, { conn, usedPrefix, command, text }) => {
  let user;

  // 1. Prioridad: Si responde a un mensaje
  if (m.quoted) {
    user = m.quoted.sender;
  } 
  // 2. Segunda opción: Si menciona a alguien con @
  else if (m.mentionedJid && m.mentionedJid[0]) {
    user = m.mentionedJid[0];
  } 
  // 3. Tercera opción: Si escribe el número manualmente en el texto
  else if (text) {
    let number = text.replace(/[^0-9]/g, '');
    if (number.length > 0) {
      user = number + '@s.whatsapp.net';
    }
  }

  // Si no se encontró ningún usuario válido
  if (!user) return conn.reply(m.chat, `[🌠] *Debe responder a un mensaje, mencionar a alguien o escribir su número para darle Admin.*`, m);

  try {
    await conn.groupParticipantsUpdate(m.chat, [user], 'promote');
    conn.reply(m.chat, `✅ *Usuario promovido a Admin con éxito.*`, m);
  } catch (e) {
    console.error(e);
    conn.reply(m.chat, `❎ *No se pudo dar admin. Asegúrate de que el usuario siga en el grupo.*`, m);
  }
};

handler.help = ['promote'];
handler.tags = ['grupo'];
// Recordatorio: Según tu preferencia, si este es el comando de menú, usarías .menuprueba
// Pero como este es el comando de 'promote', mantenemos sus nombres originales.
handler.command = ['promote', 'darpija', 'promover'];

handler.group = true;
handler.admin = true;
handler.botAdmin = true;
handler.fail = null;

export default handler;