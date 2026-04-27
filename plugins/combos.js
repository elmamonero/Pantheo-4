import fs from 'fs';

const handler = async (m, { conn, text, command }) => {  
  // Inicializar la estructura de Combos en la base de datos
  if (!global.db.data) global.db.data = {};
  if (!global.db.data.combos) global.db.data.combos = {};
  
  const chatId = m.chat;
  if (!global.db.data.combos[chatId]) {
    global.db.data.combos[chatId] = {};
  }

  const groupCombos = global.db.data.combos[chatId]; 

  // --- COMANDO: .combos ---
  if (command === 'combos') {  
    const keys = Object.keys(groupCombos);
    if (keys.length === 0) {  
      return m.reply("📦✨ **No hay combos configurados en este grupo** ✨"); 
    }  

    // Retorna la información de los paquetes
    let CombosMessage = `🎁 *NUESTROS COMBOS ACTIVOS* 🎁\n\n${keys[0]}`; 
    m.reply(CombosMessage); 
  }  

  // --- COMANDO: .setcombos ---
  if (command === 'setcombos') {  
    if (!text) {  
      return m.reply("𝙀𝙨𝙘𝙧𝙞𝙗𝙚 la lista de combos y sus precios 📦."); 
    }  

    // Guardamos la nueva lista para este grupo
    global.db.data.combos[chatId] = {}; 
    global.db.data.combos[chatId][text] = true; 
    
    try {
        fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2)); 
        m.reply(`✅ *𝙇𝙞𝙨𝙩𝙖 𝙙𝙚 𝘾𝙤𝙢𝙗𝙤𝙨 𝘼𝙘𝙩𝙪𝙖𝙡𝙞𝙯𝙖𝙙𝙖* 🎁`);  
    } catch (e) {
        m.reply(`❌ Error al guardar: ${e.message}`);
    }
  }  

  // --- COMANDO: .resetcombos ---
  if (command === 'resetcombos') {
    global.db.data.combos[chatId] = {}; 
    try {
        fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2)); 
        m.reply(`🗑️ *𝙇𝙤𝙨 𝙘𝙤𝙢𝙗𝙤𝙨 𝙝𝙖𝙣 𝙨𝙞𝙙𝙤 𝙗𝙤𝙧𝙧𝙖𝙙𝙤𝙨 𝙙𝙚𝙡 𝙧𝙚𝙜𝙞𝙨𝙩𝙧𝙤*`);
    } catch (e) {
        m.reply(`❌ Error al resetear: ${e.message}`);
    }
  }
};  

handler.help = ['combos', 'setcombos', 'resetcombos'];  
handler.tags = ['group'];  
handler.command = /^(combos|setcombos|resetcombos)$/i; 
handler.admin = true;  

export default handler;
