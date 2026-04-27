import fs from 'fs';

const handler = async (m, { conn, text, command }) => {  
  // Inicializar la estructura en la base de datos si no existe
  if (!global.db.data) global.db.data = {};
  if (!global.db.data.fichareporte) global.db.data.fichareporte = {};
  
  const chatId = m.chat;
  if (!global.db.data.fichareporte[chatId]) {
    global.db.data.fichareporte[chatId] = {};
  }

  const groupFicha = global.db.data.fichareporte[chatId]; 

  // --- COMANDO: .fichareporte ---
  if (command === 'fichareporte') {  
    const keys = Object.keys(groupFicha);
    if (keys.length === 0) {  
      return m.reply("📋✨ **No hay fichas de reporte configuradas** ✨"); 
    }  

    // Retorna el contenido guardado
    let FichaMessage = keys[0]; 
    m.reply(FichaMessage); 
  }  

  // --- COMANDO: .setfichareporte ---
  if (command === 'setfichareporte') {  
    if (!text) {  
      return m.reply("𝙀𝙨𝙘𝙧𝙞𝙗𝙚 𝙚𝙡 𝙘𝙤𝙣𝙩𝙚𝙣𝙞𝙙𝙤 𝙙𝙚 𝙡𝙖 𝙛𝙞𝙘𝙝𝙖 𝙙𝙚 𝙧𝙚𝙥𝙤𝙧𝙩𝙚 📋."); 
    }  

    // Limpiamos lo anterior y guardamos lo nuevo
    global.db.data.fichareporte[chatId] = {}; 
    global.db.data.fichareporte[chatId][text] = true; 
    
    // Guardar en disco
    try {
        fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2)); 
        m.reply(`✅ *𝙁𝙞𝙘𝙝𝙖 𝙙𝙚 𝙍𝙚𝙥𝙤𝙧𝙩𝙚 𝘼𝙘𝙩𝙪𝙖𝙡𝙞𝙯𝙖𝙙𝙖* 📋`);  
    } catch (e) {
        m.reply(`❌ Error al guardar: ${e.message}`);
    }
  }  

  // --- COMANDO: .resetfichareporte ---
  if (command === 'resetfichareporte') {
    global.db.data.fichareporte[chatId] = {}; 
    try {
        fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2)); 
        m.reply(`🗑️ *𝙇𝙖 𝙛𝙞𝙘𝙝𝙖 𝙙𝙚 𝙧𝙚𝙥𝙤𝙧𝙩e 𝙝𝙖 𝙨𝙞𝙙𝙤 𝙗𝙤𝙧𝙧𝙖𝙙𝙖*`);
    } catch (e) {
        m.reply(`❌ Error al resetear: ${e.message}`);
    }
  }
};  

handler.help = ['fichareporte', 'setfichareporte', 'resetfichareporte'];  
handler.tags = ['group'];  
handler.command = /^(fichareporte|setfichareporte|resetfichareporte)$/i; // Expresión regular para mayor compatibilidad
handler.admin = true;  

export default handler;
