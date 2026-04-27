import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas, loadImage } from "canvas";
import FormData from "form-data";
import axios from "axios";

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
  // Soporta s (seg), m (min), h (horas), d (días), M (meses)
  const m = String(token || "").trim().match(/^(\d+)([smhdM])$/);
  if (!m) return null;
  const valor = parseInt(m[1], 10);
  const uni = m[2];
  
  const multiplicadores = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'M': 30 * 24 * 60 * 60 * 1000 // Mes de 30 días
  };

  return { valor, unidad: uni, ms: valor * multiplicadores[uni], texto: `${valor}${uni}` };
}

const limpiarNumero = n => String(n || "").replace(/\D/g, "");

function formatFecha(ts) {
  const d = new Date(ts);
  return d.toLocaleString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function subirLogoDesdeCita(msg, wa) {
  const quoted = getQuoted(msg);
  if (!quoted?.imageMessage) throw new Error("Responde a una imagen para el logo.");
  const DL = await getDownloader(wa);
  const stream = await DL(quoted.imageMessage, "image");
  const tmpPath = path.join(process.cwd(), "tmp", `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
  if (!fs.existsSync(path.join(process.cwd(), "tmp"))) fs.mkdirSync(path.join(process.cwd(), "tmp"));
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
  ctx.fillStyle = "#1e3a8a"; ctx.fillRect(0, 0, W, 120);
  try {
    const logo = await loadImage(logoUrl);
    ctx.drawImage(logo, 30, 15, 90, 90);
  } catch {}
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 34px Sans-Serif";
  ctx.fillText("COMPROBANTE DE PAGO", 140, 65);
  ctx.fillStyle = "#000000"; ctx.font = "20px Sans-Serif";
  let yy = 180;
  ctx.fillText(`ID FACTURA: ${datos.id}`, 50, yy); yy += 40;
  ctx.fillText(`CLIENTE: ${datos.cliente}`, 50, yy); yy += 40;
  ctx.fillText(`SERVICIO: ${datos.servicio}`, 50, yy); yy += 40;
  ctx.fillText(`PRECIO: $${datos.precio.toFixed(2)}`, 50, yy); yy += 40;
  ctx.fillText(`VENCIMIENTO: ${formatFecha(datos.vence)}`, 50, yy);
  return canvas.toBuffer("image/png");
}

const handler = async (msg, { conn, args, isOwner, rowner, wa }) => {
  if (!isOwner && !rowner) return;
  if (args.length < 7) return conn.sendMessage(msg.key.remoteJid, { text: "Uso: .addfactura <num> <vendedor> <servicio> <precio> <nombre> <vendedorNombre> <ciclo>" });

  const servicio = args[2];
  const precio = parseFloat(args[3]);
  const nombre = args[4].replace(/_/g, " ");
  const ciclo = parseCiclo(args[6]);

  if (!ciclo) return conn.sendMessage(msg.key.remoteJid, { text: "Ciclo inválido. Usa: 10s, 1h, 1d, 1M" });

  try {
    const logo = await subirLogoDesdeCita(msg, wa);
    const vence = Date.now() + ciclo.ms;
    const id = `FAC-${Math.floor(Math.random() * 90000)}`;

    const buffer = await generarFacturaPNG({
      logoUrl: logo,
      datos: { id, cliente: nombre, servicio, precio, vence }
    });

    await conn.sendMessage(msg.key.remoteJid, { image: buffer, caption: `✅ Factura ${id} generada para ${nombre}.` });

    // El temporizador es independiente para cada ejecución del comando
    setTimeout(async () => {
      await conn.sendMessage(msg.key.remoteJid, { text: `⚠️ *AVISO:* El servicio *${servicio}* de *${nombre}* ha vencido hoy.` });
    }, ciclo.ms);

  } catch (e) {
    conn.sendMessage(msg.key.remoteJid, { text: "Error: " + e.message });
  }
};

handler.command = ["addfactura"];
handler.owner = true;
export default handler;
