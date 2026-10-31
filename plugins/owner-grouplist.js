let handler = async (m, { conn }) => {
    let txt = '';
    try {
        const botJid = conn.decodeJid(conn.user.id);
        const groups = Object.entries(conn.chats).filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats);
        const totalGroups = groups.length;

        for (let i = 0; i < groups.length; i++) {
            const [jid, chat] = groups[i];
            const groupMetadata = ((conn.chats[jid] || {}).metadata || (await conn.groupMetadata(jid).catch((_) => null))) || {};
            const participants = groupMetadata.participants || [];
            
            // Normalizamos la búsqueda comparando JIDs limpios con decodeJid
            const bot = participants.find((u) => conn.decodeJid(u.id) === botJid) || {};
            const isBotAdmin = bot?.admin === 'admin' || bot?.admin === 'superadmin' || Boolean(bot?.admin);
            const isParticipant = participants.some((u) => conn.decodeJid(u.id) === botJid);
            const participantStatus = isParticipant ? '👤 Participante' : '❌ Ex participante';
            const totalParticipants = participants.length;

            let inviteLink = '--- (No admin) ---';
            if (isBotAdmin) {
                try {
                    let code = await conn.groupInviteCode(jid);
                    inviteLink = code ? `https://chat.whatsapp.com/${code}` : '--- (Error al obtener) ---';
                } catch {
                    inviteLink = '--- (Sin permisos / Error) ---';
                }
            }

            txt += `*◉ Grupo ${i + 1}*\n`;
            txt += `    *➤ Nombre:* ${await conn.getName(jid)}\n`;
            txt += `    *➤ ID:* ${jid}\n`;
            txt += `    *➤ Admin:* ${isBotAdmin ? '✔ Sí' : '❌ No'}\n`;
            txt += `    *➤ Estado:* ${participantStatus}\n`;
            txt += `    *➤ Total de Participantes:* ${totalParticipants}\n`;
            txt += `    *➤ Link:* ${inviteLink}\n\n`;
        }
        
        m.reply(`*Lista de grupos del Bot* 🤖\n\n*—◉ Total de grupos:* ${totalGroups}\n\n${txt}`.trim());
    } catch (e) {
        console.error(e);
        m.reply('❌ Ocurrió un error al obtener la lista de grupos.');
    }
};

handler.help = ['groups', 'grouplist'];
handler.tags = ['owner'];
handler.command = /^(groups|grouplist|listadegrupo|gruposlista|listagrupos|listgroup)$/i;
handler.rowner = true;
handler.private = true;

export default handler;
