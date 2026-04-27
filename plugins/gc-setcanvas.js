import fs from 'fs';

const handler = async (m, { conn, text, command }) => {  
  // Inicializar la estructura de Canvas en la base de datos
  if (!global.db.data) global.db.data = {};
  if (!global.db.data.canvas) global.db.data.canvas = {};
  
  const chatId = m.chat;
  if (!global.db.data.canvas[chatId]) {
    global.db.data.canvas[chatId] = {};
  }

  const groupCanvas = global.db.data.canvas[chatId]; 

  // --- COMANDO: .canvas ---
  if (command === 'canvas') {  
    const keys = Object.keys(groupCanvas);
    if (keys.length === 0) {  
      return m.reply("🎨✨ **No hay información de Canvas configurada en este grupo** ✨"); 
    }  

    // Retorna la información guardada
    let CanvasMessage = `🖌️ *INFO DE CUENTA CANVAS* 🖌️\n\n${keys[0]}`; 
    m.reply(CanvasMessage); 
  }  

  // --- COMANDO: .setcanvas ---
  if (command === 'setcanvas') {  
    if (!text) {  
      return m.reply("𝙀𝙨𝙘𝙧𝙞𝙗𝙚 los datos de la cuenta o el enlace de invitación 🎨."); 
    }  

    // Guardamos los datos nuevos para este grupo
    global.db.data.canvas[chatId] = {}; 
    global.db.data.canvas[chatId][text] = true; 
    
    try {
        fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2)); 
        m.reply(`✅ *𝙄𝙣𝙛𝙤 𝙙𝙚 𝘾𝙖𝙣𝙫𝙖𝙨 𝘼𝙘𝙩𝙪𝙖𝙡𝙞𝙯𝙖𝙙𝙖* 🎨`);  
    } catch (e) {
        m.reply(`❌ Error al guardar: ${e.message}`);
    }
  }  

  // --- COMANDO: .resetcanvas ---
  if (command === 'resetcanvas') {
    global.db.data.canvas[chatId] = {}; 
    try {
        fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2)); 
        m.reply(`🗑️ *𝙇𝙖 𝙞𝙣𝙛𝙤 𝙙𝙚 𝘾𝙖𝙣𝙫𝙖𝙨 𝙝𝙖 𝙨𝙞𝙙𝙤 𝙗𝙤𝙧𝙧𝙖𝙙𝙖*`);
    } catch (e) {
        m.reply(`❌ Error al resetear: ${e.message}`);
    }
  }
};  

handler.help = ['canvas', 'setcanvas', 'resetcanvas'];  
handler.tags = ['group'];  
handler.command = /^(canvas|setcanvas|resetcanvas)$/i; 
handler.admin = true;  

export default handler;
