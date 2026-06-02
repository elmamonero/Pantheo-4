import { WAMessageStubType } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'

export async function before(m, { conn, participants, groupMetadata }) {
  if (!m.messageStubType || !m.isGroup) return true

  let groupSize = participants.length
  if (m.messageStubType == 27) {
    groupSize++;
  } else if (m.messageStubType == 28 || m.messageStubType == 32) {
    groupSize--;
  }
  let insta = `https://instagram.com/dev.criss_vx`
  let who = m.messageStubParameters[0]
  let taguser = `@${who.split('@')[0]}`
  let pp = await conn.profilePictureUrl(m.messageStubParameters[0], 'image').catch(_ => 'https://files.catbox.moe/xr2m6u.jpg')
  let chat = global.db.data.chats[m.chat]
  let txt = `¡Bienvenid@! ${await conn.getName(who)}\nAhora somos ${groupSize} miembros en el grupo.`
  let txt1 = `¡Adiós! ${await conn.getName(who)}\nAhora somos ${groupSize} miembros en el grupo`
  let txt2 = `Se salió ${await conn.getName(who)}\nAhora somos ${groupSize} miembros en el grupo.`
  let sunflare = `ゲ◜៹ New Member ៹◞ゲ`
  let sunflare1 = `ゲ◜៹ Kicked Member ៹◞ゲ`
  let sunflare2 = `ゲ◜៹ Bye Member ៹◞ゲ`
  let dev = '+50587489794'
  let fkontak = { "key": { "participants": "0@s.whatsapp.net", "remoteJid": "status@broadcast", "fromMe": false, "id": "status@broadcast" }, "message": { "contactMessage": { "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:;;; \nFN:Pantheon Bot\nEND:VCARD` } } }

if (chat.welcome && m.messageStubType == 27) {
  const groupName = groupMetadata.subject
  const groupDesc = groupMetadata.desc || 'sin descripción'
  
  let bienvenida = chat.sWelcome
    ? chat.sWelcome
        .replace(/@user/g, taguser)
        .replace(/@group/g, groupName)
        .replace(/@desc/g, groupDesc)
    : `*╭━─━─────────━─━╮*
*╰╮»* 𝗕𝗜𝗘𝗡𝗩𝗘𝗡𝗜𝗗𝗢/𝗔 👋
*╭━─━─────────━─━╯*
*┊»* 👤𝑼𝒔𝒖𝒂𝒓𝒊𝒐: ${taguser}
*┊»* 👥𝑮𝒓𝒖𝒑𝒐: ${groupName}
*╰┈┈┈┈┈┈┈┈┈┈┈┈≫*\n\n${groupDesc}\n\n> ${dev}`
  
  await conn.sendMessage(m.chat, {
    image: { url: pp },
    caption: `${txt}\n\n${bienvenida}`,
    contextInfo: {
      mentionedJid: [who],
      isForwarded: true,
      forwardingScore: 999
    }
  }, { quoted: fkontak })
}

if (chat.welcome && m.messageStubType == 28) {
  const groupName = groupMetadata.subject
  const groupDesc = groupMetadata.desc || 'sin descripción'

  let ban = chat.sKick
    ? chat.sKick
        .replace(/@user/g, taguser)
        .replace(/@group/g, groupName)
        .replace(/@desc/g, groupDesc)
    : `*¡Expulsado!*\n෫ࣲׄ֟፝͡${taguser} 👊🏻꒱\n\nᏊ⁠ 𝖴𝗇 𝗇𝖾𝗀𝗋𝗈 𝗆𝖾𝗇𝗈𝗌 𝖾𝗅 𝗀𝗋𝗎𝗉𝗈, 𝗉𝗈𝗋 𝗇𝗈 𝗈𝖻𝖾𝖽𝖾𝖼𝖾𝗋 𝗅𝖺𝗌 𝗋𝖾𝗀𝗅𝖺𝗌.\nׅ⿻ 𝖮𝗃𝖺𝗅𝖺 𝗒 𝗅𝖺 𝖾𝗅𝗂𝗆𝗂𝗇𝖺𝖼𝗂𝗈𝗇 𝗅𝖾 𝗁𝖺𝗀𝖺 𝗋𝖾𝖿𝗅𝖾𝗑𝗂𝗈𝗇𝖺𝗋 𝗑𝗗\n\n> ${dev}`    
  
  await conn.sendMessage(m.chat, {
    image: { url: pp },
    caption: `${txt1}\n\n${ban}`,
    contextInfo: {
      mentionedJid: [who],
      isForwarded: true,
      forwardingScore: 999
    }
  }, { quoted: fkontak })
}

if (chat.welcome && m.messageStubType == 32) {
  const groupName = groupMetadata.subject
  const groupDesc = groupMetadata.desc || 'sin descripción'

  let bye = chat.sBye
    ? chat.sBye
        .replace(/@user/g, taguser)
        .replace(/@group/g, groupName)
        .replace(/@desc/g, groupDesc)
    : `*╭━─━─────────━─━╮*
*╰╮» ¡𝗛𝗔𝗦𝗧𝗔 𝗟𝗨𝗘𝗚𝗢! 👋
*╭━─━──────────━─━╯*
*┊»* 👤𝑼𝒔𝒖𝒂𝒓𝒊𝒐: ${taguser}
*┊»* 👥𝑮𝒓𝒖𝒑𝒐: ${groupName}
*╰┈┈┈┈┈┈┈┈┈┈┈┈≫*\n\n 𝖳𝗎 𝗉𝗋𝖾𝗌𝖾𝗇𝖼𝗂𝖺 𝖿𝗎𝖾 𝗎𝗇 𝖾𝗌𝗍𝗈𝗋𝖻𝗈.\nׅ⿻ ¡Esperamos que no vuelvas nunca!\n\n> ${dev}`
  
  await conn.sendMessage(m.chat, {
    image: { url: pp },
    caption: `${txt1}\n\n${bye}`,
    contextInfo: {
      mentionedJid: [who],
      isForwarded: true,
      forwardingScore: 999
    }
  }, { quoted: fkontak })
}}
