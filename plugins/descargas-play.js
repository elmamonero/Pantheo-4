const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('¿Qué canción buscamos hoy? Ingresa el nombre o el enlace.');

  let url = args[0];
  let searchData = null;
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  try {
    const query = isUrl ? url : args.join(' ');
    const searchResults = await yts(query);
    if (searchResults.videos.length) {
      searchData = searchResults.videos[0];
      
      // OPTIMIZACIÓN: Siempre usamos la URL directa y limpia del video que genera 'yt-search'
      url = searchData.url; 
    }

    if (!url) return m.reply('No encontré resultados para esa búsqueda.');

    await m.react('🎧');

    // Ahora la URL va 100% limpia sin parámetros raros de YouTube
    let apiResult = await getAudioFromApis(url);

    if (!apiResult.success) {
      await m.react('❌');
      return m.reply(`*Lo siento:* Las fuentes de descarga están saturadas ahora mismo.`);
    }

    const title = apiResult.title || searchData?.title || 'Audio de YouTube';
    const thumbnail = apiResult.thumbnail || searchData?.thumbnail || searchData?.image;
    const duration = apiResult.duration === '00:00' && searchData ? searchData.timestamp : apiResult.duration;
    const channel = searchData?.author?.name || 'Canal de YouTube';
    const audioUrl = apiResult.url;
    
    const caption = `───「 *𝖸𝗈𝗎𝖳𝗎𝖻𝖾 𝖬𝗎𝗌𝗂𝖼* 」───\n\n` +
                    `◈ *${title}*\n\n` +
                    `↳ ✨ *𝖣𝗎𝗋𝖺𝖼𝗂𝗈́𝗇:* ${duration}\n` +
                    `↳ 👤 *𝖢𝖺𝗇𝖺𝗅:* ${channel}\n` +
                    `↳ 🔗 *𝖤𝗇𝗅𝖺𝖼𝖾:* ${url}\n\n` +
                    `⚡ 𝖯𝖺𝗇𝗍𝗁𝖾𝗈𝗇 𝖡𝗈̣t`;

    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);
    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) throw new Error('Error de descarga.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) throw new Error(`El archivo es demasiado pesado.`);

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));

    if (thumbnail) {
      await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
    }, { quoted: m });

    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await m.react('✅');

  } catch (error) {
    await m.react('❌');
    m.reply(`⚠️ **Aviso:** ${error.message}`);
  }
};