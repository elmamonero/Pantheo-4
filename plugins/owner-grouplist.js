import { getAllConfigs, getConfig } from '../../db.js';

const handler = async (m, { conn }) => {
    // 🌐 Estado del modoPrivado global (manejando posibles errores de DB)
    let modoPrivadoGlobal = "❌";
    try {
        modoPrivadoGlobal = (await getConfig("global", "modoprivado")) == 1 ? "✅" : "❌";
    } catch {}

    let msgWait = await m.reply('⏳ *Obteniendo información y configuraciones de los grupos...*');

    try {
        // Obtenemos directamente solo los grupos activos donde el bot está dentro
        const groups = await conn.groupFetchAllParticipating();
        const configKeys = [
            ["antis", "🚫 Antis"],
            ["antidelete", "🗑️ Antidelete"],
            ["modoprivado", "🔒 ModoPrivado"],
            ["apagado", "🛑 Apagado"],
            ["modoadmins", "👮‍♂️ Solo Admins"],
            ["antiarabe", "🚷 AntiArabe"],
            ["antilink", "🔗 AntiLink WA"],
            ["linkall", "🌐 AntiLink All"],
            ["welcome", "👋 Bienvenida"],
            ["despedidas", "👋 Despedida"]
        ];

        const resultLines = [];

        for (const [id, data] of Object.entries(groups)) {
            const name = data.subject || "Sin nombre";
            
            // Obtenemos configuraciones individuales de cada grupo de forma segura
            let config = {};
            try {
                config = getAllConfigs(id) || {};
            } catch {
                config = {};
            }

            const stateLines = configKeys.map(([k, label]) => {
                const active = config[k] == 1 ? "✅" : "❌";
                return `${label.padEnd(16)}: ${active}`;
            }).join("\n");

            let link = "🔒 No soy admin / Sin enlace";
            try {
                const code = await conn.groupInviteCode(id);
                if (code) link = `https://chat.whatsapp.com/${code}`;
            } catch {}

            resultLines.push(`╭───────────────\n📛 *${name}*\n🔗 *Enlace:* ${link}\n${stateLines}\n╰───────────────\n`);
        }

        const listado = resultLines.length
            ? resultLines.join("\n")
            : "❌ No se encontraron grupos activos.";

        const replyText = `🌐 *Modo Privado Global:* ${modoPrivadoGlobal}\n\n📋 *Listado de grupos y sus configuraciones:*\n\n${listado}`;

        await conn.reply(m.chat, replyText, m);
        
    } catch (e) {
        console.error(e);
        await conn.reply(m.chat, '❌ Ocurrió un error al obtener el listado de grupos.', m);
    }
};

handler.help = ['vergrupos'];
handler.tags = ['owner'];
handler.command = /^(vergrupos|gruposconfig|configrupos)$/i;
handler.rowner = true;
handler.private = true;

export default handler;
