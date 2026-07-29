import fetch from 'node-fetch'; // O usa 'axios' si es lo que usa tu proyecto

const BACKUP_IMAGE = "https://cdn.russellxz.click/86eb0211.jpg";

/**
 * Intenta obtener una URL de medios. Si falla (por timeout o caída), devuelve el respaldo.
 * @param {string} url - La URL original (ej. de Catbox)
 * @returns {Promise<string>} - La URL funcional
 */
export async function getSafeMediaUrl(url) {
    if (!url) return BACKUP_IMAGE;
    
    try {
        // Hacemos una petición rápida con timeout para verificar si el enlace responde
        const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return url; // Si responde bien, usamos la original
    } catch (error) {
        console.warn(`[Advertencia] Falló el enlace ${url}. Usando imagen de respaldo.`);
        return BACKUP_IMAGE; // Si falla o da ETIMEDOUT, usamos tu respaldo
    }
}
