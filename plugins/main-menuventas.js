import fetch from 'node-fetch';

const handler = async (m, { conn, usedPrefix, isPrems }) => {
  try {
    await m.react('🛍️');

    let img = 'https://evogb.win/Menu'; // Puedes cambiar el enlace de la imagen si deseas otra para el menú de ventas
    const botname = 'Pantheon Bot';
    const taguser = `@${m.sender.split('@')[0]}`;
    const saludo = 'Hola';

    const fkontak = { 
      "key": { 
        "participants": "0@s.whatsapp.net", 
        "remoteJid": "status@broadcast", 
        "fromMe": false, 
        "id": "status@broadcast" 
      }, 
      "message": { 
        "contactMessage": { 
          "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;;; \nFN:${botname}\nEND:VCARD` 
        } 
      } 
    };

    const text = `╭━━━〔 *${botname}* 〕━━━⬣
┃ 👋 *${saludo}*, ${taguser}
┃ 🛍️ *MENÚ DE SISTEMA DE VENTAS*
╰━━━━━━━━━━━━━━⬣

> ⚠️ Gestiona tus métodos de pago, stock y servicios de forma automática.
${readMore}
↷✦; \`SISTEMA DE VENTAS\` ❞ 🛍️ 
⠞🛍️੭‎ ${usedPrefix}setpago *texto*
⠞🛍️੭‎ ${usedPrefix}pago
⠞🛍️੭‎ ${usedPrefix}setstock *texto*
⠞🛍️੭‎ ${usedPrefix}stock
⠞🛍️੭‎ ${usedPrefix}setcombos *texto*
⠞🛍️੭‎ ${usedPrefix}combos
⠞🛍️੭‎ ${usedPrefix}setdiamantes *texto*
⠞🛍️੭‎ ${usedPrefix}diamantes
⠞🛍️੭‎ ${usedPrefix}setfichareporte *texto*
⠞🛍️੭‎ ${usedPrefix}fichareporte
⠞🛍️੭‎ ${usedPrefix}setnetflix *texto*
⠞🛍️੭‎ ${usedPrefix}netflix
⠞🛍️੭‎ ${usedPrefix}cambiar *texto*
⠞🛍️੭‎ ${usedPrefix}divisas

╭━━━━━━━━━━━━━━⬣
┃ 👑 Creador: wa.me/50587489794
╰━━━━━━━━━━━━━━⬣`.trim();

    await conn.sendMessage(m.chat, {
      image: { url: img },
      caption: text,
      contextInfo: {
        mentionedJid: [m.sender],
        isForwarded: true,
        forwardingScore: 999
      }
    }, { quoted: fkontak });

  } catch (e) {
    console.error(e);
    conn.reply(m.chat, '❎ Ocurrió un error al mostrar el menú de ventas.', m);
  }
};

handler.command = /^(menuventas|ventasmenu|ventas|shopmenu)$/i;
handler.fail = null;

export default handler;

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);
