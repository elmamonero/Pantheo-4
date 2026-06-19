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

    // Validación flexible del formato de respuesta de Yuki
    if (!json || (json.status !== true && json.status !== 'true' && !json.result && !json.data)) {
      return m.reply('*[ ❌ ] No se encontró la letra de esta canción.*');
    }

    // EXTRA_PROTECCIÓN: Mapeamos si la API responde en 'result' o en 'data'
    let crow = json.result || json.data || {};

    // Extraemos la letra primero para verificar si existe antes de continuar
    let lyrics = crow.lyrics || crow.letra || json.lyrics;

    if (!lyrics) {
      return m.reply('*[ ❌ ] No se encontró la letra de esta canción o el servidor no devolvió datos válidos.*');
    }

    // Buscamos la imagen de la canción en YouTube ya que las APIs de letras no suelen dar imagen directa
    let res = await yts(text);
    let thumb = res.videos[0]?.thumbnail || 'https://telegra.ph/file/243e111fef951ecc20f4c.png';

    // Construcción segura usando encadenamiento opcional (?.) para evitar caídas
    let title = crow?.title || crow?.song || res.videos[0]?.title || text;
    let artist = crow?.artist || crow?.author || res.videos[0]?.author?.name || 'Desconocido';
    let album = crow?.album || 'Desconocido';
    let duration = crow?.duration || res.videos[0]?.timestamp || 'Desconocida';

    let txt = `───「 *𝖫𝗒𝗋𝗂𝖼𝗌* 」───\n\n`;
    txt += `🎵 *𝖢𝖺𝗇𝖼𝗂𝗈́𝗇:* ${title}\n`;
    txt += `👤 *𝖠𝗋𝗍𝗂𝗌𝗍𝖺:* ${artist}\n`;
    txt += `💿 *𝖠́𝗅𝖻𝗎𝗆:* ${album}\n`;
    txt += `⏱️ *𝖣𝗎𝗋𝖺𝖼𝗂𝗈́𝗇:* ${duration}\n\n`;
    txt += `📜 *𝖫𝖾𝗍𝗋𝖺:*\n\n${lyrics}\n\n`;
    txt += `⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡ot`;

    // Enviamos el mensaje con la imagen encontrada y la letra
    await conn.sendMessage(m.chat, { 
      image: { url: thumb }, 
      caption: txt 
    }, { quoted: m });

    console.log(`\x1b[32m[✅ ÉXITO]\x1b[0m Letra de "${title}" enviada con éxito.`);

  } catch (e) {
    console.log(`\x1b[31m[❌ ERROR]\x1b[0m Error en el comando letras:`, e.message);
    m.reply('*[ ❌ ] Ocurrió un error al obtener la letra de su canción.*');
  }
};

handler.help = ['lyrics'];
handler.tags = ['buscador'];
handler.command = ['letra', 'lyric', 'lyrics', 'lirik'];

export default handler;