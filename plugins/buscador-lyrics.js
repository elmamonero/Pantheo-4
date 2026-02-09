/* Lyrics By WillZek 
- Adaptado para Sylphy API por Gemini
*/

import fetch from 'node-fetch';
import yts from 'yt-search';

let handler = async(m, { conn, text, usedPrefix, command }) => {

  if (!text) return m.reply('*[ 🔍 ] Ingrese el nombre de una canción para buscar la letra.*');

  try {
    // Log para ver que estamos consultando la nueva API
    console.log(`[INFO] Buscando letra en Sylphy para: ${text}`);

    const api = `https://sylphy.xyz/search/lyrics?title=${encodeURIComponent(text)}&api_key=Stellar`;
    
    let responde = await fetch(api);
    let json = await responde.json();

    if (!json.status || !json.result) {
      return m.reply('*[ ❌ ] No se encontró la letra de esta canción.*');
    }

    let crow = json.result;

    // Buscamos la imagen de la canción en YouTube ya que la API de letras no da imagen
    let res = await yts(text);
    let thumb = res.videos[0]?.thumbnail || 'https://telegra.ph/file/243e111fef951ecc20f4c.png';

    let txt = `🎵 *Título:* ${crow.title}\n`;
    txt += `👤 *Artista:* ${crow.artist || 'Desconocido'}\n`;
    txt += `💿 *Álbum:* ${crow.album || 'Desconocido'}\n`;
    txt += `⏱️ *Duración:* ${crow.duration || 'Desconocida'}\n\n`;
    txt += `📜 *Letra:*\n\n${crow.lyrics}`;

    // Enviamos el mensaje con la imagen encontrada y la letra
    await conn.sendMessage(m.chat, { 
      image: { url: thumb }, 
      caption: txt 
    }, { quoted: m });

    console.log(`[SUCCESS] Letra de "${crow.title}" enviada con éxito.`);

  } catch (e) {
    console.log(`[ERROR] Error en el comando letras:`, e);
    m.reply('*[ ❌ ] Ocurrió un error al obtener la letra de su canción.*');
  }
};

handler.help = ['lyrics'];
handler.tags = ['buscador'];
handler.command = ['letra', 'lyric', 'lyrics', 'lirik'];

export default handler;
