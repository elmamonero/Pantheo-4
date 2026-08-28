// Memoria global para almacenar los scrims activos
global.scrims = global.scrims || {};

const handler = async (m, { conn, args }) => {
    if (args.length < 3) {
        conn.reply(m.chat, 'Debes proporcionar la hora (HH:MM), AM/PM, país (MX, CO, CL, AR, PE, EC) y opcionalmente la casilla.\nEjemplo: *.scrimprueba 08:00 PM MX C4*', m);
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
    const casilla = args[3] ? args[3].toUpperCase() : 'Por asignar';

    if (!['AM', 'PM'].includes(ampm)) {
        conn.reply(m.chat, 'Formato AM/PM incorrecto. Debe ser AM o PM.', m);
        return;
    }

    let [hora, minutos] = horaUsuario.split(':').map(Number);
    if (ampm === 'PM' && hora !== 12) hora += 12;
    if (ampm === 'AM' && hora === 12) hora = 0;

    const diferenciasHorarias = { MX: -1, CO: 0, CL: 2, AR: 2, PE: 0, EC: 0 };
    if (!(pais in diferenciasHorarias)) {
        conn.reply(m.chat, 'País no válido. Usa MX, CO, CL, AR, PE o EC.', m);
        return;
    }

    const diferenciaHoraria = diferenciasHorarias[pais];
    const formatTime = (date) => date.toLocaleTimeString('es', { hour12: true, hour: '2-digit', minute: '2-digit' });
    const horasEnPais = {};

    for (const key in diferenciasHorarias) {
        const horaActual = new Date();
        horaActual.setHours(hora, minutos, 0, 0);
        const horaEnPais = new Date(horaActual.getTime() + (3600000 * (diferenciasHorarias[key] - diferenciaHoraria)));
        horasEnPais[key] = formatTime(horaEnPais);
    }

    const textoBase = generarTexto(horasEnPais, casilla, [], [], m.sender);

    const sentMsg = await conn.sendMessage(m.chat, { text: textoBase, mentions: [m.sender] }, { quoted: m });

    // Guardar estado del scrim
    global.scrims[sentMsg.key.id] = {
        chat: m.chat,
        horasEnPais,
        casilla,
        organizador: m.sender,
        titulares: [],
        suplentes: [],
        timestamp: Date.now()
    };
};

// Listener para reacciones
handler.before = async function (m, { conn }) {
    if (!m.message?.reactionMessage) return;

    const reaction = m.message.reactionMessage;
    const msgId = reaction.key.id;
    const emoji = reaction.text;
    const sender = m.sender;

    if (!global.scrims || !global.scrims[msgId]) return;

    const scrim = global.scrims[msgId];

    // Quitar al usuario de ambas listas antes de reasignarlo
    scrim.titulares = scrim.titulares.filter(user => user !== sender);
    scrim.suplentes = scrim.suplentes.filter(user => user !== sender);

    if (emoji === '❤️') {
        if (scrim.titulares.length < 4) {
            scrim.titulares.push(sender);
        } else if (scrim.suplentes.length < 2) {
            scrim.suplentes.push(sender);
        }
    } else if (emoji === '💛') {
        if (scrim.suplentes.length < 2) {
            scrim.suplentes.push(sender);
        }
    }

    const nuevoTexto = generarTexto(scrim.horasEnPais, scrim.casilla, scrim.titulares, scrim.suplentes, scrim.organizador);
    const todasLasMenciones = [...new Set([scrim.organizador, ...scrim.titulares, ...scrim.suplentes])];

    // Intentar editar el mensaje (si pasaron menos de 15 min), sino enviar un nuevo mensaje
    const quinceMinutos = 15 * 60 * 1000;
    const tiempoTranscurrido = Date.now() - scrim.timestamp;

    if (tiempoTranscurrido < quinceMinutos) {
        await conn.sendMessage(scrim.chat, {
            text: nuevoTexto,
            edit: reaction.key,
            mentions: todasLasMenciones
        });
    } else {
        await conn.sendMessage(scrim.chat, {
            text: `⚠️ *(Tiempo de edición excedido - Lista Actualizada)*\n\n${nuevoTexto}`,
            mentions: todasLasMenciones
        });
    }
};

function generarTexto(horasEnPais, casilla, titulares, suplentes, organizador) {
    const slotT = (idx) => titulares[idx] ? `@${titulares[idx].split('@')[0]}` : '';
    const slotS = (idx) => suplentes[idx] ? `@${suplentes[idx].split('@')[0]}` : '';

    return `╭──────⚔──────╮

ㅤ𝐒𝐂𝐑𝐈𝐌𝐒 𝐂𝐎𝐌𝐏𝐄𝐓𝐈𝐓𝐈𝐕𝐎

╰──────⚔──────╯

╭──────────────╮
│⏱ 𝐇𝐎𝐑𝐀𝐑𝐈𝐎: 
│🇲🇽 𝐌𝐄𝐗𝐈𝐂𝐎 : ${horasEnPais.MX}
│🇨🇴 𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀 : ${horasEnPais.CO}
│🇵🇪 𝐏𝐄𝐑𝐔 : ${horasEnPais.PE}
│🇪🇨 𝐄𝐂𝐔𝐀𝐃𝐎𝐑 : ${horasEnPais.EC}
│🇨🇱 𝐂𝐇𝐈🇱𝐄 : ${horasEnPais.CL}
│🇦🇷 𝐀𝐑𝐆𝐄𝐍𝐓𝐈𝐍𝐀 : ${horasEnPais.AR}
│
│➥ 𝐂𝐀𝐒𝐈𝐋𝐋𝐀: ${casilla}
│➥ 𝐉𝐔𝐆𝐀𝐃𝐎𝐑𝐄𝐒: (${titulares.length}/4)
│
│     𝗘𝗦𝗖𝗨𝗔𝗗𝗥𝗔 
│👑 ➤ ${slotT(0)}
│🥷🏻 ➤ ${slotT(1)}
│🥷🏻 ➤ ${slotT(2)}
│🥷🏻 ➤ ${slotT(3)}
│
│ㅤʚ 𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄: (${suplentes.length}/2)
│🥷🏻 ➤ ${slotS(0)}
│🥷🏻 ➤ ${slotS(1)}
│
│ 📌 Reacciona para anotarte:
│ ❤️ = Titular | 💛 = Suplente | ❌ = Salir
│
│ㅤʚ 𝗢𝗥𝗚𝗔𝗡𝗜Z𝐀𝐃𝐎𝐑:
│@${organizador.split('@')[0]}
╰─────────────╯`.trim();
}

handler.help = ['scrimprueba'];
handler.tags = ['freefire'];
handler.command = /^scrimprueba$/i;

export default handler;

