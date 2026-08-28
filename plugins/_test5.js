// Memoria global para almacenar los scrims activos
global.scrims = global.scrims || {};

const handler = async (m, { conn, args }) => {
    if (args.length < 3) {
        conn.reply(m.chat, 'Debes proporcionar la hora (HH:MM), AM/PM, y el país (MX, CO, CL, AR, PE, EC).\nEjemplo: *.scrimprueba 08:00 PM MX*', m);
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

    const textoBase = generarTexto(horasEnPais, [], [], m.sender);

    // Configuración del menú interactivo de opciones
    const sections = [
        {
            title: "Selecciona tu posición",
            rows: [
                { title: "⚔️ Anotarme como Titular", id: `.scrim_titular` },
                { title: "🎒 Anotarme como Suplente", id: `.scrim_suplente` },
                { title: "❌ Salirme de la Lista", id: `.scrim_salir` }
            ]
        }
    ];

    const listMessage = {
        text: textoBase,
        footer: "Selecciona una opción en el botón para anotarte o salir",
        title: "📋 REGISTRO DE SCRIM",
        buttonText: "⚡ UNIRSE / SALIR",
        sections,
        mentions: [m.sender]
    };

    const sentMsg = await conn.sendMessage(m.chat, listMessage, { quoted: m });

    // Guardar el estado del scrim asociado al ID del mensaje enviado
    global.scrims[sentMsg.key.id] = {
        chat: m.chat,
        horasEnPais,
        organizador: m.sender,
        titulares: [],
        suplentes: []
    };
};

// Listener para procesar la interacción de los usuarios en la lista
handler.before = async function (m, { conn }) {
    const selectedId = m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || m.text;
    const quotedId = m.quoted?.id;

    if (!selectedId || !quotedId) return;
    if (!global.scrims || !global.scrims[quotedId]) return;

    // Verificar si la acción corresponde a las opciones del scrim
    if (!['.scrim_titular', '.scrim_suplente', '.scrim_salir'].includes(selectedId)) return;

    const scrim = global.scrims[quotedId];
    const sender = m.sender;

    // Remover al usuario de ambas listas antes de volver a asignarlo
    scrim.titulares = scrim.titulares.filter(user => user !== sender);
    scrim.suplentes = scrim.suplentes.filter(user => user !== sender);

    if (selectedId === '.scrim_titular') {
        if (scrim.titulares.length < 4) {
            scrim.titulares.push(sender);
        } else if (scrim.suplentes.length < 2) {
            scrim.suplentes.push(sender);
        } else {
            return conn.reply(m.chat, '⚠️ La lista de titulares y suplentes ya está llena.', m);
        }
    } else if (selectedId === '.scrim_suplente') {
        if (scrim.suplentes.length < 2) {
            scrim.suplentes.push(sender);
        } else {
            return conn.reply(m.chat, '⚠️ La lista de suplentes ya está llena.', m);
        }
    }

    const nuevoTexto = generarTexto(scrim.horasEnPais, scrim.titulares, scrim.suplentes, scrim.organizador);
    const todasLasMenciones = [...new Set([scrim.organizador, ...scrim.titulares, ...scrim.suplentes])];

    // Actualiza el mensaje original editando su contenido
    await conn.sendMessage(scrim.chat, {
        text: nuevoTexto,
        edit: { remoteJid: scrim.chat, id: quotedId },
        mentions: todasLasMenciones
    });
};

// Función interna para generar el diseño de la plantilla
function generarTexto(horasEnPais, titulares, suplentes, organizador) {
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
│ㅤʚ 𝗢𝗥𝗚𝗔𝗡𝗜𝗭𝗔𝗗𝗢𝗥:
│@${organizador.split('@')[0]}
╰─────────────╯`.trim();
}

handler.help = ['scrimprueba'];
handler.tags = ['freefire'];
handler.command = /^scrimprueba$/i;

export default handler;
