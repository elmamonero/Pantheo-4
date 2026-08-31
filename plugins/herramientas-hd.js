import fs from "fs"
import path from "path"
import fetch from "node-fetch"
import FormData from "form-data"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const handler = async (m, { conn }) => {
  try {
    const q = m.quoted || m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    if (!/^image\/(jpe?g|png)$/.test(mime)) {
      return m.reply('🪐 Responde a una imagen JPG o PNG.')
    }

    await conn.sendMessage(m.chat, { text: `⏳ Mejorando imagen, por favor espera...` }, { quoted: m })

    const buffer = await q.download()
    const tmp = path.join(__dirname, `tmp_${Date.now()}.jpg`)
    await fs.promises.writeFile(tmp, buffer)

    // Subir la imagen para obtener una URL pública
    const imageUrl = await uploadToUguu(tmp)
    if (!imageUrl) throw new Error('No se pudo subir la imagen al servidor temporal.')

    // Consumir la API de Delirius
    const enhancedBuffer = await enhanceImage(imageUrl)
    
    await conn.sendFile(m.chat, enhancedBuffer, 'hd.jpg', '✅ *Imagen mejorada con éxito.*', m)

  } catch (err) {
    conn.reply(m.chat, `*Error:* ${err.message}`, m)
  }
}

handler.help = ['upscale']
handler.tags = ['tools']
handler.command = ['hd', 'remini', 'upscale', 'enhance']

export default handler

/**
 * Sube el archivo local a Uguu para obtener una URL pública accesible por la API
 */
async function uploadToUguu(filePath) {
  try {
    const form = new FormData()
    form.append("files[]", fs.createReadStream(filePath))

    const res = await fetch("https://uguu.se/upload.php", {
      method: "POST",
      headers: form.getHeaders(),
      body: form
    })

    const json = await res.json()
    await fs.promises.unlink(filePath).catch(() => {})
    
    // Validar que realmente se obtenga una URL válida
    const fileUrl = json?.files?.[0]?.url
    if (!fileUrl) return null
    
    return fileUrl
  } catch {
    await fs.promises.unlink(filePath).catch(() => {})
    return null
  }
}

/**
 * Extrae la URL formateada según la respuesta JSON de Delirius:
 * { status: true, data: { scale: 4, url: "https://..." } }
 */
async function enhanceImage(url) {
  const apiUrl = `https://api.delirius.online/ia/enhance?image=${encodeURIComponent(url)}&scale=4`
  const res = await fetch(apiUrl)
  
  if (!res.ok) throw new Error("La API de Delirius no respondió correctamente.")
  
  const json = await res.json()
  
  if (!json?.status || !json?.data?.url) {
    throw new Error(json?.message || "La API de Delirius no devolvió un enlace de imagen válido.")
  }

  // Descargar la imagen procesada desde Picsart/Delirius
  const imgRes = await fetch(json.data.url)
  if (!imgRes.ok) throw new Error("No se pudo descargar la imagen resultante de la API.")

  return await imgRes.buffer()
}
