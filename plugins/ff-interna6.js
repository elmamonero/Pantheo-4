// Memoria global para almacenar las listas activas de interna6
global.interna6 = global.interna6 || {};

const handler = async (m, { conn, args }) => {
    if (args.length < 3) {
        conn.reply(m.chat, 'Debes proporcionar la hora (HH:MM), AM/PM y el país (MX, CO, CL, AR, PE, EC).\nEjemplo: *.interna6 08:00 PM CO*', m);
        return;
    }

    const horaRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]$/;
    if (!horaRegex.test(args[0])) {
        conn.reply(m.chat, 'Formato de hora incorrecto. Debe ser HH:MM en formato de 12 horas.', m);
        return;
    }

    const horaUsuario = args[0];
    const ampm = args[1].toUpperCase();
    const pais = args[2].toUpperCase();

    if (!['AM', 'PM'].includes(ampm)) {
        conn.reply(m.chat, 'Formato AM/PM incorrecto. Debe ser AM o PM.', m);
        return;
    }

    const timezones = {
        MX: 'America/Mexico_City',
        CO: 'America/Bogota',
        PE: 'America/Lima',
        EC: 'America/Guayaquil',
        CL: 'America/Santiago',
        AR: 'America/Argentina/Buenos_Aires'
    };

    if (!(pais in timezones)) {
        conn.reply(m.chat, 'País no válido. Usa MX, CO, CL, AR, PE o EC.', m);
        return;
    }

    // Convertir a hora formato 24h
    let [hora, minutos] = horaUsuario.split(':').map(Number);
    if (ampm === 'PM' && hora !== 12) hora += 12;
    if (ampm === 'AM' && hora === 12) hora = 0;

    // Calcular fecha según la zona horaria dada
    const now = new Date();
    const tzOrigen = timezones[pais];
    
    const formatterOrigen = new Intl.DateTimeFormat('en-US', {
        timeZone: tzOrigen,
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const parts = formatterOrigen.formatToParts(now);
    const dateMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

    const isoString = `${dateMap.year}-${dateMap.month}-${dateMap.day}T${String(hora).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:00`;
    
    const horasEnPais = {};
    for (const key in timezones) {
        const dateTarget = new Date(new Date(isoString).toLocaleString('en-US', { timeZone: tzOrigen }));
        const dateLocal = new Date(isoString);
        const diff = dateLocal.getTime() - dateTarget.getTime();
        
        const finalDate = new Date(dateLocal.getTime() + diff);

        const fmt = new Intl.DateTimeFormat('es-ES', {
            timeZone: timezones[key],
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        horasEnPais[key] = fmt.format(finalDate).toUpperCase();
    }

    const e1 = [];
    const e2 = [];
    const suplentes = [];

    const textoBase = generarTexto(horasEnPais, e1, e2, suplentes, m.sender);

    const sentMsg = await conn.sendMessage(m.chat, { 
        text: textoBase, 
        mentions: [m.sender] 
    }, { quoted: m });

    global.interna6[sentMsg.key.id] = {
        chat: m.chat,
        horasEnPais,
        organizador: m.sender,
        e1,
        e2,
        suplentes,
        timestamp: Date.now()
    };
};

handler.before = async function (m, { conn }) {
    if (!m.message?.reactionMessage) return;

    const reaction = m.message.reactionMessage;
    const msgId = reaction.key.id;
    const emoji = reaction.text;
    const sender = m.sender;

    if (!global.interna6 || !global.interna6[msgId]) return;

    const game = global.interna6[msgId];
    const tiempoLimite = 20 * 60 * 1000;
    if (Date.now() - game.timestamp > tiempoLimite) {
        delete global.interna6[msgId];
        return;
    }

    // Quitar usuario de todas las posiciones antes de asignar la nueva
    game.e1 = game.e1.filter(user => user !== sender);
    game.e2 = game.e2.filter(user => user !== sender);
    game.suplentes = game.suplentes.filter(user => user !== sender);

    // Lógica para 6 cupos por escuadra
    if (emoji === '🔥') {
        if (game.e1.length < 6) {
            game.e1.push(sender);
        } else if (game.e2.length < 6) {
            game.e2.push(sender);
        } else if (game.suplentes.length < 2) {
            game.suplentes.push(sender);
        }
    } else if (emoji === '⚔️') {
        if (game.e2.length < 6) {
            game.e2.push(sender);
        } else if (game.e1.length < 6) {
            game.e1.push(sender);
        } else if (game.suplentes.length < 2) {
            game.suplentes.push(sender);
        }
    } else if (emoji === '🛡️') {
        if (game.suplentes.length < 2) {
            game.suplentes.push(sender);
        }
    }

    const nuevoTexto = generarTexto(game.horasEnPais, game.e1, game.e2, game.suplentes, game.organizador);
    const todasLasMenciones = [...new Set([game.organizador, ...game.e1, ...game.e2, ...game.suplentes])];

    try {
        await conn.sendMessage(game.chat, {
            text: nuevoTexto,
            edit: reaction.key,
            mentions: todasLasMenciones
        });
    } catch (e) {
        // Ignorar fallos de edición
    }
};

function generarTexto(horasEnPais, e1, e2, suplentes, organizador) {
    const slotE1 = (idx) => e1[idx] ? `@${e1[idx].split('@')[0]}` : '';
    const slotE2 = (idx) => e2[idx] ? `@${e2[idx].split('@')[0]}` : '';
    const slotS = (idx) => suplentes[idx] ? `@${suplentes[idx].split('@')[0]}` : '';

    return ` ╭──────>⋆☽⋆ 🆚 ⋆☾⋆<──────╮
ㅤ           •6  𝗩 𝗘 𝗥 𝗦 𝗨 𝗦  6•  
                        •INTERNA• 
╰──────>⋆☽⋆ 🆚 ⋆☾⋆<──────╯

╭──────>⋆☽⋆ 🔥 ⋆☾⋆<──────╮
│⏱ 𝐇𝐎𝐑𝐀𝐑𝐈𝐎:
│🇲🇽 𝐌𝐄𝐗𝐈𝐂𝐎 : ${horasEnPais.MX}
│🇨🇴 𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀 : ${horasEnPais.CO}
│🇵🇪 𝐏𝐄𝐑𝐔 : ${horasEnPais.PE}
│🇪🇨 𝐄𝐂𝐔𝐀𝐃𝐎𝐑 : ${horasEnPais.EC}
│🇨🇱 𝐂𝐇𝐈𝐋𝐄 : ${horasEnPais.CL}
│🇦🇷 𝐀𝐑𝐆𝐄𝐍𝐓𝐈𝐍𝐀 : ${horasEnPais.AR}
│
│ㅤʚ 𝗝𝗨𝗚𝗔𝗗𝗢𝗥𝗘𝗦: (${e1.length + e2.length}/12)
│
│    𝗘𝗦𝗖𝗨𝗔𝗗𝗥𝗔 1 (${e1.length}/6)
│👑 ➤ ${slotE1(0)}
│⚜️ ➤ ${slotE1(1)}
│⚜️ ➤ ${slotE1(2)}
│⚜️ ➤ ${slotE1(3)}
│⚜️ ➤ ${slotE1(4)}
│⚜️ ➤ ${slotE1(5)}
│
│    𝗘𝗦𝗖𝗨𝗔𝗗𝗥𝗔 2 (${e2.length}/6)
│👑 ➤ ${slotE2(0)}
│⚜️ ➤ ${slotE2(1)}
│⚜️ ➤ ${slotE2(2)}
│⚜️ ➤ ${slotE2(3)}
│⚜️ ➤ ${slotE2(4)}
│⚜️ ➤ ${slotE2(5)}
│
│ㅤʚ 𝗦𝗨𝗣𝗟𝗘𝗡𝗧𝗘𝗦: (${suplentes.length}/2)
│⚜️ ➤ ${slotS(0)}
│⚜️ ➤ ${slotS(1)}
│
│📌 *Reacciones:*
│🔥 = Escuadra 1 | ⚔️ = Escuadra 2 | 🛡️ = Suplente | ❌ = Salir
│
│ㅤʚ 𝗢𝗥𝗚𝗔𝗡𝗜𝗭𝗔𝗗𝗢𝗥:
│@${organizador.split('@')[0]}
╰──────>⋆☽⋆ 🔥 ⋆☾⋆<──────╯`.trim();
}

handler.help = ['interna6'];
handler.tags = ['freefire'];
handler.command = /^(interna6vs6|interna6|interna6x6|6interna|invs6|in6vs6|in6v6)$/i;

export default handler;
