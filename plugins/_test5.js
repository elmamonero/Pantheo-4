import fetch from 'node-fetch';

const handler = async (m, { conn, usedPrefix, isPrems }) => {
  try {
    await m.react('🧡');

    let img = 'https://cdn.russellxz.click/86eb0211.jpg';
    let insta = 'https://chat.whatsapp.com/HvDCvNqXSiW19MFXJmWhoF';

    const _uptime = process.uptime() * 1000;
    const uptime = clockString(_uptime);

    // Saludo según la hora
    const hour = new Date().getHours();
    const saludo = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

    const user = global.db.data.users[m.sender] || {};
    const { money = 0, joincount = 0, exp = 0, limit = 0, level = 0, role = '' } = user;

    let totalreg = Object.keys(global.db.data.users || {}).length;

    // Tag correcto para que aparezca en azul
    const taguser = `@${m.sender.split('@')[0]}`;
    const botname = 'Pantheon Bot';

    const text = `
︵᷼     ⿻ *PANTHEON* ࣪   ࣭   ࣪ *WA BOT* ࣭   🐈  ࣪   ࣭
✿ *Hᴏʟᴀ* *${taguser}*
*${saludo}*

> ꒰꛱ ͜Desarrollado por *Pantheon* +50587489794

𓏸🌺  \`Bot Name:\` ${botname}  
𓈒𓏸🌷 \`Activo:\` ${uptime}  
𓈒𓏸🍂 \`Usuarios:\` ${totalreg}  
𓈒𓏸🌸 \`Versión:\` 1.0.0  

> 😸 Si encuentras un comando con errores no dudes en reportarlo con el Creador
${readMore}
↷✦; *\`MENÚS\`* ❞ 🌷︵᷼ 
⠞🌷੭‎ ${usedPrefix}menunsfw
⠞🌷੭‎ ${usedPrefix}menuowner
⠞🌷੭‎ ${usedPrefix}menulogos
⠞🌷੭‎ ${usedPrefix}menuff`.trim();

    conn.sendMessage(m.chat, {
      text: text,
      contextInfo: {
        mentionedJid: [m.sender], // Esto soluciona el problema del tag
        isForwarded: true,
        forwardingScore: 999,
        externalAdReply: {
          title: 'Pantheon Bot',
          body: `Hola ${taguser}`,
          thumbnail: await (await fetch(img)).buffer(),
          sourceUrl: insta,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    conn.reply(m.chat, '❎ Error en el comando.', m);
  }
};

// Ahora solo responde a .menuprueba
handler.command = /^(menuprueba)$/i;
handler.fail = null;

export default handler;

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

function clockString(ms) {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
}