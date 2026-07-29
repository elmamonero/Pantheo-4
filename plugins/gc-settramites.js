import fs from 'fs';

// Handler para el comando de stock  
const handler = async (m, { conn, text, chat }) => {  
  const datas = global;  
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;  

  // Obtener el ID del grupo o chat actual  
  const chatId = m.chat;  

  // Inicializar stock para este grupo si no existe  
  if (!global.db.data.stock) {  
    global.db.data.stock = {};  
  }  
  if (!global.db.data.stock[chatId]) {  
    global.db.data.stock[chatId] = {};  
  }  

  const groupStock = global.db.data.stock[chatId]; // Stock específico del grupo  

  // Comando para consultar el stock  
  if (m.text.startsWith('.stock')) {  
    if (Object.keys(groupStock).length === 0) {  
      m.reply("🧑‍💼✨ **𝐈𝐧𝐯𝐞𝐧𝐭𝐚𝐫𝐢𝐨 𝐯𝐚𝐜𝐢𝐨** ✨"); // Mensaje si no hay productos  
      return;  
    }  

    let stockMessage = '';  
    for (const product in groupStock) {  
      stockMessage += `${product}\n`; // Agregar solo el nombre del producto  
    }  

    m.reply(stockMessage.trim()); // Enviar la lista de stocks sin otro texto adicional  
    return;  
  }  

  // Comando para establecer el stock  
  if (m.text.startsWith('.settramites')) {  
    if (!text) {  
      m.reply("𝙀𝙨𝙘𝙧𝙞𝙗𝙚 𝙩𝙪 𝙨𝙩𝙤𝙘𝙠📦."); // Mensaje de uso correcto  
      return;  
    }  

    const product = text; // Usar todo el texto como producto  

    // Eliminar stocks anteriores y agregar el nuevo producto al stock
    global.db.data.stock[chatId] = {}; // Reiniciar el stock específico del grupo  
    global.db.data.stock[chatId][product] = true; // Almacenar el producto como existente  
    fs.writeFileSync('./database.json', JSON.stringify(global.db)); // Guardar los cambios en la base de datos
    m.reply(`𝙎𝙩𝙤𝙘𝙠 𝘼𝙘𝙩𝙪𝙖𝙡𝙞𝙯𝙖𝙙𝙤📦`);  
  }  
};  

handler.help = ['tramites', 'settramites <producto>', 'resettramites'];  
handler.tags = ['group'];  
handler.command = ['tramite', 'settramites', 'resettramites', 'tramites', 'settramite'];  
handler.admin = true;  

export default handler;
