import { API_URL } from '../services/api';

/**
 * Retorna la URL correcta para cualquier recurso de imagen.
 * - Si es nulo o vacío -> null
 * - Si es Base64 (data:image/...) -> lo devuelve directo (útil para previsualización instantánea al seleccionar archivo)
 * - Si es URL completa (http:// o https://) -> lo devuelve directo
 * - Si es ruta relativa (/uploads/...) -> concatena con API_URL
 */
export const getImageUrl = (imageSrc) => {
  if (!imageSrc || typeof imageSrc !== 'string') return null;
  if (imageSrc.startsWith('data:') || imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
    return imageSrc;
  }
  const cleanPath = imageSrc.startsWith('/') ? imageSrc : `/${imageSrc}`;
  return `${API_URL}${cleanPath}`;
};
