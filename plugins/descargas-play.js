import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import yts from 'yt-search';

const execFileAsync = promisify(execFile);

const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const API_TIMEOUT = 7000;
const DOWNLOAD_TIMEOUT = 120_000;
const CONVERSION_TIMEOUT = 180_000;

const APIS = [
  {
    name: 'Stellar-v2-Yuki',
    url: 'https://api.stellarwa.xyz/dl/ytmp3?url=',
    params: 'stellarwa-2026.xyz@maia@20-12-2025',
    getAudioUrl: data =>
      data?.result?.dl || data?.data?.download,
    getTitle: data =>
      data?.result?.title || data?.data?.title,
    getThumb: data =>
      data?.result?.thumbnail || data?.data?.thumbnail,
    getDuration: data =>
      data?.result?.duration || data?.data?.duration
  },
  {
    name: 'Delirius-Download',
    url: 'https://api.delirius.online/download/ytmp3?url=',
    getAudioUrl: data =>
      data?.data?.download ||
      data?.result?.download ||
      data?.data?.url,
    getTitle: data =>
      data?.data?.title || data?.result?.title,
    getThumb: data =>
      data?.data?.image ||
      data?.data?.thumbnail ||
      data?.result?.thumb,
    getDuration: data =>
      data?.data?.duration || data?.result?.duration
  },
  {
    name: 'Yuki',
    url: 'https://api.yuki-wabot.my.id/dl/youtubeplay?query=',
    params: 'YukiBot-MD',
    getAudioUrl: data =>
      data?.result?.dl || data?.data?.download,
    getTitle: data =>
      data?.result?.title || data?.data?.title,
    getThumb: data =>
      data?.result?.thumbnail || data?.data?.thumbnail,
    getDuration: data =>
      data?.result?.duration || data?.data?.duration
  },
  {
    name: 'FAA-ytplay',
    url: 'https://api-faa.my.id/faa/ytplay?query=',
    getAudioUrl: data => data?.result?.mp3,
    getTitle: data => data?.result?.title,
    getThumb: data =>
      data?.result?.thumbnail || data?.result?.thumb,
    getDuration: data => data?.result?.duration
  }
];

function formatDuration(duration) {
  if (!duration) return '00:00';

  if (typeof duration === 'string' && duration.includes(':')) {
    return duration;
  }

  const total = Number(duration);

  if (!Number.isFinite(total) || total <= 0) {
    return '00:00';
  }

  const seconds = Math.floor(total);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;

  if (hours > 0) {
    return [
      hours,
      String(minutes).padStart(2, '0'),
      String(remaining).padStart(2, '0')
    ].join(':');
  }

  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

function getYouTubeUrl(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    const isYouTube =
      hostname === 'youtu.be' ||
      hostname === 'youtube.com' ||
      hostname.endsWith('.youtube.com');

    return isYouTube ? parsed.href : null;
  } catch {
    return null;
  }
}

function validateDownloadUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('La API no devolvió un enlace de descarga.');
  }

  const parsed = new URL(value);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('El enlace de descarga no es HTTP/HTTPS.');
  }

  return parsed.href;
}

async function reactSafe(m, emoji) {
  try {
    await m.react(emoji);
  } catch (error) {
    console.warn('[YT-PLAY] No se pudo reaccionar:', error.message);
  }
}

async function requestApi(api, youtubeUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const key = api.params
      ? `&key=${encodeURIComponent(api.params)}`
      : '';

    const endpoint =
      `${api.url}${encodeURIComponent(youtubeUrl)}${key}`;

    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`La API respondió HTTP ${response.status}.`);
    }

    // El timeout permanece activo mientras se lee el JSON.
    const data = await response.json();
    const audioUrl = validateDownloadUrl(api.getAudioUrl(data));

    return {
      apiName: api.name,
      url: audioUrl,
      title: api.getTitle(data),
      thumbnail: api.getThumb(data),
      duration: formatDuration(api.getDuration(data))
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadAudio(url, destination) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DOWNLOAD_TIMEOUT
  );

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: '*/*'
      }
    });

    if (!response.ok) {
      throw new Error(
        `La descarga respondió HTTP ${response.status}.`
      );
    }

    const contentType = (
      response.headers.get('content-type') || ''
    ).toLowerCase();

    console.log('[YT-PLAY] Tipo de archivo:', contentType || 'desconocido');

    if (
      /text\/html|application\/(?:[\w.-]+\+)?json|text\/plain/.test(
        contentType
      )
    ) {
      throw new Error(
        `El enlace devolvió ${contentType}, no audio.`
      );
    }

    const declaredSize = Number(
      response.headers.get('content-length')
    );

    if (declaredSize > MAX_SIZE_BYTES) {
      throw new Error(
        `El archivo supera el límite de ${MAX_SIZE_MB} MB.`
      );
    }

    if (!response.body) {
      throw new Error('La descarga no contiene datos.');
    }

    const file = await fs.promises.open(destination, 'w');
    let downloadedBytes = 0;

    try {
      for await (const chunk of response.body) {
        downloadedBytes += chunk.length;

        if (downloadedBytes > MAX_SIZE_BYTES) {
          throw new Error(
            `El archivo supera el límite de ${MAX_SIZE_MB} MB.`
          );
        }

        await file.writeFile(chunk);
      }
    } finally {
      await file.close();
    }

    if (downloadedBytes === 0) {
      throw new Error('La API devolvió un archivo vacío.');
    }

    console.log(
      '[YT-PLAY] Descargado:',
      `${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`
    );
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

async function convertAudio(inputPath, outputPath) {
  try {
    await execFileAsync(
      'ffmpeg',
      [
        '-nostdin',
        '-hide_banner',
        '-loglevel', 'error',
        '-y',
        '-i', inputPath,
        '-map', '0:a:0',
        '-vn',
        '-c:a', 'libopus',
        '-b:a', '128k',
        '-ac', '1',
        '-avoid_negative_ts', 'make_zero',
        outputPath
      ],
      {
        timeout: CONVERSION_TIMEOUT,
        maxBuffer: 1024 * 1024
      }
    );
  } catch (error) {
    console.error(
      '[YT-PLAY] FFmpeg:',
      error.stderr || error.message
    );

    if (error.code === 'ENOENT') {
      const missingError = new Error(
        'FFmpeg no está instalado o no está disponible en el PATH.'
      );

      missingError.code = 'FFMPEG_NOT_FOUND';
      throw missingError;
    }

    throw new Error(
      'FFmpeg no pudo convertir la descarga en audio reproducible.'
    );
  }

  const stats = await fs.promises.stat(outputPath);

  if (stats.size === 0) {
    throw new Error('El audio convertido está vacío.');
  }

  if (stats.size > MAX_SIZE_BYTES) {
    throw new Error(
      `El audio convertido supera el límite de ${MAX_SIZE_MB} MB.`
    );
  }
}

async function getAudioFromApis(youtubeUrl, tempDir) {
  let lastError = null;

  for (const [index, api] of APIS.entries()) {
    const inputPath = path.join(tempDir, `original-${index}.bin`);
    const outputPath = path.join(tempDir, `audio-${index}.ogg`);

    console.log(`[YT-PLAY] Intentando con ${api.name}...`);

    try {
      const result = await requestApi(api, youtubeUrl);

      await downloadAudio(result.url, inputPath);
      await convertAudio(inputPath, outputPath);

      console.log(
        `[YT-PLAY] Audio descargado y convertido con ${api.name}.`
      );

      return {
        ...result,
        filePath: outputPath
      };
    } catch (error) {
      lastError = error;

      console.warn(
        `[YT-PLAY] Falló ${api.name}:`,
        error.message
      );

      // Cambiar de API no soluciona que falte FFmpeg.
      if (error.code === 'FFMPEG_NOT_FOUND') {
        throw error;
      }

      await fs.promises.unlink(outputPath).catch(() => {});
    } finally {
      await fs.promises.unlink(inputPath).catch(() => {});
    }
  }

  console.error(
    '[YT-PLAY] Ninguna API produjo audio válido:',
    lastError?.message
  );

  throw new Error(
    'Ninguna fuente pudo descargar un audio válido. Inténtalo más tarde.'
  );
}

const handler = async (m, { conn, args }) => {
  const query = args.join(' ').trim();

  if (!query) {
    return m.reply(
      '¿Qué canción buscamos hoy? Ingresa el nombre o el enlace.'
    );
  }

  let tempDir;

  try {
    await reactSafe(m, '🎧');

    let url = getYouTubeUrl(query);
    let searchData = null;

    if (url) {
      // Si falla la búsqueda de metadatos, se conserva la URL original.
      try {
        const results = await yts(url);
        searchData = results?.videos?.[0] || null;
      } catch (error) {
        console.warn(
          '[YT-PLAY] No se pudieron obtener metadatos:',
          error.message
        );
      }
    } else {
      const results = await yts(query);
      searchData = results?.videos?.[0] || null;

      if (!searchData?.url) {
        await reactSafe(m, '❌');
        return m.reply('No encontré resultados para esa búsqueda.');
      }

      url = searchData.url;
    }

    tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'pantheon-play-')
    );

    const apiResult = await getAudioFromApis(url, tempDir);

    const title =
      apiResult.title ||
      searchData?.title ||
      'Audio de YouTube';

    const thumbnail =
      apiResult.thumbnail ||
      searchData?.thumbnail ||
      searchData?.image;

    const duration =
      apiResult.duration !== '00:00'
        ? apiResult.duration
        : searchData?.timestamp || '00:00';

    const channel =
      searchData?.author?.name || 'Canal de YouTube';

    const caption =
      `───「 *𝖸𝗈𝗎𝖳𝗎𝖻𝖾 𝖬𝗎𝗌𝗂𝖼* 」───\n\n` +
      `◈ *${title}*\n\n` +
      `↳ ✨ *𝖣𝗎𝗋𝖺𝖼𝗂𝗈́𝗇:* ${duration}\n` +
      `↳ 👤 *𝖢𝖺𝗇𝖺𝗅:* ${channel}\n` +
      `↳ 🔗 *𝖤𝗇𝗅𝖺𝖼𝖾:* ${url}\n\n` +
      `⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡ot`;

    if (thumbnail) {
      try {
        await conn.sendMessage(
          m.chat,
          {
            image: { url: thumbnail },
            caption
          },
          { quoted: m }
        );
      } catch (error) {
        console.warn(
          '[YT-PLAY] Falló la miniatura:',
          error.message
        );

        await m.reply(caption);
      }
    } else {
      await m.reply(caption);
    }

    const safeTitle = String(title)
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      .trim()
      .slice(0, 150) || 'Audio';

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: apiResult.filePath },
        mimetype: 'audio/ogg; codecs=opus',
        fileName: `${safeTitle}.ogg`,
        ptt: false
      },
      { quoted: m }
    );

    await reactSafe(m, '✅');
  } catch (error) {
    console.error('[YT-PLAY] Error:', error);

    await reactSafe(m, '❌');

    await m.reply(
      `⚠️ Aviso: ${error.message || 'No se pudo enviar el audio.'}`
    );
  } finally {
    if (tempDir) {
      await fs.promises.rm(tempDir, {
        recursive: true,
        force: true
      }).catch(error => {
        console.warn(
          '[YT-PLAY] No se pudieron limpiar los temporales:',
          error.message
        );
      });
    }
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];

export default handler;
