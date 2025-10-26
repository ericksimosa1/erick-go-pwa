// CÓDIGO CORREGIDO
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- INICIO DEL BLOQUE CORREGIDO ---
// El Service Worker solo se registrará cuando la app esté en modo producción (cuando hagas `npm run build`).
// En desarrollo (`npm run dev`), esto se ignorará y no interferirá.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registrado: ', registration);
      })
      .catch(registrationError => {
        console.log('Error al registrar Service Worker: ', registrationError);
      });
  });
}
// --- FIN DEL BLOQUE CORREGIDO ---


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)