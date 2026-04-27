const handler = async (m, { conn, isAdmin, isOwner, args, usedPrefix, command }) => {
  if (!(isAdmin || isOwner)) {
    global.dfail('admin', m, conn);
    throw false;
  }

  const isClose = {
    'open': 'not_announcement',
    'buka': 'not_announcement',
    'on': 'not_announcement',
    '1': 'not_announcement',
    'close': 'announcement',
    'tutup': 'announcement',
    'off': 'announcement',
    '0': 'announcement',
  }[(args[0] || '').toLowerCase()];

  if (isClose === undefined || !args[1]) {
    const caption = `
*[ ℹ️ ] Formato incorrecto.*

*Ejemplos:*
${usedPrefix + command} open 30s (30 segundos)
${usedPrefix + command} close 10m** (10 minutos)
${usedPrefix + command} open 1h (1 hora)

> Si no usas letra, se contará como horas.
`;
    m.reply(caption);
    throw false;
  }

  // Lógica para detectar s, m, h
  const timeArg = args[1].toLowerCase();
  const match = timeArg.match(/^(\d+)([smh]?)$/);
  
  if (!match) {
    m.reply('❌ Formato de tiempo inválido. Usa números seguidos de s, m o h.');
    throw false;
  }

  const value = parseInt(match[1]);
  const unit = match[2] || 'h'; // Por defecto horas si no hay unidad
  
  let timeoutset;
  switch (unit) {
    case 's': timeoutset = value * 1000; break;
    case 'm': timeoutset = value * 60 * 1000; break;
    case 'h': timeoutset = value * 3600 * 1000; break;
    default: timeoutset = value * 3600 * 1000;
  }

  await conn.groupSettingUpdate(m.chat, isClose).then(async (_) => {
    m.reply(`*[ ⚠️ ] Grupo ${isClose == 'announcement' ? 'cerrado' : 'abierto'} durante* \`\`\`${clockString(timeoutset)}\`\`\``);
  });

  if (timeoutset > 0) {
    setTimeout(async () => {
      const reverseSetting = isClose == 'announcement' ? 'not_announcement' : 'announcement';
      await conn.groupSettingUpdate(m.chat, reverseSetting).then(async (_) => {
        conn.reply(m.chat, `*[ ℹ️ ] Tiempo cumplido. El grupo se ha ${reverseSetting == 'announcement' ? 'cerrado' : 'abierto'} automáticamente.*`);
      });
    }, timeoutset);
  }
};

handler.help = ['grouptime *<open/close>* *<tiempo>*'];
handler.tags = ['gc'];
handler.command = /^(grouptime|gctime)$/i;
handler.botAdmin = true;
handler.admin = true;
handler.group = true;

export default handler;

function clockString(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
}
