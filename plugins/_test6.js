import fs from 'fs';
import path from 'path';
import yts from 'yt-search';
import puppeteer from 'puppeteer';

// Aumentamos el límite a 250MB para permitir canciones muy largas
const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Función para formatear duración
function formatDuration(duration) {
  if (!duration) return 'Desconocido';
  if (typeof duration === 'string' && duration.includes(':')) return duration;
  
  const seconds = parseInt(duration);
  if (isNaN(seconds)) return 'Desconocido';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Abre SaveTube con Puppeteer, pega la URL de YouTube
 * y devuelve:
 *  - dl: enlace final .mp3
 *  - title, thumbnail, duration (si se pueden leer)
 */
async function scrapSaveTubeWithPuppeteer(youtubeUrl) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');

    // 1. Ir a la página de SaveTube (puede ser distinta, ajusta la URL)
    await page.goto('https://savetube.vip', { waitUntil: 'networkidle2', timeout: 60000 });

    // 2. Escribir la URL de YouTube en el input
    // IMPORTANTE: ajusta este selector al input real de SaveTube
    // Por ejemplo: 'input[name="url"]', '#url', etc.
    const INPUT_SELECTOR = 'input[name="url"]';
    await page.waitForSelector(INPUT_SELECTOR, { timeout: 30000 });
    await page.click(INPUT_SELECTOR, { clickCount: 3 });
    await page.type(INPUT_SELECTOR, youtubeUrl);

    // 3. Hacer click en el botón de convertir/descargar
    // De nuevo, ajusta a lo que realmente tenga SaveTube
    const BUTTON_SELECTOR = 'button[type="submit"]';
    await page.click(BUTTON_SELECTOR);

    // 4. Esperar a que aparezca el enlace de descarga .mp3
    // Busca un <a> que contenga ".mp3" o algún selector concreto de SaveTube
    const DOWNLOAD_LINK_SELECTOR = 'a[href*=".mp3"]';
    await page.waitForSelector(DOWNLOAD_LINK_SELECTOR, { timeout: 90000 });

    // 5. Leer datos de la página
    const result = await page.evaluate((DOWNLOAD_LINK_SELECTOR) => {
      const linkEl = document.querySelector(DOWNLOAD_LINK_SELECTOR);
      if (!linkEl) return null;

      const dl = linkEl.href;

      // Opcional: intenta sacar título, thumbnail y duración si aparecen
      const titleEl = document.querySelector('h1, h2, .title'); // ajusta selector
      const title = titleEl ? titleEl.innerText.trim() : 'Audio de YouTube';

      const thumbEl = document.querySelector('img');
      const thumbnail = thumbEl ? thumbEl.src : null;

      // Si SaveTube muestra duración en algún span o similar, ajusta aquí
      const durationEl = document.querySelector('.duration, .time');
      const duration = durationEl ? durationEl.innerText.trim() : 'Desconocido';

      return { dl, title, thumbnail, duration };
    }, DOWNLOAD_LINK_SELECTOR);

    if (!result || !result.dl) {
      throw new Error('No se pudo obtener el enlace .mp3 desde SaveTube.');
    }

    return {
      success: true,
      url: result.dl,
      title: result.title,
      thumbnail: result.thumbnail,
      duration: result.duration
    };
  } finally {
    await browser.close();
  }
}

/**
 * Si el usuario pasa DIRECTAMENTE un enlace .mp3 de SaveTube,
 * lo usamos tal cual. Si pasa URL de YouTube, usamos Puppeteer.
 */
async function getSaveTubeAudio(source) {
  // Caso 1: ya es enlace directo de SaveTube
  if (typeof source === 'string' && (source.includes('savetube.vip') || source.includes('savetube.me'))) {
    return {
      success: true,
      url: source,
      title: 'Audio de SaveTube',
      thumbnail: null,
      duration: 'Desconocido'
    };
  }

  // Caso 2: objeto con info de YouTube (viene de yts)
  if (typeof source === 'object' && source.url) {
    const res = await scrapSaveTubeWithPuppeteer(source.url);
    return res;
  }

  throw new Error('Fuente inválida para getSaveTubeAudio');
}

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) {
    return m.reply('Por favor, ingresa un nombre de canción, URL de YouTube o enlace de SaveTube (.mp3)');
  }

  let input = args.join(' ');
  let searchData = null;
  const isSaveTube = /(savetube.vip|savetube.me)/.test(input);
  const isYoutube = /(youtube.com|youtu.be)/.test(input);

  try {
    await m.react('🕒');

    let audioInfo;

    if (isSaveTube) {
      // El usuario mandó un enlace directo .mp3 de SaveTube
      audioInfo = await getSaveTubeAudio(input);
    } else {
      // Nombre o URL de YouTube
      let url = input;

      if (!isYoutube) {
        // Buscar por nombre
        const searchResults = await yts(input);
        if (!searchResults.videos.length) {
          await m.react('✖️');
          return m.reply('No se encontraron resultados');
        }
        searchData = searchResults.videos[0];
        url = searchData.url;
      } else {
        // Es URL de YouTube, también intento sacar info
        const searchResults = await yts(url);
        if (searchResults.videos.length) {
          searchData = searchResults.videos[0];
        }
      }

      if (!url) {
        await m.react('✖️');
        return m.reply('No se pudo resolver un enlace válido');
      }

      // Aquí es donde entra el scraper de SaveTube con Puppeteer
      audioInfo = await getSaveTubeAudio({
        url,
        title: searchData?.title,
        thumbnail: searchData?.thumbnail || searchData?.image,
        timestamp: searchData?.timestamp
      });
    }

    if (!audioInfo || !audioInfo.success || !audioInfo.url) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* No se pudo obtener el audio desde SaveTube.');
    }

    const { url: audioUrl } = audioInfo;
    const title = audioInfo.title || searchData?.title || 'Audio de YouTube';
    const thumb = audioInfo.thumbnail || searchData?.thumbnail || searchData?.image || null;
    const duration = formatDuration(
      audioInfo.duration === 'Desconocido' && searchData?.timestamp
        ? searchData.timestamp
        : audioInfo.duration
    );

    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);

    console.log(`[INFO] Descargando audio desde SaveTube: ${audioUrl}`);
    const audioResponse = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://youtube.com/'
      }
    });

    if (!audioResponse.ok) throw new Error('Error al descargar el archivo.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo demasiado grande: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB.`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const stats = fs.statSync(dest);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

    const caption = `🎵 *${title}*
⏱️ ${duration}
💾 ${sizeMB}MB

*Pantheon Bot*`;

    if (thumb) {
      await conn.sendMessage(
        m.chat,
        { image: { url: thumb }, caption },
        { quoted: m }
      );
    } else {
      await m.reply(caption);
    }

    await conn.sendMessage(
      m.chat,
      {
        audio: fs.readFileSync(dest),
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
      },
      { quoted: m }
    );

    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await m.react('✅');

  } catch (e) {
    console.error('[HANDLER ERROR]', e);
    await m.react('✖️');
    m.reply(`⚠️ *Error:* ${e.message}`);
  }
};

handler.help = ['pruebaplay <nombre|url>'];
handler.command = ['pruebaplay'];
handler.tags = ['descargas'];

export default handler;
