let handler = async (m, { conn, args, usedPrefix, command }) => {
    let isClose = {
        'abrir': 'not_announcement',
        'cerrar': 'announcement',
    }[(args[0] || '').toLowerCase()];

    if (isClose === undefined) {
        // Se eliminó 'rcanal' para que no salga el enlace al canal
        return await conn.reply(m.chat, `*🔐 Elige una opción.*\n\n*${usedPrefix + command}* abrir\n*${usedPrefix + command}* cerrar`, m);
    }

    try {
        await conn.groupSettingUpdate(m.chat, isClose);
        // El bot realizará la acción sin enviar mensajes adicionales de confirmación
    } catch (err) {
        console.error('Error en groupSettingUpdate:', err);
        await conn.reply(m.chat, `⚠️ Error al actualizar la configuración del grupo: ${err.message || err}`, m);
    }
};

handler.help = ['group *<abrir/cerrar>*'];
handler.tags = ['gc'];
handler.command = ['group', 'grupo'];
handler.admin = true;
handler.botAdmin = true;

export default handler;
