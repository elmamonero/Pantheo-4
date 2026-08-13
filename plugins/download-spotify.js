import axios from 'axios';

const DOWNLOAD_URL = 'https://api.delirius.online/download/spotifydl';
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
│ • ${usedPrefix + command} https://open.spotify.com/track/37ZtpRBkHcaq6hHy0X98zn
╰───────═┅═──────`;

    return await conn.sendMessage(m.chat, { text: usage }, { quoted: m });
  }

  await m.react?.('⌛️');

  try {
    let spotifyUrl = text.trim();

    const isSpotifyUrl = /https?:\/\/(open\.)?spotify\.com\/(track|album|playlist)\//i.test(spotifyUrl);

    // Si el usuario escribe texto, busca la primera canción en Spotify
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

    // Descarga usando:
    // https://api.delirius.online/download/spotifydl?url=ENLACE_SPOTIFY
    const { data: response } = await axios.get(DOWNLOAD_URL, {
      params: {
        url: spotifyUrl
      },
      timeout: 60000
    });

    const data = response?.data || response?.result || response;

    if (!data) {
      throw new Error('La API no devolvió datos de la canción.');
    }

    const title = data.title || data.name || 'Canción de Spotify';
    const author = data.author || data.artist || data.artists || 'Artista desconocido';
    const duration = data.duration || data.duration_ms || 0;
    const image = data.image || data.thumbnail || data.cover || '';
    const download = data.download || data.url || data.audio || data.link;

    if (!download) {
      throw new Error('No se encontró el enlace de descarga del audio.');
    }

    const formatTime = (time) => {
      if (!time) return 'Desconocida';

      // Si llega como "3:25", se usa directamente
      if (typeof time === 'string' && time.includes(':')) return time;

      // Si llega en milisegundos
      let seconds = Number(time);
      if (seconds > 10000) seconds = Math.floor(seconds / 1000);

      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);

      return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const caption = `╭────═[ PANTHEON BOT - MD ]═─────⋆
│ 🎵 *TÍTULO:* ${title}
│ 🎙️ *ARTISTA:* ${author}
│ ⏳ *DURACIÓN:* ${formatTime(duration)}
│ ✨ *ESTADO:* Enviando audio...
╰───────────═┅═──────────`;

    await conn.sendMessage(m.chat, {
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
    }, { quoted: m });

    const safeName = title
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 35);

    await conn.sendMessage(m.chat, {
      audio: { url: download },
      fileName: `${safeName}.mp3`,
      mimetype: 'audio/mpeg'
    }, { quoted: m });

    await m.react?.('✅');

  } catch (e) {
    console.error('Error en Spotify Pantheon:', e?.response?.data || e);

    await m.react?.('❌');

    const apiError =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      'Ocurrió un error desconocido.';

    const errorMsg = `╭────═[ ERROR - PANTHEON ]═─────⋆
│ ${apiError}
│ Intente con otro nombre o enlace.
╰───────────═┅═──────────`;

    await m.reply(errorMsg);
  }
};

handler.command = ['spotify', 'music'];
export default handler;
