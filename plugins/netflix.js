import fs from 'fs';

const handler = async (m, { conn, text, command }) => {  
  // Inicializar la estructura de Netflix en la base de datos
  if (!global.db.data) global.db.data = {};
  if (!global.db.data.netflix) global.db.data.netflix = {};
  
  const chatId = m.chat;
  if (!global.db.data.netflix[chatId]) {
    global.db.data.netflix[chatId] = {};
  }

  const groupNetflix = global.db.data.netflix[chatId]; 

  // --- COMANDO: .netflix ---
  if (command === 'netflix') {  
    const keys = Object.keys(groupNetflix);
    if (keys.length === 0) {  
      return m.reply("🍿✨ **No hay ninguna cuenta de Netflix configurada en este grupo** ✨"); 
    }  

    // Retorna la información de la cuenta
    let NetflixMessage = `🎬 *CUENTA NETFLIX ACTUAL* 🎬\n\n${keys[0]}`; 
    m.reply(NetflixMessage); 
  }  

  // --- COMANDO: .setnetflix ---
  if (command === 'setnetflix') {  
    if (!text) {  
      return m.reply("𝙀𝙨𝙘𝙧𝙞𝙗𝙚 los datos de la cuenta (Correo:Clave:Perfil) 🍿."); 
    }  

    // Guardamos los datos nuevos para este grupo
    global.db.data.netflix[chatId] = {}; 
    global.db.data.netflix[chatId][text] = true; 
    
    try {
        fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2)); 
        m.reply(`✅ *𝘾𝙪𝙚𝙣𝙩𝙖 𝙙𝙚 𝙉𝙚𝙩𝙛𝙡𝙞𝙦 𝘼𝙘𝙩𝙪𝙖𝙡𝙞𝙯𝙖𝙙𝙖* 🍿`);  
    } catch (e) {
        m.reply(`❌ Error al guardar: ${e.message}`);
    }
  }  

  // --- COMANDO: .resetnetflix ---
  if (command === 'resetnetflix') {
    global.db.data.netflix[chatId] = {}; 
    try {
        fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2)); 
        m.reply(`🗑️ *𝙇𝙖 𝙘𝙪𝙚𝙣𝙩𝙖 𝙙𝙚 𝙉𝙚𝙩𝙛𝙡𝙞𝙭 𝙝𝙖 𝙨𝙞𝙙𝙤 𝙗𝙤𝙧𝙧𝙖𝙙𝙖 𝙙𝙚𝙡 𝙧𝙚𝙜𝙞𝙨𝙩𝙧𝙤*`);
    } catch (e) {
        m.reply(`❌ Error al resetear: ${e.message}`);
    }
  }
};  

handler.help = ['netflix', 'setnetflix', 'resetnetflix'];  
handler.tags = ['group'];  
handler.command = /^(netflix|setnetflix|resetnetflix)$/i; 
handler.admin = true;  

export default handler;
