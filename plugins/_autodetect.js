let WAMessageStubType = (await import('@whiskeysockets/baileys')).default

export async function before(m, { conn, participants, groupMetadata }) {
  if (!m.messageStubType || !m.isGroup) return
  
  const fkontak = { 
    "key": { "participants": "0@s.whatsapp.net", "remoteJid": "status@broadcast", "fromMe": false, "id": "Halo" }, 
    "message": { "contactMessage": { "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD` } }, 
    "participant": "0@s.whatsapp.net" 
  }  
  
  let chat = global.db.data.chats[m.chat]
  let usuario = `@${m.sender.split`@`[0]}`
  let pp = await conn.profilePictureUrl(m.chat, 'image').catch(_ => null) || 'https://ibb.co/PzVGP68K'  

  // --- EXTRACCIÓN ULTRA SEGURA PARA NUEVAS VERSIONES DE BAILEYS ---
  let afectadoJid = ''
  if (m.messageStubParameters && m.messageStubParameters[0]) {
    afectadoJid = m.messageStubParameters[0]
  } else if (m.msg && m.msg.participants && m.msg.participants[0]) {
    afectadoJid = m.msg.participants[0]
  } else if (m.message?.groupParticipantUpdateMessage?.participants?.length) {
    afectadoJid = m.message.groupParticipantUpdateMessage.participants[0]
  }

  // Si no se encuentra nada, se usa el sender por seguridad para evitar crasheos
  if (!afectadoJid) afectadoJid = m.sender || ''

  // Forzar formato correcto @s.whatsapp.net si solo viene el número
  if (afectadoJid && !afectadoJid.includes('@')) {
    afectadoJid = afectadoJid.trim() + '@s.whatsapp.net'
  }

  let afectadoTarget = afectadoJid ? `@${afectadoJid.split('@')[0]}` : `@${m.sender.split('@')[0]}`
  // -----------------------------------------------------------------

  let nombre, foto, edit, newlink, status, admingp, noadmingp, aceptar
  
  nombre = `*${usuario}*\n*Ha cambiado el nombre del grupo.*\n\n*🧃 Ahora el grupo se llama:*\n> *${m.messageStubParameters && m.messageStubParameters[0] ? m.messageStubParameters[0] : ''}*.`

  foto = `*${usuario}*\n*Ha cambiado la imagen del grupo.*`

  edit = `*${usuario}*\n*Ha permitido que ${m.messageStubParameters && m.messageStubParameters[0] == 'on' ? 'solo admins' : 'todos'} puedan configurar el grupo.*`

  newlink = `*⛓️‍💥 El enlace del grupo ha sido restablecido por:*\n*${usuario}*`

  status = `*☕ El grupo ha sido ${m.messageStubParameters && m.messageStubParameters[0] == 'on' ? '`cerrado` 🔒' : '`abierto` 🔓'}*\n*Por: ${usuario}*\n\n🌷 Ahora ${m.messageStubParameters && m.messageStubParameters[0] == 'on' ? '*solo admins*' : '*todos*'} pueden enviar mensaje...`

  admingp = `*${afectadoTarget} Ahora es admin del grupo. 👻*\n\n*☕ Acción hecha por:*\n*${usuario}*`

  noadmingp = `*${afectadoTarget} Deja de ser admin del grupo. 🥱*\n\n*☕ Acción hecha por:*\n*${usuario}*`

  aceptar = `*¡Ha llegado un nuevo participante al grupo!*\n\n◦ ✐ Grupo: *${groupMetadata.subject}*\n\n> ◦ ⚘ Bienvenido/a: ${afectadoTarget}\n\n> ◦ ✦ Aceptado por:\n @${m.sender.split('@')[0]}` 

  if (chat.detect && m.messageStubType == 21) {
    await conn.sendMessage(m.chat, { text: nombre, mentions: [m.sender] }, { quoted: fkontak })   

  } else if (chat.detect && m.messageStubType == 22) {
    await conn.sendMessage(m.chat, { image: { url: pp }, caption: foto, mentions: [m.sender] }, { quoted: fkontak })

  } else if (chat.detect && m.messageStubType == 23) {
    await conn.sendMessage(m.chat, { text: newlink, mentions: [m.sender] }, { quoted: fkontak })     

  } else if (chat.detect && m.messageStubType == 25) {
    await conn.sendMessage(m.chat, { text: edit, mentions: [m.sender] }, { quoted: fkontak })    

  } else if (chat.detect && m.messageStubType == 26) {
    await conn.sendMessage(m.chat, { text: status, mentions: [m.sender] }, { quoted: fkontak })    

  } else if (chat.detect2 && m.messageStubType == 27) {
    await conn.sendMessage(m.chat, { text: aceptar, mentions: [m.sender, afectadoJid] }, { quoted: fkontak })

  } else if (chat.detect && m.messageStubType == 29) {
    await conn.sendMessage(m.chat, { text: admingp, mentions: [m.sender, afectadoJid] }, { quoted: fkontak })    

  } else if (chat.detect && m.messageStubType == 30) {
    await conn.sendMessage(m.chat, { text: noadmingp, mentions: [m.sender, afectadoJid] }, { quoted: fkontak })    
  }
}
