// Memoria global para almacenar las lista activas de interna4fem
global.interna4fem = global.interna4fem || {};

const handler = async (m, { conn, args }) => {
    if (args.length < 3) {
        conn.reply(m.chat, 'Debes proporcionar la hora (HH:MM), AM/PM y el país (MX, CO, CL, AR, PE, EC).\nEjemplo: *.interna4fem 08:00 PM CO*', m);
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

    // Calcular la fecha local según la zona horaria de origen proporcionada
    const now = new Date();
    const tzOrigen = timezones[pais];
    
    const formatterOrigen = new Intl.DateTimeFormat('en-US', {
        timeZone: tzOrigen,
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const parts = formatterOrigen.formatToParts(now);
    const dateMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

    // Crear un objeto Date ISO representativo
    const isoString = `${dateMap.year}-${dateMap.month}-${dateMap.day}T${String(hora).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:00`;
    
    // Obtener la hora formateada para cada país objetivo
    const horasEnPais = {};
    for (const key in timezones) {
        // Obtenemos el offset entre el origen y el destino
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

    // Guardar referencia en la memoria global
    global.interna4fem[sentMsg.key.id] = {
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

    if (!global.interna4fem || !global.interna4fem[msgId]) return;

    const game = global.interna4fem[msgId];
    const tiempoLimite = 20 * 60 * 1000; // 20 minutos de caducidad
    if (Date.now() - game.timestamp > tiempoLimite) {
        delete global.interna4fem[msgId];
        return;
    }

    // Quitar usuario de todas las listas antes de reasignar
    game.e1 = game.e1.filter(user => user !== sender);
    game.e2 = game.e2.filter(user => user !== sender);
    game.suplentes = game.suplentes.filter(user => user !== sender);

    // Asignación de acuerdo al emoji
    if (emoji === '❤️') {
        if (game.e1.length < 4) {
            game.e1.push(sender);
        } else if (game.e2.length < 4) {
            game.e2.push(sender);
        } else if (game.suplentes.length < 2) {
            game.suplentes.push(sender);
        }
    } else if (emoji === '💙') {
        if (game.e2.length < 4) {
            game.e2.push(sender);
        } else if (game.e1.length < 4) {
            game.e1.push(sender);
        } else if (game.suplentes.length < 2) {
            game.suplentes.push(sender);
        }
    } else if (emoji === '💛') {
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
        // Errores de edición ignorados silenciosamente
    }
};

function generarTexto(horasEnPais, e1, e2, suplentes, organizador) {
    const slotE1 = (idx) => e1[idx] ? `@${e1[idx].split('@')[0]}` : '';
    const slotE2 = (idx) => e2[idx] ? `@${e2[idx].split('@')[0]}` : '';
    const slotS = (idx) => suplentes[idx] ? `@${suplentes[idx].split('@')[0]}` : '';

    return ` ╭──────>⋆☽⋆ 🌸 ⋆☾⋆<──────╮
ㅤ      •𝟰  𝗩 𝗘 𝗥 𝗦 𝗨 𝗦  𝟰•  
                 •INTERNA• 
╰──────>⋆☽⋆ 🌸 ⋆☾⋆<──────╯

╭──────>⋆☽⋆ 🌸 ⋆☾⋆<──────╮
│⏱ 𝐇𝐎𝐑𝐀𝐑𝐈𝐎:
│🇲🇽 𝐌𝐄𝐗𝐈𝐂𝐎 : ${horasEnPais.MX}
│🇨🇴 𝐂𝐎𝐋𝐎𝗠𝐁𝗜𝗔 : ${horasEnPais.CO}
│🇵🇪 𝐏𝐄𝗥𝐔 : ${horasEnPais.PE}
│🇪🇨 𝐄𝗖𝗨𝗔𝐃𝗢𝗥 : ${horasEnPais.EC}
│🇨🇱 𝐂𝐇𝐈𝐋𝐄 : ${horasEnPais.CL}
│🇦🇷 𝐀𝗥𝗚𝗘𝗡𝗧𝐈𝐍𝐀 : ${horasEnPais.AR}
│
│ㅤʚ 𝗝𝗨𝗚𝗔𝗗𝗢𝗥𝗔𝗦: (${e1.length + e2.length}/8)
│
│     𝗘𝗦𝗖𝗨𝗔𝐃𝗥𝐀 1 (${e1.length}/4)
│👑 ➤ ${slotE1(0)}
│🌸 ➤ ${slotE1(1)}
│🌸 ➤ ${slotE1(2)}
│🌸 ➤ ${slotE1(3)}
│
│     𝗘𝗦𝗖𝗨𝗔𝐃𝗥𝐀 2 (${e2.length}/4)
│👑 ➤ ${slotE2(0)}
│🌸 ➤ ${slotE2(1)}
│🌸 ➤ ${slotE2(2)}
│🌸 ➤ ${slotE2(3)}
│
│ㅤʚ 𝗦𝗨𝗣𝗟𝗘𝗡𝗧𝗔𝗦: (${suplentes.length}/2)
│🌷 ➤ ${slotS(0)}
│🌷 ➤ ${slotS(1)}
│
│📌 *Reacciones:*
│❤️ = Escuadra 1 | 💙 = Escuadra 2 | 💛 = Suplente | ❌ = Salir
│
│ㅤʚ 𝗢𝗥𝗚𝗔𝗡𝗜𝗭𝗔𝗗𝗢𝗥𝗔:
│@${organizador.split('@')[0]}
╰──────>⋆☽⋆ 🌸 ⋆☾⋆<──────╯`.trim();
}

handler.help = ['interna4fem'];
handler.tags = ['freefire'];
handler.command = /^(interna4vs4fem|interna4fem|interna4x4fem|4internafem|invs4fem|in4vs4fem|in4v4fem)$/i;

export default handler;

