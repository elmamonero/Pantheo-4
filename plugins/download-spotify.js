import axios from 'axios';

const DOWNLOAD_URL = 'https://api.yuki-wabot.my.id/dl/spotify';
const API_KEY = 'YukiBot-MD';

// Esta API se usa únicamente para buscar cuando el usuario escribe texto.
const SEARCH_URL = 'https://api.delirius.online/search/spotify';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (m.fromMe) return;

  if (!text) {
    const usage = `╭──═[ PANTHEON BOT ]═──⋆
│    
│ 🎵 *SPOTIFY DOWNLOADER*
│ Uso: ${usedPrefix + command} <nombre o enlace>
│
│ Ej:
│ • ${usedPrefix + command} I Can't Stop Me
│ • ${usedPrefix + command} https://open.spotify.com/track/3apeXzypBMnUfYcZYNX6DH
╰───────═┅═──────`;

    return await conn.sendMessage(m.chat, { text: usage }, { quoted: m });
  }

  await m.react?.('⌛️');

  try {
    let spotifyUrl = text.trim();

    const isSpotifyUrl =
      /https?:\/\/(open\.)?spotify\.com\/(track|album|playlist)\//i.test(spotifyUrl);

    // Busca una canción si el usuario escribió un nombre.
    if (!isSpotifyUrl) {
      const { data: search } = await axios.get(SEARCH_URL, {
        params: {
          q: spotifyUrl,
          limit: 1
        },
        timeout: 30000
      });

      const results =
        search?.data ||
        search?.result ||
        search?.results ||
        search?.tracks ||
        [];

      const item = Array.isArray(results) ? results[0] : results;

      spotifyUrl =
        item?.external_urls?.spotify ||
        item?.url ||
        item?.link ||
        item?.spotify_url ||
        item?.trackUrl;

      if (!spotifyUrl) {
        throw new Error('No se encontró ninguna canción en Spotify.');
      }
    }

    // Yuki API:
    // https://api.yuki-wabot.my.id/dl/spotify?url=URL_SPOTIFY&key=YukiBot-MD
    const { data: response } = await axios.get(DOWNLOAD_URL, {
      params: {
        url: spotifyUrl,
        key: API_KEY
      },
      timeout: 60000
    });

    console.log('Respuesta Yuki Spotify:', response);

    const data = response?.result || response?.data || response;

    if (!data) {
      throw new Error('La API de Yuki no devolvió información.');
    }

    const title = data.title || data.name || data.song || 'Canción de Spotify';

    const author =
      data.artist ||
      data.author ||
      data.artists ||
      data.creator ||
      'Artista desconocido';

    const image =
      data.thumbnail ||
      data.image ||
      data.cover ||
      data.album_art ||
      '';

    const download =
      data.download ||
      data.url ||
      data.audio ||
      data.link ||
      data.mp3;

    if (!download) {
      throw new Error('La API no devolvió un enlace de audio MP3.');
    }

    const caption = `╭────═[ PANTHEON BOT - MD ]═─────⋆
│ 🎵 *TÍTULO:* ${title}
│ 🎙️ *ARTISTA:* ${author}
│ ✨ *ESTADO:* Enviando audio...
╰───────────═┅═──────────`;

    await conn.sendMessage(
      m.chat,
      {
        text: caption,
        contextInfo: {
          externalAdReply: {
            showAdAttribution: true,
            title: 'Spotify Player',
            body: author,
            mediaType: 1,
            thumbnailUrl: image,
            sourceUrl: spotifyUrl
          }
        }
      },
      { quoted: m }
    );

    const safeName = title
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 35);

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: download },
        fileName: `${safeName}.mp3`,
        mimetype: 'audio/mpeg'
      },
      { quoted: m }
    );

    await m.react?.('✅');
  } catch (e) {
    console.error('Error Spotify Yuki:', e?.response?.data || e);

    await m.react?.('❌');

    const apiError =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      'Ocurrió un error desconocido.';

    await m.reply(`╭────═[ ERROR - PANTHEON ]═─────⋆
│ ${apiError}
│ Intente con otro nombre o enlace.
╰───────────═┅═──────────`);
  }
};

handler.command = ['spotify', 'music'];
export default handler;
