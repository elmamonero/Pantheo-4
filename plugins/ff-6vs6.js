// Memoria global para almacenar los 6vs6 activos
global.versus6v6 = global.versus6v6 || {};

const handler = async (m, { conn, args }) => {
    if (args.length < 3) {
        conn.reply(m.chat, 'Debes proporcionar la hora (HH:MM), AM/PM, país (MX, CO, CL, AR, PE, EC) y opcionalmente la casilla.\nEjemplo: *.6vs6 08:00 PM CO C4*', m);
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

    // Calcular fecha exacta en la zona del país origen especificado
    const now = new Date();
    const tzOrigen = timezones[pais];
    
    const formatterOrigen = new Intl.DateTimeFormat('en-US', {
        timeZone: tzOrigen,
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const parts = formatterOrigen.formatToParts(now);
    const dateMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

    const isoString = `${dateMap.year}-${dateMap.month}-${dateMap.day}T${String(hora).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:00`;

    // Conversión a las zonas horarias restantes
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

    const titulares = [];
    const suplentes = [];

    const textoBase = generarTexto(horasEnPais, casilla, titulares, suplentes, m.sender);

    const sentMsg = await conn.sendMessage(m.chat, { text: textoBase, mentions: [m.sender] }, { quoted: m });

    global.versus6v6[sentMsg.key.id] = {
        chat: m.chat,
        horasEnPais,
        casilla,
        organizador: m.sender,
        titulares,
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

    if (!global.versus6v6 || !global.versus6v6[msgId]) return;

    const game = global.versus6v6[msgId];
    const tiempoLimite = 20 * 60 * 1000;
    if (Date.now() - game.timestamp > tiempoLimite) {
        delete global.versus6v6[msgId];
        return;
    }

    // Quitar usuario antes de reasignarlo
    game.titulares = game.titulares.filter(user => user !== sender);
    game.suplentes = game.suplentes.filter(user => user !== sender);

    if (emoji === '❤️') {
        if (game.titulares.length < 6) {
            game.titulares.push(sender);
        } else if (game.suplentes.length < 2) {
            game.suplentes.push(sender);
        }
    } else if (emoji === '💛') {
        if (game.suplentes.length < 2) {
            game.suplentes.push(sender);
        }
    }

    const nuevoTexto = generarTexto(game.horasEnPais, game.casilla, game.titulares, game.suplentes, game.organizador);
    const todasLasMenciones = [...new Set([game.organizador, ...game.titulares, ...game.suplentes])];

    try {
        await conn.sendMessage(game.chat, {
            text: nuevoTexto,
            edit: reaction.key,
            mentions: todasLasMenciones
        });
    } catch (e) {
        // Ignorar errores de edición
    }
};

function generarTexto(horasEnPais, casilla, titulares, suplentes, organizador) {
    const slotT = (idx) => titulares[idx] ? `@${titulares[idx].split('@')[0]}` : '';
    const slotS = (idx) => suplentes[idx] ? `@${suplentes[idx].split('@')[0]}` : '';

    return `╭─────── 🆚 ───────╮
    • 𝟲  𝗩 𝗘 𝗥 𝗦 𝗨 𝗦  𝟲 •
╰─────── 🆚 ───────╯

╭───────────────╮
│ ⏱️ *HORARIO:*
│ 🇲🇽 México : ${horasEnPais.MX}
│ 🇨🇴 Colombia : ${horasEnPais.CO}
│ 🇵🇪 Perú : ${horasEnPais.PE}
│ 🇪🇨 Ecuador : ${horasEnPais.EC}
│ 🇨🇱 Chile : ${horasEnPais.CL}
│ 🇦🇷 Argentina : ${horasEnPais.AR}
│
│ 📌 *CASILLA:* ${casilla}
│ 👥 *JUGADORES:* (${titulares.length}/6)
│
│   *ESCUADRA 1*
│ 👑 ➤ ${slotT(0)}
│ ⚜️ ➤ ${slotT(1)}
│ ⚜️ ➤ ${slotT(2)}
│ ⚜️ ➤ ${slotT(3)}
│ ⚜️ ➤ ${slotT(4)}
│ ⚜️ ➤ ${slotT(5)}
│
│ 🎗️ *SUPLENTES:* (${suplentes.length}/2)
│ ⚜️ ➤ ${slotS(0)}
│ ⚜️ ➤ ${slotS(1)}
│
│ 📌 *Reacciona para anotarte:*
│ ❤️ = Titular | 💛 = Suplente | ❌ = Salir
│
│ 👑 *ORGANIZADOR:*
│ @${organizador.split('@')[0]}
╰───────────────╯`.trim();
}

handler.help = ['6vs6'];
handler.tags = ['freefire'];
handler.command = /^(6vs6|6x6|6v6|v6|vs6)$/i;

export default handler;
