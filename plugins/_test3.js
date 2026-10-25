import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fetch from 'node-fetch';
import yts from 'yt-search';
import { savetube } from '../lib/yt-savetube.js';
import { ogmp3 } from '../lib/youtubedl.js';

const execFileAsync = promisify(execFile);

const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const APIS = [
  {
    name: 'Savetube',
    type: 'lib',
    get: async youtubeUrl => {
      const data = await savetube.download(youtubeUrl, 'mp3');
      return {
        audioUrl: data?.result?.download,
        title: data?.result?.title,
        thumbnail: data?.result?.thumbnail || data?.result?.image,
        duration: data?.result?.duration
      };
    }
  },
  {
    name: 'OGMP3',
    type: 'lib',
    get: async youtubeUrl => {
      const data = await ogmp3.download(youtubeUrl, '320', 'audio');
      return {
        audioUrl: data?.result?.download,
        title: data?.result?.title,
        thumbnail: data?.result?.thumbnail || data?.result?.image,
        duration: data?.result?.duration
      };
    }
  },
  {
    name: 'Mitzuki-Audio',
    type: 'fetch',
    url: 'https://api.mitzuki.xyz/download/youtube?url=',
    params: `&type=audio&format=mp3&apikey=${process.env.API_KEY}`,
    get: data => ({
      audioUrl: data?.data?.media?.dl_download,
      title: data?.data?.title,
      thumbnail: data?.data?.thumbnail || data?.data?.image,
      duration: data?.data?.duration
    })
  },
  {
    name: 'Mitzuki-YouTube2',
    type: 'fetch',
    url: 'https://api.mitzuki.xyz/download/youtube2?url=',
    params: `&apikey=${process.env.API_KEY}`,
    get: data => ({
      audioUrl: data?.data?.audio?.url,
      title: data?.data?.title,
      thumbnail: data?.data?.thumbnail || data?.data?.image,
      duration: data?.data?.duration
    })
  },
  {
    name: 'DV-YER',
    type: 'fetch',
    url: 'https://dv-yer-api.online/ytmp3?mode=link&url=',
    get: data => ({
      audioUrl:
        data?.download_url_full ||
        data?.stream_url_full ||
        (data?.url ? `https://dv-yer-api.online${data.url}` : null),
      title: data?.title,
      thumbnail: data?.thumbnail || data?.image,
      duration: data?.duration
    })
  },
  {
    name: 'Dorratz',
    type: 'fetch',
    url: 'https://api.dorratz.com/v3/ytdl?url=',
    get: data => {
      const mp3 = data?.medias?.find(
        media =>
          media?.extension === 'mp3' &&
          ['160kbps', '128kbps', '96kbps'].includes(media?.quality)
      );

      return {
        audioUrl: mp3?.url,
        title: data?.title,
        thumbnail: data?.thumbnail || data?.image,
        duration: data?.duration
      };
    }
  },
  {
    name: 'Siputzx',
    type: 'fetch',
    url: 'https://api.siputzx.my.id/api/d/ytmp3?url=',
    get: data => ({
      audioUrl: data?.dl || data?.data?.dl || data?.result?.dl,
      title: data?.title || data?.data?.title,
      thumbnail: data?.thumbnail || data?.data?.thumbnail,
      duration: data?.duration || data?.data?.duration
    })
  },
  {
    name: 'API-Propia',
    type: 'fetch',
    url: `${process.env.API_BASE || ''}/download/ytmp3?url=`,
    get: data => ({
      audioUrl: data?.status ? data?.data?.download?.url : null,
      title: data?.data?.title,
      thumbnail: data?.data?.thumbnail || data?.data?.image,
      duration: data?.data?.duration
    })
  },
  {
    name: 'Zenkey',
    type: 'fetch',
    url: 'https://api.zenkey.my.id/api/download/ytmp3?apikey=zenkey&url=',
    get: data => ({
      audioUrl: data?.result?.download?.url,
      title: data?.result?.title,
      thumbnail: data?.result?.thumbnail || data?.result?.image,
      duration: data?.result?.duration
    })
  },
  {
    name: 'Exonity',
    type: 'fetch',
    url: 'https://exonity.tech/api/dl/playmp3?query=',
    queryBased: true,
    get: data => ({
      audioUrl: data?.result?.download,
      title: data?.result?.title,
      thumbnail: data?.result?.thumbnail || data?.result?.image,
      duration: data?.result?.duration
    })
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

async function fetchWithTimeout(url, options = {}, milliseconds = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), milliseconds);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
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
    {
      timeout: 180_000,
      maxBuffer: 1024 * 1024
    }
  );

  const stats = await fs.promises.stat(outputPath);

  if (stats.size === 0) {
    throw new Error('El audio convertido está vacío.');
  }
}

async function getApiData(api, youtubeUrl, title) {
  if (api.type === 'lib') {
    return api.get(youtubeUrl);
  }

  const endpoint = api.queryBased
    ? `${api.url}${encodeURIComponent(title || youtubeUrl)}`
    : `${api.url}${encodeURIComponent(youtubeUrl)}${api.params || ''}`;

  const response = await fetchWithTimeout(
    endpoint,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json'
      }
    },
    8000
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}.`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('json')) {
    throw new Error(`Respuesta no JSON: ${contentType}`);
  }

  const data = await response.json();
  return api.get(data);
}

async function tryApi(api, youtubeUrl, title, tempDir, index) {
  const inputPath = path.join(tempDir, `orig-${index}.bin`);
  const outputPath = path.join(tempDir, `audio-${index}.ogg`);

  console.log(`[PRUEBASA2] Iniciando ${api.name}...`);

  const info = await getApiData(api, youtubeUrl, title);

  if (!info?.audioUrl) {
    throw new Error('No devolvió enlace de descarga.');
  }

  console.log(`[PRUEBASA2] ${api.name} devolvió enlace.`);

  const audioResponse = await fetchWithTimeout(
    info.audioUrl,
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
    audioResponse.headers.get('content-length') || 0
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

  console.log(`[PRUEBASA2] Listo con ${api.name}.`);

  return {
    apiName: api.name,
    filePath: outputPath,
    title: info.title,
    thumbnail: info.thumbnail,
    duration: formatDuration(info.duration)
  };
}

async function getAudioFromApis(youtubeUrl, title, tempDir) {
  const attempts = APIS.map((api, index) =>
    tryApi(api, youtubeUrl, title, tempDir, index)
      .then(result => ({
        ok: true,
        result
      }))
      .catch(error => {
        console.warn(
          `[PRUEBASA2] Falló ${api.name}:`,
          error.message
        );

        return {
          ok: false,
          error
        };
      })
  );

  const results = await Promise.all(attempts);
  const winner = results.find(item => item.ok);

  if (!winner) {
    throw new Error('Ninguna API devolvió audio válido.');
  }

  return winner.result;
}

const handler = async (m, { conn, args }) => {
  const query = args.join(' ').trim();

  if (!query) {
    return m.reply(
      '¿Qué canción buscamos? Ingresa el nombre o un enlace de YouTube.\n\nEjemplo:\n.pruebasa2 emilia 420'
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

    const searchTitle =
      searchData?.title || query;

    tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'pruebasa2-')
    );

    const result = await getAudioFromApis(
      url,
      searchTitle,
      tempDir
    );

    const title =
      result.title ||
      searchData?.title ||
      'Audio';

    const thumbnail =
      result.thumbnail ||
      searchData?.thumbnail ||
      searchData?.image;

    const duration =
      result.duration !== '00:00'
        ? result.duration
        : searchData?.timestamp || '00:00';

    const channel =
      searchData?.author?.name || 'Canal de YouTube';

    const caption =
      `───「 *𝖸𝗈𝗎𝖳𝗎𝖻𝖾 𝖬𝗎𝗌𝗂𝖼* 」───\n\n` +
      `◈ *${title}*\n\n` +
      `↳ ✨ *𝖣𝗎𝗋𝖺𝖼𝗂𝗈́𝗇:* ${duration}\n` +
      `↳ 👤 *𝖢𝖺𝗇𝖺𝗅:* ${channel}\n` +
      `↳ ⚙️ *𝖠𝖯𝖨:* ${result.apiName}\n` +
      `↳ 🔗 *𝖤𝗇𝗅𝖺𝖼𝖾:* ${url}\n\n` +
      `⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡ot`;

    if (thumbnail) {
      await conn.sendMessage(
        m.chat,
        {
          image: { url: thumbnail },
          caption
        },
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
    console.error('[PRUEBASA2] Error:', error);

    await m.react('❌').catch(() => {});
    await m.reply(
      `⚠️ Aviso: ${error.message || 'Falló la descarga del audio.'}`
    );
  } finally {
    if (tempDir) {
      await fs.promises.rm(tempDir, {
        recursive: true,
        force: true
      }).catch(() => {});
    }
  }
};

handler.help = ['pruebasa2 <nombre|URL>'];
handler.command = ['pruebasa2'];
handler.tags = ['descargas'];
handler.register = true;

export default handler;
