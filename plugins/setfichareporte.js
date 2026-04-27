import fs from 'fs';

// Handler para el comando de ficha de reporte
const handler = async (m, { conn, text, chat }) => {  
  const datas = global;  
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;  

  const chatId = m.chat;  

  // Inicializar fichareporte en la base de datos si no existe  
  if (!global.db.data.fichareporte) {  
    global.db.data.fichareporte = {};  
  }  
  if (!global.db.data.fichareporte[chatId]) {  
    global.db.data.fichareporte[chatId] = {};  
  }  

  const groupFicha = global.db.data.fichareporte[chatId]; 

  // Comando para consultar la ficha (.fichareporte)
  if (m.command === 'fichareporte') {  
    if (Object.keys(groupFicha).length === 0) {  
      m.reply("📋✨ **No hay fichas de reporte configuradas** ✨"); 
      return;  
    }  

    let FichaMessage = '';  
    for (const reporte in groupFicha) {  
      FichaMessage += `${reporte}\n`; 
    }  

    m.reply(FichaMessage.trim()); 
    return;  
  }  

  // Comando para establecer la ficha (.setfichareporte)
  if (m.command === 'setfichareporte') {  
    if (!text) {  
      m.reply("𝙀𝙨𝙘𝙧𝙞𝙗𝙚 𝙚𝙡 𝙘𝙤𝙣𝙩𝙚𝙣𝙞𝙙𝙤 𝙙𝙚 𝙡𝙖 𝙛𝙞𝙘𝙝𝙖 𝙙𝙚 𝙧𝙚𝙥𝙤𝙧𝙩𝙚 📋."); 
      return;  
    }  

    const contenido = text; 

    // Eliminar reportes anteriores y agregar el nuevo
    global.db.data.fichareporte[chatId] = {}; 
    global.db.data.fichareporte[chatId][contenido] = true; 
    
    fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2)); 
    m.reply(`✅ *𝙁𝙞𝙘𝙝𝙖 𝙙𝙚 𝙍𝙚𝙥𝙤𝙧𝙩𝙚 𝘼𝙘𝙩𝙪𝙖𝙡𝙞𝙯𝙖𝙙𝙖* 📋`);  
    return;
  }  

  // Comando para resetear la ficha (.resetfichareporte)
  if (m.command === 'resetfichareporte') {
    global.db.data.fichareporte[chatId] = {}; 
    fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2)); 
    m.reply(`🗑️ *𝙇𝙖 𝙛𝙞𝙘𝙝𝙖 𝙙𝙚 𝙧𝙚𝙥𝙤𝙧𝙩e 𝙝𝙖 𝙨𝙞𝙙𝙤 𝙗𝙤𝙧𝙧𝙖𝙙𝙖*`);
  }
};  

handler.help = ['fichareporte', 'setfichareporte <texto>', 'resetfichareporte'];  
handler.tags = ['group'];  
handler.command = ['fichareporte', 'setfichareporte', 'resetfichareporte'];  
handler.admin = true;  

export default handler;
