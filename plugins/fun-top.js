function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

// Categorías predeterminadas
const categorias = {
    migajeros: { titulo: "MIGAJEROS 🍞", emoji: "🥖" },
    infieles: { titulo: "INFIELES 😈", emoji: "🔥" },
    fieles: { titulo: "FIELES 😇", emoji: "🛡️" },
    cachudos: { titulo: "CACHUDOS 🤘", emoji: "🌿" }
};

let handler = async (m, { conn, args, usedPrefix, command, groupMetadata }) => {
    let cmd = command.toLowerCase();
    let textoArg = args.join(" ").trim();
    let primerArg = args[0] ? args[0].toLowerCase() : '';
    
    let tituloTop = "";
    let icono = "🔥";

    // 1. Validar si solo ponen ".top" sin texto
    if (cmd === 'top' && !textoArg) {
        return m.reply(`⚠️ *Debes ingresar un tema para el Top.*\n\n📌 *Ejemplo:* \n> ${usedPrefix}top los más guapos\n> ${usedPrefix}top infieles`);
    }

    // 2. Detectar si es categoría fija o texto libre
    if (categorias[cmd]) {
        tituloTop = categorias[cmd].titulo;
        icono = categorias[cmd].emoji;
    } else if (cmd === 'top' && categorias[primerArg]) {
        tituloTop = categorias[primerArg].titulo;
        icono = categorias[primerArg].emoji;
    } else {
        tituloTop = `${textoArg.toUpperCase()}`;
    }

    // 3. Obtener participantes del grupo
    const participants = groupMetadata.participants.map(p => p.id);
    if (participants.length === 0) return m.reply("❌ No hay suficientes participantes en el grupo.");

    const mezclados = shuffleArray([...participants]);
    const top10 = mezclados.slice(0, 10);
    const totalMostrados = top10.length;

    // 4. Diseñar el mensaje dinámico (se adapta bonito sin importar cuántos hayan)
    let texto = `👑 *TOP ${totalMostrados} ${tituloTop}*\n`;
    texto += `───────────────\n\n`;

    const menciones = [];

    top10.forEach((jid, index) => {
        let num = index + 1;
        let medalla = num === 1 ? "🥇" : num === 2 ? "🥈" : num === 3 ? "🥉" : "🔹";
        let porcentaje = Math.floor(Math.random() * 31) + 70; // Entre 70% y 100%
        
        menciones.push(jid);
        
        let tag = `@${jid.split('@')[0]}`;
        texto += `${medalla} *#${num}* • ${tag}\n`;
        texto += `┗ Nivel: [${icono.repeat(3)}] ${porcentaje}%\n\n`;
    });

    texto += `───────────────`;

    // 5. Enviar mensaje con tags
    await conn.sendMessage(m.chat, { text: texto, mentions: menciones }, { quoted: m });
};

handler.command = ['top', 'migajeros', 'infieles', 'fieles', 'cachudos'];
export default handler;
