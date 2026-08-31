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

    await conn.sendMessage(m.chat, { text: `⏳ Mejorando imagen con Delirius API, aguarda un momento...` }, { quoted: m })

    const buffer = await q.download()
    const tmp = path.join(__dirname, `tmp_${Date.now()}.jpg`)
    await fs.promises.writeFile(tmp, buffer)

    const imageUrl = await uploadToUguu(tmp)
    if (!imageUrl) throw new Error('No se pudo subir la imagen temporal a Uguu.')

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
 * Sube el archivo local a Uguu para obtener una URL pública
 */
async function uploadToUguu(filePath) {
  const form = new FormData()
  form.append("files[]", fs.createReadStream(filePath))

  try {
    const res = await fetch("https://uguu.se/upload.php", {
      method: "POST",
      headers: form.getHeaders(),
      body: form
    })

    const json = await res.json()
    await fs.promises.unlink(filePath).catch(() => {})
    return json.files?.[0]?.url
  } catch {
    await fs.promises.unlink(filePath).catch(() => {})
    return null
  }
}

/**
 * Consume la API /ia/enhance de Delirius
 */
async function enhanceImage(url) {
  const apiUrl = `https://api.delirius.online/ia/enhance?image=${encodeURIComponent(url)}&scale=4`
  const res = await fetch(apiUrl)
  
  if (!res.ok) throw new Error("La API de Delirius no pudo procesar la imagen.")
  
  // Si la API retorna directamente el buffer binario de la imagen
  const contentType = res.headers.get("content-type")
  if (contentType && contentType.includes("image")) {
    return await res.buffer()
  }

  // Si la API retorna un JSON con la URL de resultado
  const json = await res.json()
  const finalUrl = json?.url || json?.data || json?.result
  
  if (!finalUrl) throw new Error("No se obtuvo una respuesta válida de la API.")
  
  const imgRes = await fetch(finalUrl)
  return await imgRes.buffer()
}
