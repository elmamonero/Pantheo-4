import fs from "fs";
import path from "path";
import { createCanvas, loadImage } from "canvas";

// Almacén global de cronómetros
if (!global.facturaTimeouts) global.facturaTimeouts = {};

const limpiarNumero = n => String(n || "").replace(/\D/g, "");

function formatFecha(ts) {
  const d = new Date(ts);
  return d.toLocaleString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function parseCiclo(token) {
  const m = String(token || "").trim().match(/^(\d+)([smhdM])$/);
  if (!m) return null;
  const valor = parseInt(m[1], 10);
  const uni = m[2];
  const mult = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000, 'M': 2592000000 };
  return { valor, unidad: uni, ms: valor * mult[uni], texto: `${valor}${uni}` };
}

async function generarFacturaPagaPNG({ logoUrl, datos }) {
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
  ctx.fillText(`Renovación sumada: ${formatFecha(Date.now())}`, 140, 85);

  const boxX = 40, boxY = 150, boxW = W - 80, boxH = 360;
  ctx.fillStyle = "#f3f4f6"; ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = "#111827"; ctx.font = "bold 24px Sans-Serif";
  ctx.fillText("Detalle de la Renovación", boxX + 20, boxY + 40);
  ctx.font = "18px Sans-Serif";
  let yy = boxY + 80;
  ctx.fillText(`ID FACTURA: ${datos.id}`, boxX + 20, yy); yy += 35;
  ctx.fillText(`SERVICIO: ${datos.servicio.toUpperCase()}`, boxX + 20, yy); yy += 35;
  ctx.fillText(`PRECIO: $ ${Number(datos.precio).toFixed(2)}`, boxX + 20, yy); yy += 35;
  ctx.fillText(`CICLO AÑADIDO: ${datos.ciclo.texto}`, boxX + 20, yy); yy += 35;
  ctx.fillText(`NUEVO VENCIMIENTO: ${formatFecha(datos.fechaVencimiento)}`, boxX + 20, yy);
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

const handler = async (msg, { conn, args, command, isOwner, rowner }) => {
  if (!isOwner && !rowner) return;
  const chatId = msg.key.remoteJid;
  if (args.length < 1) return conn.sendMessage(chatId, { text: `✳️ *Uso:* .${command} <ID> <tiempo(opcional)>` });

  const idBusqueda = args[0].toUpperCase().trim(), tiempoExtraRaw = args[1];
  const filePath = path.join(process.cwd(), "facturas.json");
  if (!fs.existsSync(filePath)) return conn.sendMessage(chatId, { text: "📂 No hay base de datos." });

  let db = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const facturas = Array.isArray(db.facturas) ? db.facturas : [];
  const fIdx = facturas.findIndex(f => f.id === idBusqueda);
  if (fIdx === -1) return conn.sendMessage(chatId, { text: `🔎 ID *${idBusqueda}* no encontrado.` });

  let f = facturas[fIdx], ahora = Date.now();
  let baseTiempo = f.fechaVencimiento > ahora ? f.fechaVencimiento : ahora;

  if (tiempoExtraRaw) {
    const nuevoCiclo = parseCiclo(tiempoExtraRaw);
    if (nuevoCiclo) f.ciclo = nuevoCiclo;
  }

  f.fechaVencimiento = baseTiempo + f.ciclo.ms;
  f.fechaCreacion = ahora;
  db.facturas[fIdx] = f;
  fs.writeFileSync(filePath, JSON.stringify(db, null, 2));

  // --- MATAR ALARMA ANTERIOR ---
  if (global.facturaTimeouts[f.id]) {
    clearTimeout(global.facturaTimeouts[f.id]);
    delete global.facturaTimeouts[f.id];
  }

  await conn.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });

  try {
    const buffer = await generarFacturaPagaPNG({ logoUrl: f.logoUrl, datos: f });
    const restanteMs = f.fechaVencimiento - ahora;
    await conn.sendMessage(chatId, { image: buffer, caption: `🧾 *RENOVACIÓN SUMADA*\n\n📄 *ID:* ${f.id}\n🛠 *Servicio:* ${f.servicio}\n👤 *Cliente:* ${f.cliente.nombre} (${f.cliente.numero})\n🗓 *Vence:* ${formatFecha(f.fechaVencimiento)}` }, { quoted: msg });

    global.facturaTimeouts[f.id] = setTimeout(async () => {
      await conn.sendMessage(chatId, { text: `⏰ *AVISO DE VENCIMIENTO*\n\nEl servicio *${f.servicio}* de *${f.cliente.nombre}* (${f.cliente.numero}) ha vencido hoy.\n📄 *ID:* ${f.id}` });
      delete global.facturaTimeouts[f.id];
    }, restanteMs);
  } catch (e) {
    await conn.sendMessage(chatId, { text: "❌ Error: " + e.message });
  }
};

handler.command = ["facturapaga", "facpaga"];
handler.owner = true;
export default handler;
