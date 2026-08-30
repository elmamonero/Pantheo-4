import fs from 'fs';
import path from 'path';

const conteoPath = path.resolve('./conteo.js');

// Si no existe el archivo, lo crea de una vez
if (!fs.existsSync(conteoPath)) {
  fs.writeFileSync(conteoPath, 'export default {};\n');
}

function leerConteo() {
  try {
    const contenido = fs.readFileSync(conteoPath, 'utf8');
    // Extrae únicamente el objeto JSON ignorando la sintaxis 'export default'
    const jsonText = contenido.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');
    return JSON.parse(jsonText);
  } catch {
    return {};
  }
}

async function guardarConteo(data) {
  try {
    const contenido = 'export default ' + JSON.stringify(data, null, 2) + ';\n';
    // Escritura asíncrona para no congelar las respuestas del bot
    await fs.promises.writeFile(conteoPath, contenido);
  } catch (e) {
    console.error('Error al guardar conteo:', e);
  }
}

async function contarMensaje(msg, conn) {
  if (!msg?.key?.remoteJid?.endsWith('@g.us')) return; // solo grupos

  const chatId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const conteoData = leerConteo();

  if (!conteoData[chatId]) conteoData[chatId] = {};
  if (!conteoData[chatId][sender]) conteoData[chatId][sender] = 0;

  conteoData[chatId][sender] += 1;

  await guardarConteo(conteoData);
}

export { contarMensaje };
