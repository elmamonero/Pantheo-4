import fetch from 'node-fetch';

const BACKUP_IMAGE = "https://cdn.russellxz.click/86eb0211.jpg";

// Tu JSON original
const data = {
  "links": {
    "video": [
      "https://telegra.ph/file/7323603085fa3365c3bd8.mp4",
      "https://telegra.ph/file/2bf683bde0b567b04cd91.mp4",
      "https://telegra.ph/file/57a26cd4514bb619ffbd2.mp4"
    ],
    "imagen": [
      "https://files.catbox.moe/oxjynm.jpg",
      "https://files.catbox.moe/l4saw1.jpg",
      "https://files.catbox.moe/8bywlp.jpg",
      "https://files.catbox.moe/9xgyvd.jpg",
      "https://files.catbox.moe/y15v80.jpg"
    ]
  }
};

/**
 * Intenta obtener una URL de medios. Si falla (por timeout o caída), devuelve el respaldo.
 * @param {string} url - La URL original
 * @returns {Promise<string>} - La URL funcional
 */
export async function getSafeMediaUrl(url) {
    if (!url) return BACKUP_IMAGE;
    
    try {
        const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return url; 
    } catch (error) {
        console.warn(`[Advertencia] Falló el enlace ${url}. Usando imagen de respaldo.`);
        return BACKUP_IMAGE; 
    }
}

/**
 * Recorre y valida todas las URLs del JSON original usando la función de seguridad.
 * @returns {Promise<Object>} - El JSON con los enlaces ya verificados
 */
export async function getVerifiedLinks() {
    const verifiedVideos = await Promise.all(
        data.links.video.map(url => getSafeMediaUrl(url))
    );

    const verifiedImages = await Promise.all(
        data.links.imagen.map(url => getSafeMediaUrl(url))
    );

    return {
        links: {
            video: verifiedVideos,
            imagen: verifiedImages
        }
    };
}
