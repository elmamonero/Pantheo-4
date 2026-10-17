function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

// Configuración fija para las categorías predeterminadas
const categorias = {
    migajeros: { titulo: "TOP 10 MIGAJEROS 🍞", emoji: "🥖" },
    infieles: { titulo: "TOP 10 INFIELES 😈", emoji: "🔥" },
    fieles: { titulo: "TOP 10 FIELES 😇", emoji: "🛡️" },
    cachudos: { titulo: "TOP 10 CACHUDOS 🤘", emoji: "🌿" }
};

let handler = async (m, { conn, args, usedPrefix, command, groupMetadata }) => {
    let cmd = command.toLowerCase();
    let primerArg = args[0] ? args[0].toLowerCase() : '';
    
    let tituloTop = "";
    let icono = "🔥";

    // 1. Detectar si la categoría coincide con las predeterminadas
    if (categorias[cmd]) {
        // Si usaron directamente el comando (.infieles, .fieles, etc.)
        tituloTop = categorias[cmd].titulo;
        icono = categorias[cmd].emoji;
    } else if (cmd === 'top' && categorias[primerArg]) {
        // Si usaron ".top infieles", ".top fieles", etc.
        tituloTop = categorias[primerArg].titulo;
        icono = categorias[primerArg].emoji;
    } else if (args.length > 0) {
        // Si pusieron cualquier otro texto (.top los más guapos)
        tituloTop = `TOP 10 ${args.join(" ").toUpperCase()}`;
    } else {
        // Si solo pusieron ".top"
        tituloTop = "TOP 10 DEL GRUPO";
    }

    // 2. Obtener miembros del grupo y mezclarlos para no repetir a nadie
    const participants = groupMetadata.participants.map(p => p.id);
    if (participants.length === 0) return m.reply("❌ No hay suficientes participantes en el grupo.");

    const mezclados = shuffleArray([...participants]);
    
    // Asegurar que sean máximo 10 personas sin repetir
    const top10 = mezclados.slice(0, 10);

    // 3. Armar el diseño visual
    let texto = `╭───━━━━━───〔 👑 ${tituloTop} 〕───━━━━━───╮\n│\n`;

    const menciones = [];

    top10.forEach((jid, index) => {
        let num = index + 1;
        let medalla = num === 1 ? "🥇" : num === 2 ? "🥈" : num === 3 ? "🥉" : "🔹";
        let porcentaje = Math.floor(Math.random() * 31) + 70; // Porcentaje entre 70% y 100%
        
        menciones.push(jid);
        
        // Mención limpia (sin @s.whatsapp.net ni @g.us visualmente)
        texto += `│ ${medalla} *#${num}* ➔ @${jid.split('@')[0]}\n`;
        texto += `│    └ Level: [${icono.repeat(3)}] ${porcentaje}%\n│\n`;
    });

    texto += `╰───━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━───╯`;

    // 4. Enviar respuesta con menciones
    await conn.sendMessage(m.chat, { text: texto, mentions: menciones }, { quoted: m });
};

// Mantiene el handler.command al final como en tu archivo original
handler.command = ['top', 'migajeros', 'infieles', 'fieles', 'cachudos'];
export default handler;
