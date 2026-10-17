// --- FUNCIONES Y DATOS ---
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

const categorias = {
    migajeros: {
        titulo: "👑 TOP 10 MIGAJEROS 🍞",
        emoji: "🍞",
        barra: "🥖",
        frase: "Mendigando un poquito de atención:"
    },
    infieles: {
        titulo: "🔥 TOP 10 INFIELES 😈",
        emoji: "🐍",
        barra: "🔥",
        frase: "Los más peligrosos del grupo:"
    },
    fieles: {
        titulo: "💎 TOP 10 FIELES 😇",
        emoji: "✨",
        barra: "🛡️",
        frase: "Patrimonio de la lealtad:"
    },
    cachudos: {
        titulo: "🐂 TOP 10 CACHUDOS 🤘",
        emoji: "🦌",
        barra: "🌿",
        frase: "Los que no entran por la puerta:"
    }
};

// --- LOGICA DEL COMANDO ---
let handler = async (m, { conn, args, usedPrefix, command, groupMetadata }) => {
    // Definimos el tipo según lo que el usuario pida (ej: .migajeros, .infieles, etc. o .top infieles)
    let tipo = command.toLowerCase();
    
    // Si usas un solo comando maestro tipo ".top [categoria]"
    if (command === 'top') {
        tipo = args[0] ? args[0].toLowerCase() : '';
        if (!categorias[tipo]) {
            let listaKeys = Object.keys(categorias).join(', ');
            return m.reply(`❌ Debes especificar una categoría válida.\n📌 *Ejemplos:* \n> ${usedPrefix}top infieles\n> ${usedPrefix}top fieles\n\n*Categorías:* ${listaKeys}`);
        }
    }

    const config = categorias[tipo];
    if (!config) return;

    // Obtener participantes y evitar repetir personas mezclando el array
    const participants = groupMetadata.participants.map(p => p.id);
    if (participants.length === 0) return m.reply("❌ No hay suficientes participantes en el grupo.");

    const mezclados = shuffleArray([...participants]);
    const topSeleccionados = mezclados.slice(0, 10);

    // Construcción del diseño limpio
    let texto = `╭───━━━━━───〔 ${config.titulo} 〕───━━━━━───╮\n│\n`;
    texto += `│ 💬 *${config.frase}*\n│\n`;

    const menciones = [];

    topSeleccionados.forEach((jid, index) => {
        let num = index + 1;
        let medalla = num === 1 ? "🥇" : num === 2 ? "🥈" : num === 3 ? "🥉" : "🔹";
        let porcentaje = Math.floor(Math.random() * 31) + 70;
        
        menciones.push(jid);
        
        // Sin r de canal (@s.whatsapp.net o @g.us limpio visualmente)
        texto += `│ ${medalla} *#${num}* ➔ @${jid.split('@')[0]}\n`;
        texto += `│    └ Level: [${config.barra.repeat(3)}] ${porcentaje}%\n│\n`;
    });

    texto += `╰───━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━───╯\n`;
    texto += `> 📌 *Nota:* Resultados generados aleatoriamente.`;

    // Enviar mensaje con menciones
    await conn.sendMessage(m.chat, { text: texto, mentions: menciones }, { quoted: m });
};

// --- HANDLER AL FINAL (Estructura original) ---
handler.command = ['top', 'migajeros', 'infieles', 'fieles', 'cachudos'];
export default handler;
