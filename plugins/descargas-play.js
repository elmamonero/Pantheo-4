import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import yts from 'yt-search';

const execFileAsync = promisify(execFile);

const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const APIS = [
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

  const seconds = Math.floor(Number(duration));

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  if (hours > 0) {
    return [
      hours,
      String(minutes).padStart(2, '0'),
      String(rest).padStart(2, '0')
    ].join(':');
  }

  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function getYouTubeUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();

    const ok = ['http:', 'https:'].includes(parsed.protocol);
    const isYouTube =
      host === 'youtu.be' ||
      host === 'youtube.com' ||
      host.endsWith('.youtube.com');

    return ok && isYouTube ? parsed.href : null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, options, milliseconds) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), milliseconds);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function convertAudio(inputPath, outputPath) {
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
    { timeout: 180_000, maxBuffer: 1024 * 1024 }
  );

  const stats = await fs.promises.stat(outputPath);

  if (stats.size === 0) {
    throw new Error('El audio convertido está vacío.');
  }
}

async function getAudioFromApis(youtubeUrl, tempDir) {
  let lastError = null;

  for (const [index, api] of APIS.entries()) {
    const inputPath = path.join(tempDir, `orig-${index}.bin`);
    const outputPath = path.join(tempDir, `audio-${index}.ogg`);

    console.log(`[YT-PLAY] Probando ${api.name}...`);

    try {
      const key = api.params
        ? `&key=${encodeURIComponent(api.params)}`
        : '';

      const endpoint =
        `${api.url}${encodeURIComponent(youtubeUrl)}${key}`;

      const response = await fetchWithTimeout(
        endpoint,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'application/json'
          }
        },
        7000
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}.`);
      }

      const data = await response.json();
      const audioUrl = api.getAudioUrl(data);

      if (!audioUrl) {
        throw new Error('No devolvió enlace de descarga.');
      }

      console.log('[YT-PLAY] Enlace recibido:', audioUrl);

      const audioResponse = await fetchWithTimeout(
        audioUrl,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: '*/*',
            Referer: 'https://www.youtube.com/'
          }
        },
        120_000
      );

      if (!audioResponse.ok) {
        throw new Error(`CDN HTTP ${audioResponse.status}.`);
      }

      const declaredSize = Number(
        audioResponse.headers.get('content-length')
      );

      if (declaredSize > MAX_SIZE_BYTES) {
        throw new Error(`Supera ${MAX_SIZE_MB} MB.`);
      }

      const file = await fs.promises.open(inputPath, 'w');
      let downloaded = 0;

      try {
        for await (const chunk of audioResponse.body) {
          downloaded += chunk.length;

          if (downloaded > MAX_SIZE_BYTES) {
            throw new Error(`Supera ${MAX_SIZE_MB} MB.`);
          }

          await file.writeFile(chunk);
        }
      } finally {
        await file.close();
      }

      if (downloaded === 0) {
        throw new Error('Descarga vacía.');
      }

      await convertAudio(inputPath, outputPath);

      console.log(`[YT-PLAY] Listo con ${api.name}.`);

      return {
        apiName: api.name,
        filePath: outputPath,
        title: api.getTitle(data),
        thumbnail: api.getThumb(data),
        duration: formatDuration(api.getDuration(data))
      };
    } catch (error) {
      lastError = error;
      console.warn(`[YT-PLAY] Falló ${api.name}:`, error.message);
    }
  }

  throw new Error(
    lastError?.message || 'Ninguna fuente devolvió audio válido.'
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
    await m.react('🎧').catch(() => {});

    let url = getYouTubeUrl(query);
    let searchData = null;

    if (!url) {
      const results = await yts(query);

      searchData = results?.videos?.[0] || null;

      if (!searchData?.url) {
        await m.react('❌').catch(() => {});
        return m.reply('No encontré resultados para esa búsqueda.');
      }

      url = searchData.url;
    }

    tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'play-')
    );

    const result = await getAudioFromApis(url, tempDir);

    const title = result.title || searchData?.title || 'Audio';
    const thumbnail = result.thumbnail ||
      searchData?.thumbnail ||
      searchData?.image;

    const duration = result.duration !== '00:00'
      ? result.duration
      : searchData?.timestamp || '00:00';

    const channel = searchData?.author?.name || 'Canal de YouTube';

    const caption =
      `───「 *𝖸𝗈𝗎𝖳𝗎𝖻𝖾 𝖬𝗎𝗌𝗂𝖼* 」───\n\n` +
      `◈ *${title}*\n\n` +
      `↳ ✨ *𝖣𝗎𝗋𝖺𝖼𝗂𝗈́𝗇:* ${duration}\n` +
      `↳ 👤 *𝖢𝖺𝗇𝖺𝗅:* ${channel}\n` +
      `↳ 🔗 *𝖤𝗇𝗅𝖺𝖼𝖾:* ${url}\n\n` +
      `⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡ot`;

    if (thumbnail) {
      await conn.sendMessage(
        m.chat,
        { image: { url: thumbnail }, caption },
        { quoted: m }
      ).catch(() => m.reply(caption));
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
        audio: { url: result.filePath },
        mimetype: 'audio/ogg; codecs=opus',
        fileName: `${safeTitle}.ogg`,
        ptt: false
      },
      { quoted: m }
    );

    await m.react('✅').catch(() => {});
  } catch (error) {
    console.error('[YT-PLAY] Error:', error);
    await m.react('❌').catch(() => {});
    await m.reply(`⚠️ Aviso: ${error.message || 'Falló el audio.'}`);
  } finally {
    if (tempDir) {
      await fs.promises.rm(tempDir, {
        recursive: true,
        force: true
      }).catch(() => {});
    }
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];

export default handler;
