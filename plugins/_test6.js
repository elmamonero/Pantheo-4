import cron from 'node-cron';
import moment from 'moment-timezone';

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

// Objeto global para almacenar las tareas activas y evitar duplicados por grupo
if (!global.scheduledTasks) {
  global.scheduledTasks = {};
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const isGroup = m.chat.endsWith('@g.us');

  if (!isGroup) {
    return conn.reply(m.chat, '❌ Este comando solo puede ser utilizado en grupos.', m);
  }

  // Verificar que existan los parámetros mínimos: [acción, hora, país]
  if (!args[0] || !args[1] || !args[2]) {
    return conn.reply(m.chat, `⚙️ *Uso correcto:*\n\n*${usedPrefix}${command} abrir 10:35 cl*\n*${usedPrefix}${command} cerrar 23:56 ar*`, m);
  }

  const accion = args[0].toLowerCase(); // 'abrir' o 'cerrar'
  const horaInput = args[1]; // 'HH:MM'
  const paisCodigo = args[2].toLowerCase(); // 'pe', 'cl', 'ar', etc.

  if (accion !== 'abrir' && accion !== 'cerrar') {
    return conn.reply(m.chat, '❌ Acción inválida. Usa *abrir* o *cerrar*.', m);
  }

  // Validar formato de hora (HH:MM)
  const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!horaRegex.test(horaInput)) {
    return conn.reply(m.chat, '❌ Formato de hora inválido. Usa el formato de 24 horas (ej: 13:21).', m);
  }

  // Validar si el país está soportado
  const timezone = timezones[paisCodigo];
  if (!timezone) {
    return conn.reply(m.chat, '❌ Zona horaria no soportada. Usa códigos válidos como: pe, cl, ar, ve, co, mx, es.', m);
  }

  await m.react('🕒');

  // Extraer hora y minutos
  const [hora, minuto] = horaInput.split(':');

  // Identificador único para la tarea de este grupo y esta acción (abrir o cerrar)
  const taskKey = `${m.chat}_${accion}`;

  // Si ya existía una programación previa para esa acción en este grupo, la cancelamos antes de crear la nueva
  if (global.scheduledTasks[taskKey]) {
    global.scheduledTasks[taskKey].stop();
  }

  // Expresión Cron para ejecutarse TODOS los días a la hora especificada
  const cronExpression = `${minuto} ${hora} * * *`;

  // Programar la tarea diaria respetando la zona horaria indicada
  global.scheduledTasks[taskKey] = cron.schedule(cronExpression, async () => {
    try {
      if (accion === 'abrir') {
        await conn.groupSettingUpdate(m.chat, 'not_announcement'); 
        await conn.sendMessage(m.chat, { text: '🔓 *El grupo ha sido abierto*\n\nAhora todos los participantes pueden enviar mensajes... ✨' });
      } else if (accion === 'cerrar') {
        await conn.groupSettingUpdate(m.chat, 'announcement'); 
        await conn.sendMessage(m.chat, { text: '🔒 *El grupo ha sido cerrado*\n\nAhora solo los administradores pueden enviar mensajes... 💤' });
      }
    } catch (error) {
      console.error(`Error al ejecutar la acción diaria ${accion} en el grupo ${m.chat}:`, error);
    }
  }, {
    scheduled: true,
    timezone: timezone
  });

  await m.react('✅');

  // Nombres estéticos para el mensaje de configuración siguiendo el estilo de la imagen 71084.jpg
  const paisesNombres = { 'pe': 'Perú 🇵🇪', 'cl': 'Chile 🇨🇱', 'ar': 'Argentina 🇦🇷', 've': 'Venezuela 🇻🇪', 'co': 'Colombia 🇨🇴', 'mx': 'México 🇲🇽', 'es': 'España 🇪🇸' };
  const paisNombre = paisesNombres[paisCodigo] || paisCodigo.toUpperCase();

  const responseText = `✅ *Programación establecida correctamente.*\n\n` +
                       `⌒ Action › *${accion.charAt(0).toUpperCase() + accion.slice(1)}*\n` +
                       `め Hour › *${horaInput}*\n` +
                       `❈ Zone › *${paisNombre}*`;

  await conn.sendMessage(m.chat, { text: responseText }, { quoted: m });
};

handler.help = ['grupoprueba'];
handler.tags = ['grupo'];
// Aseguramos la expresión regular para que acepte "grupoprueba" de forma estricta e independiente del prefijo
handler.command = /^grupoprueba$/i;

export default handler;
