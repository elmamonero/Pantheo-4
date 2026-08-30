const handler = async (m, { conn, command, text }) => {
  // Obtener el JID del usuario mencionado o del mensaje citado
  let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : '';

  if (!who) return conn.reply(m.chat, `*[ ℹ️ ] Menciona a algún usuario o responde a su mensaje.*`, m);

  const percentages = Math.floor(Math.random() * 501);
  const emojis = {
    gay: '🏳️‍🌈', lesbiana: '🏳️‍🌈', pajero: '😏💦', pajera: '😏💦', puto: '🔥🥵', puta: '🔥🥵', manco: '🎮💀', manca: '🎮💀', rata: '🐁🧀', prostituto: '🫦💋', prostituta: '🫦💋', sinpoto: '😂', sintetas: '😿', chipi: '😹🫵🏻'
  };

  const descriptions = {
    gay: [
      "💙 Parece que solo te gusta un poco la fiesta arcoíris.",
      "🖤 ¡Eres más gay que un desfile del orgullo!",
      "💜 ¡Nivel DIOS! Ya ni necesitas salir del clóset, lo rompiste."
    ],
    lesbiana: [
      "👻 Tal vez un par de maratones de series lésbicas ayuden.",
      "💗 No necesitas confirmación, ya lo sabíamos.",
      "❣️ ¡Tu amor por las chicas es más fuerte que un ship de anime!"
    ],
    pajero: [
      "🧡 Relájate, el internet no se va a acabar.",
      "💞 Bueno, al menos te ejercitas un brazo...",
      "💕 ¡Tus manos ya deberían estar aseguradas como patrimonio nacional!"
    ],
    pajera: [
      "🧡 Relájate, el internet no se va a acabar.",
      "💞 Bueno, al menos te ejercitas un brazo...",
      "💕 ¡Tus manos ya deberían estar aseguradas como patrimonio nacional!"
    ],
    puto: [
      "😼 Tranqui, no todos nacen con el talento.",
      "😺 Si sigues así, te harán monumento en Tinder.",
      "😻 ¡Ya ni el Diablo puede competir contigo!"
    ],
    puta: [
      "😼 Tranqui, no todos nacen con el talento.",
      "😺 Si sigues así, te dejarán mas abierta que las puertas del cielo vv.",
      "😻 ¡Más información a su privado, uff mi amor!"
    ],
    manco: [
      "🎮 ¿Seguro que no juegas con los pies?",
      "🥷 ¡Cuidado! Hasta los bots juegan mejor que tú.",
      "💀 Récord mundial en fallar tiros... ¡Sin balas!"
    ],
    manca: [
      "🎮 ¿Porque eres así? Puta Mala",
      "🥷 Anda a la cocina mejor no servís pa jugar",
      "💀 Récord mundial en fallar tiros... ¡Sin balas!"
    ],
    rata: [
      "🐁 Te falta robar un poco más, sigue practicando.",
      "😂 Roba peor que el Real Madrid el puto este",
      "💖 ¡Eres más rata que Remy de Ratatouille!"
    ],
    prostituto: [
      "🗣️ Tranquilo, el mercado siempre necesita talento nuevo.",
      "✨ ¡Tus servicios tienen 5 estrellas en Google!",
      "💖 Eres tan solicitado que ya tienes tarjeta VIP."
    ],
    prostituta: [
      "🙈 Tranquila que te voy hacer un oral.",
      "🥵 ¿Lo haces por gusto verdad?",
      "💖 ¿Cuando hacemos un trío? bebé"
    ],
    sinpoto: [
      "👀 ¿Seguro que no eres hombre con pelo largo?",
      "😹 Ni con cirugía te levantas ese autoestima",
      "🙉 Hasta un mosquito hace mas bulto que tu."
    ],
    sintetas: [
      "📭 Mas vacía que el buzón de alguien sin amigos.",
      "🌚 Da igual si estas defrente o de espalda, esque no hay diferencia.",
      "🫨 Se supone que la pubertad ayuda, ¿Qué pasó con tigo?"
    ],
    chipi: [
      "🤡 Lo tuyo no es mini, es edición limitada.",
      "😹 Lo bueno es que los golpes en la entrepierna no te hacen nada.",
      "💀 Dicen q lo importante es como se usa, pero en tu casi ni así."
    ]
  };

  if (!descriptions[command]) return m.reply(`*[ ⚠️ ] Comando inválido.*`);

  const emoji = emojis[command] || '';
  let description;
  if (percentages < 150) description = descriptions[command][0];
  else if (percentages > 400) description = descriptions[command][2];
  else description = descriptions[command][1];

  const responses = [
    "El destino lo ha decidido.",
    "Los datos no mienten.",
    "¡Aquí tienes tu certificado oficial!"
  ];
  const response = responses[Math.floor(Math.random() * responses.length)];

  const userTag = `@${who.split('@')[0]}`;
  const cal = `*\`🤍 CALCULADORA 🤍\`*

🌿 *Los cálculos han arrojado que* ${userTag} es \`${percentages}%\` ${command} ${emoji}

• *${description}*
> *${response}*`.trim();

  async function loading() {
    const hawemod = [
      "《 █▒▒▒▒▒▒▒▒▒▒▒》10%",
      "《 ████▒▒▒▒▒▒▒▒》30%",
      "《 ███████▒▒▒▒▒》50%",
      "《 ██████████▒▒》80%",
      "《 ████████████》100%"
    ];

    let { key } = await conn.sendMessage(m.chat, { text: `*☕ ¡Calculando Porcentaje!*` }, { quoted: m });

    for (let i = 0; i < hawemod.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      await conn.sendMessage(m.chat, { text: hawemod[i], edit: key });
    }

    // Aquí enviamos el array `mentions: [who]` para que WhatsApp lo etiquete de verdad
    await conn.sendMessage(m.chat, { 
      text: cal, 
      edit: key, 
      mentions: [who] 
    });
  }

  loading();
};

handler.tags = ['fun'];
handler.group = true;
handler.command = ['gay', 'lesbiana', 'pajero', 'pajera', 'puto', 'puta', 'manco', 'manca', 'rata', 'prostituto', 'prostituta', 'sinpoto', 'sintetas', 'chipi'];

export default handler;

