/* Lyrics By WillZek 
- Adaptado para Yuki API por Gemini
*/

import fetch from 'node-fetch';
import yts from 'yt-search';

let handler = async(m, { conn, text, usedPrefix, command }) => {

  if (!text) return m.reply('*[ 🔍 ] Ingrese el nombre de una canción para buscar la letra.*');

  try {
    // Log para ver la consulta en la consola
    console.log(`\x1b[36m[LYRICS]\x1b[0m Buscando letra en Yuki API para: ${text}`);

    // Configuración de la API de Yuki con su Key correspondiente
    const apiKey = 'YukiBot-MD';
    const api = `https://api.yuki-wabot.my.id/tools/lyrics?query=${encodeURIComponent(text)}&key=${apiKey}`;
    
    let responde = await fetch(api);
    if (!responde.ok) throw new Error(`HTTP Error ${responde.status}`);
    
    let json = await responde.json();

    // Validación del formato de respuesta de Yuki
    if (json?.status !== true && json?.status !== 'true' && !json?.result) {
      return m.reply('*[ ❌ ] No se encontró la letra de esta canción.*');
    }

    let crow = json.result;

    // Buscamos la imagen de la canción en YouTube ya que las APIs de letras no suelen dar imagen directa
    let res = await yts(text);
    let thumb = res.videos[0]?.thumbnail || 'https://telegra.ph/file/243e111fef951ecc20f4c.png';

    // Construcción del mensaje de texto adaptando posibles variantes en las propiedades del JSON
    let title = crow.title || crow.song || text;
    let artist = crow.artist || crow.author || 'Desconocido';
    let album = crow.album || 'Desconocido';
    let duration = crow.duration || 'Desconocida';
    let lyrics = crow.lyrics || crow.letra;

    if (!lyrics) {
      return m.reply('*[ ❌ ] La canción fue encontrada pero no contiene una letra disponible.*');
    }

    let txt = `───「 *𝖫𝗒𝗋𝗂𝖼𝗌* 」───\n\n`;
    txt += `🎵 *𝖳𝗂́𝗍𝗎𝗅𝗈:* ${title}\n`;
    txt += `👤 *𝖸𝗋𝗍𝗂𝗌𝗍𝖺:* ${artist}\n`;
    txt += `💿 *𝖠́𝗅𝖻𝗎𝗆:* ${album}\n`;
    txt += `⏱️ *𝖣𝗎𝗋𝖺𝖼𝗂𝗈́𝗇:* ${duration}\n\n`;
    txt += `📜 *𝖫𝖾𝗍𝗋𝖺:*\n\n${lyrics}\n\n`;
    txt += `⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡𝗈̣t`;

    // Enviamos el mensaje con la imagen encontrada y la letra
    await conn.sendMessage(m.chat, { 
      image: { url: thumb }, 
      caption: txt 
    }, { quoted: m });

    console.log(`\x1b[32m[✅ ÉXITO]\x1b[0m Letra de "${title}" enviada con éxito.`);

  } catch (e) {
    console.log(`\x1b[31m[❌ ERROR]\x1b[0m Error en el comando letras:`, e);
    m.reply('*[ ❌ ] Ocurrió un error al obtener la letra de su canción.*');
  }
};

handler.help = ['lyrics'];
handler.tags = ['buscador'];
handler.command = ['letra', 'lyric', 'lyrics', 'lirik'];

export default handler;