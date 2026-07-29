import fs from 'fs';

const handler = async (m, { conn, text }) => {
  const chatId = m.chat;

  if (!global.db.data.tramites) {
    global.db.data.tramites = {};
  }

  if (!global.db.data.tramites[chatId]) {
    global.db.data.tramites[chatId] = [];
  }

  const groupTramites = global.db.data.tramites[chatId];

  // Ver trámites
  if (m.text.startsWith('.tramites')) {
    if (groupTramites.length === 0) {
      m.reply('🧑‍💼✨ *No hay trámites registrados* ✨');
      return;
    }

    const lista = groupTramites.map((tramite, i) => `${i + 1}. ${tramite}`).join('\n');
    m.reply(`📋 *Trámites registrados:*\n\n${lista}`);
    return;
  }

  // Agregar trámite
  if (m.text.startsWith('.settramites')) {
    if (!text) {
      m.reply('𝙀𝙨𝙘𝙧𝙞𝙗𝙚 𝙪𝙣 𝙩𝙧á𝙢𝙞𝙩𝙚.');
      return;
    }

    const tramite = text.trim();
    global.db.data.tramites[chatId].push(tramite);

    fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
    m.reply(`✅ Trámite agregado correctamente.`);
    return;
  }

  // Limpiar trámites
  if (m.text.startsWith('.resettramites')) {
    global.db.data.tramites[chatId] = [];
    fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
    m.reply('🗑️ Trámites eliminados correctamente.');
    return;
  }
};

handler.help = ['tramites', 'settramites <tramite>', 'resettramites'];
handler.tags = ['group'];
handler.command = ['tramites', 'settramites', 'resettramites'];
handler.admin = true;

export default handler;
