const { groupSettingUpdate } = require('@whiskeysockets/baileys'); // Asegúrate de importar lo necesario según tu base
const cron = require('node-cron');
const moment = require('moment-timezone');

// Mapeo de prefijos de países a sus respectivas Timezones de IANA
const timezones = {
    'pe': 'America/Lima',
    'cl': 'America/Santiago',
    'ar': 'America/Argentina/Buenos_Aires',
    've': 'America/Caracas',
    'co': 'America/Bogota',
    'mx': 'America/Mexico_City',
    'es': 'Europe/Madrid'
};

// Objeto para almacenar las tareas activas y evitar duplicados por grupo
if (!global.scheduledTasks) {
    global.scheduledTasks = {};
}

async function handleGrupoCommand(client, msg, args) {
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');

    if (!isGroup) {
        return client.sendMessage(from, { text: '❌ Este comando solo puede ser utilizado en grupos.' }, { quoted: msg });
    }

    // Verificar que existan los parámetros mínimos: [acción, hora, zona]
    if (args.length < 3) {
        return client.sendMessage(from, { text: '⚙️ *Uso correcto:*\n`.grupo abrir 10:35 cl`\n`.grupo cerrar 23:56 ar`' }, { quoted: msg });
    }

    const accion = args[0].toLowerCase(); // 'abrir' o 'cerrar'
    const horaInput = args[1]; // 'HH:MM'
    const paisCodigo = args[2].toLowerCase(); // 'pe', 'cl', 'ar', etc.

    if (accion !== 'abrir' && accion !== 'cerrar') {
        return client.sendMessage(from, { text: '❌ Acción inválida. Usa *abrir* o *cerrar*.' }, { quoted: msg });
    }

    // Validar formato de hora (HH:MM)
    const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(horaInput)) {
        return client.sendMessage(from, { text: '❌ Formato de hora inválido. Usa el formato de 24 horas (ej: 13:21).' }, { quoted: msg });
    }

    // Validar si el país está soportado en nuestro objeto
    const timezone = timezones[paisCodigo];
    if (!timezone) {
        return client.sendMessage(from, { text: '❌ Zona horaria no soportada. Usa códigos válidos como: pe, cl, ar, ve, co, mx, es.' }, { quoted: msg });
    }

    // Extraer hora y minutos
    const [hora, minuto] = horaInput.split(':');

    // Identificador único para la tarea de este grupo y esta acción en específico
    const taskKey = `${from}_${accion}`;

    // Si ya existía una programación previa para esa acción en este grupo, la cancelamos para actualizarla
    if (global.scheduledTasks[taskKey]) {
        global.scheduledTasks[taskKey].stop();
    }

    // Expresión Cron para ejecutarse TODOS los días a la hora especificada
    // Formato: (minuto) (hora) (día del mes) (mes) (día de la semana)
    const cronExpression = `${minuto} ${hora} * * *`;

    // Programar la tarea diaria respetando la zona horaria indicada
    global.scheduledTasks[taskKey] = cron.schedule(cronExpression, async () => {
        try {
            if (accion === 'abrir') {
                await client.groupSettingUpdate(from, 'not_announcement'); // Abre el grupo a todos
                await client.sendMessage(from, { text: '🔓 *El grupo ha sido abierto*\n\nAhora todos los participantes pueden enviar mensajes... ✨' });
            } else if (accion === 'cerrar') {
                await client.groupSettingUpdate(from, 'announcement'); // Cierra el grupo (solo admins)
                await client.sendMessage(from, { text: '🔒 *El grupo ha sido cerrado*\n\nAhora solo los administradores pueden enviar mensajes... 💤' });
            }
        } catch (error) {
            console.error(`Error al ejecutar la acción programada ${accion} en el grupo ${from}:`, error);
        }
    }, {
        scheduled: true,
        timezone: timezone
    });

    // Obtener el nombre del país para el mensaje estético de confirmación
    const paisesNombres = { 'pe': 'Perú 🇵🇪', 'cl': 'Chile 🇨🇱', 'ar': 'Argentina 🇦🇷', 've': 'Venezuela 🇻🇪', 'co': 'Colombia 🇨🇴', 'mx': 'México 🇲🇽', 'es': 'España 🇪🇸' };
    const paisNombre = countriesNames[paisCodigo] || paisCodigo.toUpperCase();

    // Mensaje de éxito idéntico al estilo del ejemplo
    const responseText = `✅ *Programación establecida correctamente.*\n\n` +
                         `⌒ Action › *${accion.charAt(0).toUpperCase() + accion.slice(1)}*\n` +
                         `め Hour › *${horaInput}*\n` +
                         `❈ Zone › *${paisNombre}*`;

    await client.sendMessage(from, { text: responseText }, { quoted: msg });
}

module.exports = { handleGrupoCommand };
