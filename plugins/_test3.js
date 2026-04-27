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
  const m = String(token || "").trim().toLowerCase().match(/^(\d+)([smhd])$/);
  if (!m) return null;
  const valor = parseInt(m[1], 10);
  const uni = m[2];
  const ms = uni === "s" ? valor * 1000 : uni === "m" ? valor * 60 * 1000 : uni === "h" ? valor * 60 * 60 * 1000 : valor * 24 * 60 * 60 * 1000;
  return { valor, unidad: uni, ms, texto: `${valor}${uni}` };
}

const limpiarNumero = n => String(n || "").replace(/\D/g, "");

function formatFecha(ts) {
  const d = new Date(ts);
  return d.toLocaleString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function subirLogoDesdeCita(msg, wa) {
  const quoted = getQuoted(msg);
  if (!quoted?.imageMessage) throw new Error("Debes *responder a una imagen* que será usada como logo.");
  const DL = await getDownloader(wa);
  if (!DL) throw new Error("No puedo descargar la imagen.");
  const stream = await DL(quoted.imageMessage, "image");
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `${Date.now()}_logo.jpg`);
  const ws = fs.createWriteStream(tmpPath);
  for await (const chunk of stream) ws.write(chunk);
  ws.end();
  await new Promise(r => ws.on("finish", r));
  const form = new FormData();
  form.append("file", fs.createReadStream(tmpPath));
  const res = await axios.post("https://cdn.russellxz.click/upload.php", form, { headers: { ...form.getHeaders() } });
  if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  if (!res.data?.url) throw new Error("No se pudo subir el logo.");
  return res.data.url;
}

async function generarFacturaPNG({ logoUrl, datos }) {
  const W = 1100, H = 650;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#111827"; ctx.fillRect(0, 0, W, 120);
  try {
    const logo = await loadImage(logoUrl);
    const size = 90, x = 30, y = 15;
    ctx.save(); ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    ctx.drawImage(logo, x, y, size, size); ctx.restore();
  } catch (e) {}
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 34px Sans-Serif";
  ctx.fillText("FACTURA • PAGO EXITOSO", 140, 55);
  ctx.font = "16px Sans-Serif";
  ctx.fillText(`Generada: ${formatFecha(datos.fechaCreacion)}`, 140, 85);
  const boxX = 40, boxY = 150, boxW = W - 80, boxH = 360;
  ctx.fillStyle = "#f3f4f6"; ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = "#111827"; ctx.font = "bold 24px Sans-Serif";
  ctx.fillText("Detalle de la Factura", boxX + 20, boxY + 40);
  ctx.font = "18px Sans-Serif";
  const L = 30; let yy = boxY + 80;
  ctx.fillText(`Servicio: ${datos.servicio}`, boxX + 20, yy); yy += L;
  ctx.fillText(`Precio: $ ${datos.precio.toFixed(2)}`, boxX + 20, yy); yy += L;
  ctx.fillText(`Ciclo: cada ${datos.ciclo.texto}`, boxX + 20, yy); yy += L;
  ctx.fillText(`Próximo pago: ${formatFecha(datos.fechaProximoPago)}`, boxX + 20, yy); yy += L;
  yy += 20; ctx.font = "bold 20px Sans-Serif";
  ctx.fillText("Cliente", boxX + 20, yy);
  ctx.fillText("Vendedor", boxX + boxW / 2 + 10, yy); yy += 30;
  ctx.font = "18px Sans-Serif";
  ctx.fillText(`Nombre: ${datos.cliente.nombre}`, boxX + 20, yy);
  ctx.fillText(`Nombre: ${datos.vendedor.nombre}`, boxX + boxW / 2 + 10, yy); yy += L;
  ctx.fillText(`Número: ${datos.cliente.numero}`, boxX + 20, yy);
  ctx.fillText(`Número: ${datos.vendedor.numero}`, boxX + boxW / 2 + 10, yy);
  ctx.save(); ctx.translate(W - 260, boxY + 120); ctx.rotate(-Math.PI / 12);
  ctx.strokeStyle = "#10b981"; ctx.lineWidth = 6; ctx.strokeRect(-10, -40, 240, 80);
  ctx.fillStyle = "#10b981"; ctx.font = "bold 28px Sans-Serif"; ctx.fillText("PAGO EXITOSO", 8, 10);
  ctx.restore();
  return canvas.toBuffer("image/png");
}

const handler = async (msg, { conn, args, command, wa, isOwner, rowner }) => {
  const chatId = msg.key.remoteJid;

  if (!isOwner && !rowner) {
    return conn.sendMessage(chatId, { text: "🚫 Solo los owners pueden usar este comando." }, { quoted: msg });
  }

  // Si faltan argumentos, mostramos el error detallado
  if (args.length < 7) {
    return conn.sendMessage(chatId, {
      text: `❌ *Faltan datos.* Se recibieron ${args.length} de 7 parámetros.\n\n📌 *Uso:* .${command} <numCliente> <numVendedor> <servicio> <precio> <nombreCliente> <nombreVendedor> <ciclo>`
    }, { quoted: msg });
  }

  const numCliente = limpiarNumero(args[0]);
  const numVendedor = limpiarNumero(args[1]);
  const servicio = args[2];
  const precioRaw = args[3].replace(',', '.'); // Acepta comas decimales
  const precio = parseFloat(precioRaw);
  const nombreCliente = args[4].replace(/_/g, " ");
  const nombreVendedor = args[5].replace(/_/g, " ");
  const cicloParsed = parseCiclo(args[6]);

  // Debug en caso de fallo en validación interna
  if (!numCliente || !numVendedor || isNaN(precio) || !cicloParsed) {
     let debug = `❌ *Error de validación:*\n`;
     if (!numCliente) debug += `- Número cliente inválido\n`;
     if (!numVendedor) debug += `- Número vendedor inválido\n`;
     if (isNaN(precio)) debug += `- Precio (${args[3]}) no es un número\n`;
     if (!cicloParsed) debug += `- Ciclo (${args[6]}) inválido (usa s, m, h, d)\n`;
     return conn.sendMessage(chatId, { text: debug }, { quoted: msg });
  }

  await conn.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });

  let logoUrl;
  try {
    logoUrl = await subirLogoDesdeCita(msg, wa);
  } catch (e) {
    return conn.sendMessage(chatId, { text: `❌ ${e.message}` }, { quoted: msg });
  }

  const fechaCreacion = Date.now();
  const fechaProximoPago = fechaCreacion + cicloParsed.ms;

  const facturaData = {
    servicio,
    precio,
    ciclo: cicloParsed,
    fechaCreacion,
    fechaProximoPago,
    cliente: { numero: numCliente, nombre: nombreCliente },
    vendedor: { numero: numVendedor, nombre: nombreVendedor }
  };

  try {
    const buffer = await generarFacturaPNG({ logoUrl, datos: facturaData });
    const caption = `🧾 *Factura generada con éxito*\n🛠 Servicio: ${servicio}\n💵 Precio: $ ${precio.toFixed(2)}\n🔁 Ciclo: ${cicloParsed.texto}\n👤 Cliente: ${nombreCliente}\n🏪 Vendedor: ${nombreVendedor}`;
    
    await conn.sendMessage(chatId, { image: buffer, caption }, { quoted: msg });
  } catch (e) {
    return conn.sendMessage(chatId, { text: `❌ Error al crear imagen: ${e.message}` }, { quoted: msg });
  }
};

handler.command = ["addfactura"];
handler.owner = true;

export default handler;
