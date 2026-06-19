/* Lyrics By WillZek 
- Adaptado para Stellar-v2 y Yuki APIs por Gemini
*/

import fetch from 'node-fetch';
import yts from 'yt-search';

// Configuración de las APIs de letras y sus respectivas llaves del play
const APIS = [
  {
    name: 'Stellar-v2-Lyrics',
    url: 'https://api.stellarwa.xyz/tools/lyrics?query=',
    key: 'stellarwa-2026.xyz@maia@20-12-2025',
    parseData: (json) => {
      // Intenta leer formato directo o primer elemento de un array si existiera
      let target = json?.result || json?.data;
      if (Array.isArray(target)) target = target[0];
      return target ? {
        title: target.title || target.song,
        artist: target.artist || target.author,
        album: target.album,
        duration: target.duration,
        lyrics: target.lyrics || target.letra
      } : null;
    }
  },
  {
    name: 'Yuki-Lyrics',
    url: 'https://api.yuki-wabot.my.id/tools/lyrics?query=',
    key: 'YukiBot-MD',
    parseData: (json) => {
      // Mapeo específico para el formato de array en 'data' que usa Yuki
      if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
        let target = json.data[0];
        return {
          title: target.title,
          artist: target.artist,
          album: target.album,
          duration: target.duration, // Viene en segundos enteros
          lyrics: target.lyrics || target.letra
        };
      }
      return null;
    }
  }
];

let handler = async(m, { conn, text, usedPrefix, command }) => {

  if (!text) return m.reply('*[ 🔍 ] Ingrese el nombre de una canción para buscar la letra.*');

  let lyricData = null;
  let apiUsed = '';

  // Bucle para intentar obtener la letra de las APIs en cadena
  for (const api of APIS) {
    console.log(`\x1b[36m[LYRICS]\x1b[0m Intentando buscar letra con: ${api.name}...`);
    try {
      const apiUrl = `${api.url}${encodeURIComponent(text)}&key=${api.key}`;
      let response = await fetch(apiUrl);
      
      if (response.ok) {
        let json = await response.json();
        
        if (json?.status === true || json?.status === 'true') {
          let parsed = api.parseData(json);
          if (parsed && parsed.lyrics) {
            lyricData = parsed;
            apiUsed = api.name;
            console.log(`\x1b[32m[✅ ÉXITO]\x1b[0m Datos obtenidos de: ${api.name}`);
            break; // Rompemos el ciclo si encontramos resultados válidos
          }
        }
      }
      console.log(`\x1b[33m[⚠️ API ${api.name}]\x1b[0m No devolvió resultados válidos. Saltando...`);
    } catch (err) {
      console.log(`\x1b[31m[❌ API ${api.name}]\x1b[0m Falló por red o error de servidor.`);
    }
  }

  // Si ninguna API dio resultados
  if (!lyricData) {
    return m.reply('*[ ❌ ] No se encontró la letra de esta canción en ninguna de las fuentes disponibles.*');
  }

  try {
    // Buscamos la imagen de la canción en YouTube de apoyo visual
    let res = await yts(text);
    let thumb = res.videos[0]?.thumbnail || 'https://telegra.ph/file/243e111fef951ecc20f4c.png';

    // Asignación de variables encontradas
    let title = lyricData.title || res.videos[0]?.title || text;
    let artist = lyricData.artist || res.videos[0]?.author?.name || 'Desconocido';
    let album = lyricData.album || 'Single';
    
    // Tratamiento de la duración (si es número entero asumimos segundos)
    let duration = 'Desconocida';
    if (lyricData.duration && !isNaN(lyricData.duration)) {
      let mins = Math.floor(lyricData.duration / 60);
      let secs = Math.floor(lyricData.duration % 60);
      duration = `${mins}:${secs.toString().padStart(2, '0')}`;
    } else {
      duration = lyricData.duration || res.videos[0]?.timestamp || 'Desconocida';
    }

    let txt = `───「 *𝖫𝗒𝗋𝗂𝖼𝗌* 」───\n\n`;
    txt += `🎵 *𝖢𝖺𝗇𝖼𝗂𝗈́𝗇:* ${title}\n`;
    txt += `👤 *𝖠𝗋𝗍𝗂𝗌𝗍𝖺:* ${artist}\n`;
    txt += `💿 *𝖠́𝗅𝖻𝗎𝗆:* ${album}\n`;
    txt += `⏱️ *𝖣𝗎𝗋𝖺𝖼𝗂𝗈́𝗇:* ${duration}\n\n`;
    txt += `📜 *𝖫𝖾𝗍𝗋𝖺:*\n\n${lyricData.lyrics}\n\n`;
    txt += `⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡ot`;

    // Enviamos el mensaje con la carátula y la letra formateada
    await conn.sendMessage(m.chat, { 
      image: { url: thumb }, 
      caption: txt 
    }, { quoted: m });

    console.log(`\x1b[32m[🎉 COMPLETO]\x1b[0m Letra de "${title}" enviada exitosamente usando ${apiUsed}.`);

  } catch (e) {
    console.log(`\x1b[31m[❌ ERROR FINAL]\x1b[0m Error al procesar el mensaje final de letras:`, e);
    m.reply('*[ ❌ ] Ocurrió un error al procesar la letra de su canción.*');
  }
};

handler.help = ['lyrics'];
handler.tags = ['buscador'];
handler.command = ['letra', 'lyric', 'lyrics', 'lirik'];

export default handler;