const handler = async (m, { conn, command, text }) => {
    // Detectar si hay dos usuarios mencionados (ej. .love @user1 @user2)
    let mentioned = m.mentionedJid || [];
    let user1, user2, targetName1, targetName2;
    let mentionsArray = [];

    if (mentioned.length >= 2) {
        user1 = mentioned[0];
        user2 = mentioned[1];
        targetName1 = `@${user1.split('@')[0]}`;
        targetName2 = `@${user2.split('@')[0]}`;
        mentionsArray = [user1, user2];
    } else {
        // Comportamiento anterior: Si hay una mención, respuesta o texto
        let target = mentioned[0] ? mentioned[0] : m.quoted ? m.quoted.sender : null;
        
        user1 = m.sender;
        targetName1 = `@${user1.split('@')[0]}`;
        mentionsArray.push(user1);

        if (target) {
            user2 = target;
            targetName2 = `@${target.split('@')[0]}`;
            mentionsArray.push(target);
        } else if (text) {
            // Si escribieron un nombre plano (ej: .love Juan)
            targetName2 = text.trim();
        } else {
            return conn.sendMessage(m.chat, { 
                text: '*[ ℹ️ ] Por favor, menciona a una persona, responde a su mensaje o menciona a dos usuarios (ej: .love @user1 @user2).*' 
            }, { quoted: m });
        }
    }

    // Generación del porcentaje aleatorio
    const lovePercentage = Math.floor(Math.random() * 101); // 0 al 100%
    const isHighLove = lovePercentage >= 50;

    // Mensajes para resultados altos y bajos
    const loveMessages = [
        "¡Eso es un amor ardiente y apasionado! ¡Ve y díselo ahora mismo!",
        "Parece que hay una chispa entre ustedes dos. ¡Inténtalo!",
        "Podría haber algo especial aquí. ¡Dale una oportunidad!",
        "Hmm, el amor está en el aire. ¡Quizás sea hora de un café juntos!",
        "Las estrellas indican que hay un potencial romántico. ¡Haz un movimiento!",
        "Una historia de amor increíble podría estar esperando para ser escrita por ustedes.",
        "No subestimen el poder del tiempo y la paciencia en el amor. Grandes cosas pueden suceder.",
        "Recuerden que el amor es un viaje, y cada paso es valioso, sin importar la distancia.",
        "Las conexiones fuertes pueden convertirse en relaciones hermosas. ¡Sigan explorando!",
        "El amor verdadero a menudo requiere tiempo y esfuerzo. ¡No renuncien!",
    ];
    
    const notSoHighLoveMessages = [
        "A veces, la amistad es el comienzo de algo hermoso, pero no siempre se convierte en amor.",
        "El amor no es todo, ¡la amistad también es genial! Mantengan su amistad especial.",
        "Recuerda que las mejores relaciones comienzan con una buena amistad. ¡No subestimen su vínculo!",
        "A veces, el amor puede crecer con el tiempo. ¡Sigan fortaleciendo su conexión!",
        "La vida es una sorpresa, ¡quién sabe qué depara el futuro! No pierdan la esperanza.",
        "Aunque el amor no florezca como esperaban, su conexión sigue siendo valiosa.",
        "Los corazones pueden tardar en sincronizarse, pero eso no disminuye lo especial que son juntos.",
        "A pesar de los desafíos del amor, su amistad es un regalo que merece ser celebrado.",
        "El tiempo puede revelar cosas sorprendentes. ¡Sigamos explorando juntos!",
        "La vida está llena de giros inesperados. ¡Permanezcan abiertos a las posibilidades!",
    ];

    const loveDescription = isHighLove 
        ? "parecen tener una conexión profunda y un amor" 
        : "parecen tener una conexión especial, aunque su porcentaje de amor es";

    const getRandomMessage = (messages) => messages[Math.floor(Math.random() * messages.length)];
    const loveMessage = getRandomMessage(isHighLove ? loveMessages : notSoHighLoveMessages);

    const response = 
        `━━━━⬣ *💖 LOVE 💖* ⬣━━━━\n` +
        `*❥ En el universo del amor, ${targetName1} y ${targetName2} ${loveDescription} del ${lovePercentage}% de un 100%.*\n\n` +
        `*💌 ${loveMessage}*\n` +
        `━━━━⬣ *💖 LOVE 💖* ⬣━━━━`;

    // Animación de carga
    async function loading() {
        let { key } = await conn.sendMessage(m.chat, { 
            text: "*💞 ¡Calculando Porcentaje! 💞*" 
        }, { quoted: m });

        const hawemod = [
            "《 █▒▒▒▒▒▒▒▒▒▒▒》10%",
            "《 ████▒▒▒▒▒▒▒▒》30%",
            "《 ███████▒▒▒▒▒》50%",
            "《 ██████████▒▒》80%",
            "《 ████████████》100%"
        ];

        for (const progress of hawemod) {
            await new Promise(resolve => setTimeout(resolve, 600)); 
            await conn.sendMessage(m.chat, { 
                text: progress, 
                edit: key 
            });
        }

        // Mensaje final con el resultado y las menciones aseguradas para ambos (si aplican)
        await conn.sendMessage(m.chat, { 
            text: response, 
            edit: key, 
            mentions: mentionsArray 
        });
    }

    loading();    
};

handler.help = ['love <nombre/@user1 @user2>'];
handler.tags = ['fun'];
handler.command = /^(love|amor)$/i;
export default handler;
