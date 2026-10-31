let handler = async (m, { conn }) => {
    let mssg = await m.reply('⏳ *Obteniendo y analizando la lista de grupos activos... Por favor espera.*');
    
    try {
        const botJid = conn.decodeJid(conn.user.id);
        
        // Filtramos solo los chats que son grupos de WhatsApp
        const groupList = Object.keys(conn.chats).filter(jid => jid.endsWith('@g.us'));
        let txt = '';
        let activeCount = 0;

        for (let jid of groupList) {
            let groupMetadata = {};
            try {
                // Obtenemos los metadatos frescos del grupo
                groupMetadata = await conn.groupMetadata(jid);
            } catch {
                continue; // Si el grupo ya no existe o dio error, lo saltamos de inmediato
            }

            const participants = groupMetadata.participants || [];
            
            // Verificamos si el bot realmente sigue dentro del grupo
            const isParticipant = participants.some(u => conn.decodeJid(u.id) === botJid);
            if (!isParticipant) continue; // Si ya no estamos en este grupo, no lo mostramos

            activeCount++;
            
            // Verificamos si el bot es admin
            const botUser = participants.find(u => conn.decodeJid(u.id) === botJid) || {};
            const isBotAdmin = botUser?.admin === 'admin' || botUser?.admin === 'superadmin' || Boolean(botUser?.admin);

            let inviteLink = '--- (No admin) ---';
            if (isBotAdmin) {
                try {
                    let code = await conn.groupInviteCode(jid);
                    inviteLink = code ? `https://chat.whatsapp.com/${code}` : '--- (Error) ---';
                } catch {
                    inviteLink = '--- (Sin permisos) ---';
                }
            }

            txt += `*◉ Grupo ${activeCount}*\n`;
            txt += `    *➤ Nombre:* ${groupMetadata.subject || 'Desconocido'}\n`;
            txt += `    *➤ ID:* ${jid}\n`;
            txt += `    *➤ Admin:* ${isBotAdmin ? '✔ Sí' : '❌ No'}\n`;
            txt += `    *➤ Total Participantes:* ${participants.length}\n`;
            txt += `    *➤ Link:* ${inviteLink}\n\n`;
        }

        if (activeCount === 0) {
            return conn.reply(m.chat, '❌ No se encontraron grupos activos donde el bot esté presente.', m);
        }

        await conn.reply(m.chat, `*Lista de grupos activos del Bot* 🤖\n\n*—◉ Total de grupos reales:* ${activeCount}\n\n${txt}`.trim(), m);
        
    } catch (e) {
        console.error(e);
        await conn.reply(m.chat, '❌ Ocurrió un error al obtener la lista de grupos.', m);
    }
};

handler.help = ['groups', 'grouplist'];
handler.tags = ['owner'];
handler.command = /^(groups|grouplist|listadegrupo|gruposlista|listagrupos|listgroup)$/i;
handler.rowner = true;
handler.private = true;

export default handler;
