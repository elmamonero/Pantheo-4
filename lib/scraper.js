import fetch from 'node-fetch';
import cheerio from 'cheerio';
import axios from 'axios';

// Función alternativa más estable para Facebook
async function facebookDl(url) {
  try {
    // Usamos una API o servicio directo para evitar bloqueos de cheerio en fdownloader
    let res = await fetch(`https://api.dorianhost.com/api/download/facebook?url=${encodeURIComponent(url)}`);
    let json = await res.json();
    if (json && json.resultado) {
      return {
        '720p': json.resultado.hd || json.resultado.sd,
        '360p': json.resultado.sd
      };
    }
    
    // Si la API falla, intentamos una segunda opción o devolvemos vacío
    throw new Error('No se pudo obtener el enlace');
  } catch (e) {
    // Método de respaldo por si el servicio principal cae
    let res = await fetch(`https://deliriussapi.onrender.com/download/facebook?url=${encodeURIComponent(url)}`);
    let json = await res.json();
    if (json && json.data) {
      let links = {};
      json.data.forEach(i => {
        links[i.resolution] = i.url;
      });
      return links;
    }
    return {};
  }
}

// ... (tus otras funciones como sekaikomikDl, igStalk, tiktokStalk se quedan igual debajo)

export {
	sekaikomikDl,
	igStalk,	
	facebookDl,	
	tiktokStalk
};
