import { getAllConfigs, getConfig } from '../../db.js';

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNum = sender.replace(/[^0-9]/g, "");
  
  const isOwner = global.owner?.some(([id]) => id === senderNum) || false;

  if (!isOwner) {
    await conn.sendMessage(chatId, {
      text: "⛔ Este comando solo puede usarlo el *dueño del bot*."
    }, { quoted: msg });
    return;
  }

  await conn.sendMessage(chatId, {
    react: { text: "📄", key: msg.key }
  });

  let modoPrivadoGlobal = "❌";
  try {
    modoPrivadoGlobal = (await getConfig("global", "modoprivado")) == 1 ? "✅" : "❌";
  } catch {}

  const groups = await conn.groupFetchAllParticipating();
  const configKeys = [
    ["antis", "🚫 Antis"],
    ["antidelete", "🗑️ Antidelete"],
    ["modoprivado", "🔒 ModoPrivado"],
    ["apagado", "🛑 Apagado"],
    ["modoadmins", "👮‍♂️ Solo Admins"],
    ["antiarabe", "🚷 AntiArabe"],
    ["antilink", "🔗 AntiLink WA"],
    ["linkall", "🌐 AntiLink All"],
    ["welcome", "👋 Bienvenida"],
    ["despedidas", "👋 Despedida"]
  ];

  const resultLines = [];

  for (const [id, data] of Object.entries(groups)) {
    const name = data.subject || "Sin nombre";
    
    let config = {};
    try {
      config = getAllConfigs(id) || {};
    } catch {
      config = {};
    }

    const stateLines = configKeys.map(([k, label]) => {
      const active = config[k] == 1 ? "✅" : "❌";
      return `${label.padEnd(16)}: ${active}`;
    }).join("\n");

    let link = "🔒 No soy admin";
    try {
      const code = await conn.groupInviteCode(id);
      if (code) link = `https://chat.whatsapp.com/${code}`;
    } catch {}

    resultLines.push(`╭───────────────
📛 *${name}*
🔗 *Enlace:* ${link}
${stateLines}
╰───────────────\n`);
  }

  const listado = resultLines.length
    ? resultLines.join("\n")
    : "❌ No se encontraron grupos activos.";

  const replyText = `🌐 *Modo Privado Global:* ${modoPrivadoGlobal}\n\n📋 *Listado de grupos y sus configuraciones:*\n\n${listado}`;

  await conn.sendMessage(chatId, {
    text: replyText
  }, { quoted: msg });
};

handler.help = ['vergrupos'];
handler.tags = ['owner'];
handler.command = /^(vergrupos|listagrupos|gruposconfig)$/i;

export default handler;
