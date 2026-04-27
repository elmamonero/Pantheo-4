import fs from "fs";
import path from "path";
import { createCanvas, loadImage } from "canvas";

// --- UTILIDADES ---
const limpiarNumero = n => String(n || "").replace(/\D/g, "");

function formatFecha(ts) {
  const d = new Date(ts);
  return d.toLocaleString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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
    } catch (e) {}
  }

  ctx.fillStyle = "#ffffff"; ctx.font = "bold 34px Sans-Serif";
  ctx.fillText("FACTURA • PAGO EXITOSO", 140, 55);
  ctx.font = "16px Sans-Serif";
  ctx.fillText(`Renovada: ${formatFecha(datos.fechaCreacion)}`, 140, 85);

  const boxX = 40, boxY = 150, boxW = W - 80, boxH = 360;
  ctx.fillStyle = "#f3f4f6"; ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = "#111827"; ctx.font = "bold 24px Sans-Serif";
  ctx.fillText("Detalle de la Renovación", boxX + 20, boxY + 40);
  
  ctx.font = "18px Sans-Serif";
  let yy = boxY + 80;
  ctx.fillText(`ID FACTURA: ${datos.id}`, boxX + 20, yy); yy += 35;
  ctx.fillText(`SERVICIO: ${datos.servicio.toUpperCase()}`, boxX + 20, yy); yy += 35;
  ctx.fillText(`PRECIO: $ ${Number(datos.precio).toFixed(2)}`, boxX + 20, yy); yy += 35;
  ctx.fillText(`PRÓXIMO PAGO: ${formatFecha(datos.fechaProximoPago)}`, boxX + 20, yy);
  
  yy += 50;
  ctx.font = "bold 20px Sans-Serif";
  ctx.fillText("Cliente", boxX + 20, yy);
  ctx.fillText("Vendedor", boxX + boxW / 2, yy); yy += 30;
  ctx.font = "18px Sans-Serif";
  ctx.fillText(`${datos.cliente.nombre} (${datos.cliente.numero})`, boxX + 20, yy);
  ctx.fillText(`${datos.vendedor.nombre} (${datos.vendedor.numero})`, boxX + boxW / 2, yy);

  // Sello
  ctx.save();
  ctx.translate(W - 260, boxY + 120); ctx.rotate(-Math.PI / 12);
  ctx.strokeStyle = "#10b981"; ctx.lineWidth = 6; ctx.strokeRect(-10, -40, 240, 80);
  ctx.fillStyle = "#10b981"; ctx.font = "bold 28px Sans-Serif"; ctx.fillText("PAGO EXITOSO", 8, 10);
  ctx.restore();

  return canvas.toBuffer("image/png");
}

const handler = async (msg, { conn, args, command, isOwner, rowner }) => {
  const chatId = msg.key.remoteJid;
  
  // Verificación de Dueño
  if (!isOwner && !rowner) return;

  if (args.length < 2) {
    return conn.sendMessage(chatId, { text: `✳️ *Uso:* .${command} <numeroCliente> <servicio>\n\nEjemplo: .${command} 584241234567 netflix` }, { quoted: msg });
  }

  const numeroCliente = limpiarNumero(args[0]);
  const servicioBusqueda = args.slice(1).join(" ").toLowerCase().trim();
  const filePath = path.join(process.cwd(), "facturas.json");

  if (!fs.existsSync(filePath)) return conn.sendMessage(chatId, { text: "📂 No hay base de datos de facturas aún." });

  let db = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const facturas = Array.isArray(db.facturas) ? db.facturas : [];

  // Buscar factura existente
  const fIdx = facturas.findIndex(f => 
    limpiarNumero(f.cliente?.numero) === numeroCliente && 
    f.servicio.toLowerCase().trim() === servicioBusqueda
  );

  if (fIdx === -1) return conn.sendMessage(chatId, { text: `🔎 No encontré facturas para el número *${numeroCliente}* con el servicio *${servicioBusqueda}*.` });

  let f = facturas[fIdx];
  const ahora = Date.now();
  const duracionMs = f.ciclo?.ms || 2592000000; // 30 días por defecto si no hay ms

  // Actualizar datos
  f.fechaCreacion = ahora;
  f.fechaProximoPago = ahora + duracionMs;
  db.facturas[fIdx] = f;
  fs.writeFileSync(filePath, JSON.stringify(db, null, 2));

  await conn.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });

  try {
    const buffer = await generarFacturaPagaPNG({
      logoUrl: f.logoUrl,
      datos: f
    });

    const caption = `🧾 *RENOVACIÓN EXITOSA*\n\n📄 *ID:* ${f.id}\n🛠 *Servicio:* ${f.servicio}\n👤 *Cliente:* ${f.cliente.nombre} (${f.cliente.numero})\n🏪 *Vendedor:* ${f.vendedor.nombre} (${f.vendedor.numero})\n\n_El bot te avisará cuando venza nuevamente._`;

    await conn.sendMessage(chatId, { image: buffer, caption }, { quoted: msg });

    // Temporizador de aviso
    setTimeout(async () => {
      const aviso = `⏰ *AVISO DE VENCIMIENTO (RENOVADO)* ⏰\n\nEl servicio *${f.servicio}* de *${f.cliente.nombre}* ha vencido.\n\n📱 *Número Cliente:* ${f.cliente.numero}\n📄 *ID Factura:* ${f.id}\n💰 *Precio:* $${f.precio}`;
      await conn.sendMessage(chatId, { text: aviso });
    }, duracionMs);

  } catch (e) {
    await conn.sendMessage(chatId, { text: "❌ Error: " + e.message });
  }
};

handler.command = ["facturapaga", "facpaga"];
handler.owner = true;

export default handler;
