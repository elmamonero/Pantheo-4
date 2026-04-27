import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas, loadImage } from "canvas";
import FormData from "form-data";
import axios from "axios";

if (!global.facturaTimeouts) global.facturaTimeouts = {};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getDownloader(wa) {
  if (wa && typeof wa.downloadContentFromMessage === "function") return wa.downloadContentFromMessage;
  try {
    const m = await import("@whiskeysockets/baileys");
    return m.downloadContentFromMessage;
  } catch { return null; }
}

function unwrapMessage(m) {
  let n = m;
  while (n?.viewOnceMessage?.message || n?.viewOnceMessageV2?.message || n?.viewOnceMessageV2Extension?.message || n?.ephemeralMessage?.message) {
    n = n.viewOnceMessage?.message || n.viewOnceMessageV2?.message || n.viewOnceMessageV2Extension?.message || n.ephemeralMessage?.message;
  }
  return n;
}

function getQuoted(msg) {
  const root = unwrapMessage(msg?.message) || {};
  const ctx = root?.extendedTextMessage?.contextInfo || root?.imageMessage?.contextInfo || root?.videoMessage?.contextInfo || root?.documentMessage?.contextInfo || root?.audioMessage?.contextInfo || root?.stickerMessage?.contextInfo || null;
  return ctx?.quotedMessage ? unwrapMessage(ctx.quotedMessage) : null;
}

function parseCiclo(token) {
  const m = String(token || "").trim().match(/^(\d+)([smhdM])$/);
  if (!m) return null;
  const valor = parseInt(m[1], 10);
  const uni = m[2];
  const mult = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000, 'M': 2592000000 };
  return { valor, unidad: uni, ms: valor * mult[uni], texto: `${valor}${uni}` };
}

const limpiarNumero = n => String(n || "").replace(/\D/g, "");

function formatFecha(ts) {
  const d = new Date(ts);
  // Agregamos segundos para que puedas validar pruebas cortas
  return d.toLocaleString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

async function subirLogoDesdeCita(msg, wa) {
  const quoted = getQuoted(msg);
  if (!quoted?.imageMessage) return null; 
  const DL = await getDownloader(wa);
  const stream = await DL(quoted.imageMessage, "image");
  const tmpPath = path.join(process.cwd(), "tmp", `${Date.now()}_logo.jpg`);
  if (!fs.existsSync(path.dirname(tmpPath))) fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
  const ws = fs.createWriteStream(tmpPath);
  for await (const chunk of stream) ws.write(chunk);
  ws.end();
  await new Promise(r => ws.on("finish", r));
  const form = new FormData();
  form.append("file", fs.createReadStream(tmpPath));
  const res = await axios.post("https://cdn.russellxz.click/upload.php", form, { headers: { ...form.getHeaders() } });
  if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  return res.data.url;
}

async function generarFacturaPNG({ logoUrl, datos }) {
  const W = 1100, H = 650;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#111827"; ctx.fillRect(0, 0, W, 120);
  if (logoUrl) {
    try {
      const logo = await loadImage(logoUrl);
      const size = 90;
      ctx.save();
      ctx.beginPath(); ctx.arc(30 + size/2, 15 + size/2, size/2, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(logo, 30, 15, size, size);
      ctx.restore();
    } catch {}
  }
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 34px Sans-Serif";
  ctx.fillText("FACTURA • PAGO EXITOSO", 140, 55);
  ctx.font = "16px Sans-Serif";
  ctx.fillText(`Vence: ${formatFecha(datos.fechaVencimiento)}`, 140, 85);

  const boxX = 40, boxY = 150, boxW = W - 80, boxH = 360;
  ctx.fillStyle = "#f3f4f6"; ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = "#111827"; ctx.font = "bold 24px Sans-Serif";
  ctx.fillText("Detalle de la Factura", boxX + 20, boxY + 40);
  ctx.font = "18px Sans-Serif";
  let yy = boxY + 80;
  ctx.fillText(`ID FACTURA: ${datos.id}`, boxX + 20, yy); yy += 35;
  ctx.fillText(`SERVICIO: ${datos.servicio.toUpperCase()}`, boxX + 20, yy); yy += 35;
  ctx.fillText(`PRECIO: $ ${datos.precio.toFixed(2)}`, boxX + 20, yy); yy += 35;
  ctx.fillText(`CICLO: cada ${datos.ciclo.texto}`, boxX + 20, yy); yy += 35;
  ctx.fillText(`PRÓXIMO PAGO: ${formatFecha(datos.fechaVencimiento)}`, boxX + 20, yy);

  yy += 50;
  ctx.font = "bold 20px Sans-Serif";
  ctx.fillText("Cliente", boxX + 20, yy);
  ctx.fillText("Vendedor", boxX + boxW / 2, yy); yy += 30;
  ctx.font = "18px Sans-Serif";
  ctx.fillText(`${datos.cliente.nombre} (${datos.cliente.numero})`, boxX + 20, yy);
  ctx.fillText(`${datos.vendedor.nombre} (${datos.vendedor.numero})`, boxX + boxW / 2, yy);

  ctx.save();
  ctx.translate(W - 260, boxY + 120); ctx.rotate(-Math.PI / 12);
  ctx.strokeStyle = "#10b981"; ctx.lineWidth = 6; ctx.strokeRect(-10, -40, 240, 80);
  ctx.fillStyle = "#10b981"; ctx.font = "bold 28px Sans-Serif"; ctx.fillText("PAGO EXITOSO", 8, 10);
  ctx.restore();
  return canvas.toBuffer("image/png");
}

const handler = async (msg, { conn, args, command, isOwner, rowner, wa }) => {
  if (!isOwner && !rowner) return;
  const chatId = msg.key.remoteJid;
  if (args.length < 7) return conn.sendMessage(chatId, { text: `✳️ *Uso:* .${command} <numC> <numV> <serv> <precio> <nomC> <nomV> <ciclo>` });

  const numC = limpiarNumero(args[0]), numV = limpiarNumero(args[1]);
  const serv = args[2], precio = parseFloat(args[3].replace(',', '.'));
  const nomC = args[4].replace(/_/g, " "), nomV = args[5].replace(/_/g, " ");
  const ciclo = parseCiclo(args[6]);

  if (!ciclo || isNaN(precio)) return conn.sendMessage(chatId, { text: "❌ Precio o ciclo inválido." });

  await conn.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });

  try {
    const logoUrl = await subirLogoDesdeCita(msg, wa);
    const id = `FAC-${Math.floor(100000 + Math.random() * 900000)}`;
    const ahora = Date.now(), vence = ahora + ciclo.ms;

    const factura = { id, servicio: serv, precio, ciclo, fechaCreacion: ahora, fechaVencimiento: vence, cliente: { nombre: nomC, numero: numC }, vendedor: { nombre: nomV, numero: numV }, logoUrl };

    const filePath = path.join(process.cwd(), "facturas.json");
    let db = { facturas: [] };
    if (fs.existsSync(filePath)) db = JSON.parse(fs.readFileSync(filePath, "utf8"));
    db.facturas.push(factura);
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2));

    const buffer = await generarFacturaPNG({ logoUrl, datos: factura });
    await conn.sendMessage(chatId, { image: buffer, caption: `🧾 *FACTURA GENERADA*\n\n📄 *ID:* ${id}\n🛠 *Servicio:* ${serv}\n👤 *Cliente:* ${nomC} (${numC})\n🔁 *Ciclo:* ${ciclo.texto}` }, { quoted: msg });

    if (global.facturaTimeouts[id]) clearTimeout(global.facturaTimeouts[id]);
    global.facturaTimeouts[id] = setTimeout(async () => {
      await conn.sendMessage(chatId, { text: `⏰ *AVISO DE VENCIMIENTO*\n\nEl servicio *${serv}* de *${nomC}* (${numC}) ha vencido hoy.\n📄 *ID:* ${id}` });
      delete global.facturaTimeouts[id];
    }, ciclo.ms);

  } catch (e) {
    await conn.sendMessage(chatId, { text: "❌ Error: " + e.message });
  }
};

handler.command = ["addfactura"];
handler.owner = true;
export default handler;
