
//Buttons - Message Im Interactive

let handler = async (m, { conn }) => {
    let imageUrl = 'https://qu.ax/qN1X7';

    conn.sendMessage(m.chat, { 
        image: { url: imageUrl }, 
        caption: 'Hola usuario de WhatsApp esto solo es un test de botones que no tiene nada que ver con lo demás.', 
        footer: '', 
        buttons: [
            {
                buttonId: `.ping`,
                buttonText: { displayText: 'ᯓᡣ𐭩 ⍴іᥒg' }
            }
        ],
        viewOnce: true,
        headerType: 4
    }, { quoted: m });
}

handler.tag = ['test'];
handler.help = ['p'];
handler.command = ['buttontest'];
handler.diamantes = 1;

export default handler;
/*
// Buttons Ix

let handler = async (m, { conn }) => {

    conn.sendMessage(m.chat, { 
        text: 'TITLE', 
        footer: dev, 
        buttons: [
            {
                buttonId: `.owner`,
                buttonText: { displayText: 'Owner' },
                type: 1
            }
        ],
        viewOnce: true
    }, { quoted: m });
}

handler.tag = ['info'];
handler.help = ['p'];
handler.command = ['p'];




import yts from 'yt-search';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'; // Importación necesaria

var handler = async (m, { text, conn, args, command, usedPrefix }) => {
    if (!text) return conn.reply(m.chat, `*[ 🔎 ] Por favor, ingresa una búsqueda de YouTube.*`, m);

    try {
        conn.reply(m.chat, wait, fkontak, m);

        let results = await yts(text);
        let tes = results.all;

        if (!tes || tes.length === 0) {
            return conn.reply(m.chat, `No se encontraron resultados para *${text}*`, m);
        }

        // Enviar el primer resultado
        const first = tes[0];
        const firstText = `*「🌷」Resultado Principal:*\n\n☕ *Título:* ${first.title}\n📡 *Canal:* ${first.author.name}\n🕝 *Duración:* ${first.timestamp}\n📆 *Subido:* ${first.ago}\n👀 *Vistas:* ${first.views}\n🔗 *Enlace:* ${first.url}`;
        
        await conn.sendFile(m.chat, first.thumbnail, 'yts.jpeg', firstText, m);

        // Crear lista interactiva para los demás resultados
        const sections = [
            {
                title: "Descargar en Audio",
                rows: tes.slice(1).map(video => ({
                    title: video.title,
                    description: `Duración: ${video.timestamp} | Vistas: ${video.views}`,
                    id: `.ytmp3 ${video.url}`
                }))
            },
            {
                title: "Descargar en Video",
                rows: tes.slice(1).map(video => ({
                    title: video.title,
                    description: `Duración: ${video.timestamp} | Vistas: ${video.views}`,
                    id: `.ytmp4 ${video.url}`
                }))
            }
        ];

        const listMessage = {
            interactiveMessage: {
                body: { text: 'Selecciona una opción para descargar:' },
                footer: { text: 'Pantheon Bot' },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "single_select",
                            buttonParamsJson: JSON.stringify({
                                title: "Opciones de Descarga",
                                sections: sections,
                            }),
                        }
                    ],
                    messageParamsJson: "{}",
                    messageVersion: 1
                }
            }
        };

        // Enviar el mensaje interactivo
        const message = generateWAMessageFromContent(m.chat, listMessage, { userJid: conn.user.id });
        await conn.relayMessage(m.chat, message.message, { messageId: message.key.id });

    } catch (error) {
        console.error(error);
        conn.reply(m.chat, 'Ocurrió un error al realizar la búsqueda. Intenta de nuevo más tarde.', m);
    }
}

handler.help = ['ytsearch']
handler.tags = ['buscador']
handler.command = ['ytss']
handler.register = true

export default handler;*/
