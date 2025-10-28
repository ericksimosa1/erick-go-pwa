// sw.js

// --- LÓGICA DE CACHÉ (PWA) ---
// Esta sección es excelente para que tu app funcione sin internet.

const CACHE_NAME = 'erick-go-cache-v3'; // <-- CAMBIO: Versión de caché actualizada para forzar la limpieza.
const urlsToCache = [
  '/',
  '/erick-go-logo.png',
  '/manifest.json'
];

// Evento de instalación: guarda los archivos esenciales en la caché.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache abierto y archivos guardados');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Error al abrir la caché:', error);
      })
  );
});

// Evento de activación: limpia cachés antiguas para no ocupar espacio innecesario.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento fetch: intercepta las peticiones de red para servirlas desde la caché si es posible.
self.addEventListener('fetch', event => {
  // Ignoramos peticiones a Firebase para evitar conflictos.
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  // Estrategia: Cache First. Solo para peticiones GET de nuestro propio dominio.
  if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Si está en caché, la devuelve.
          if (response) {
            return response;
          }

          // Si no, la pide a la red.
          return fetch(event.request).then(response => {
            // Si la respuesta no es válida, no la cachea.
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona la respuesta para guardarla en caché.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
        })
    );
  } else {
    // Para cualquier otra petición (POST, extensiones, etc.), simplemente la deja pasar.
    // No intentamos cachearla ni interceptarla.
    return;
  }
});


// --- LÓGICA DE NOTIFICACIONES PUSH ---
// Esta sección maneja la recepción y visualización de las notificaciones.

// Evento que se dispara cuando nuestro backend (Netlify) envía una notificación.
self.addEventListener('push', event => {
  console.log('Service Worker: Notificación push recibida.', event);

  // Definimos un payload por defecto por si la notificación llega sin datos.
  let payload = {
    title: 'Erick Go PWA',
    body: 'Tienes una nueva notificación.',
    icon: '/erick-go-logo.png', // Usa tu logo como icono principal.
    badge: '/erick-go-logo.png', // Idealmente, usa un icono pequeño y monocromo para el badge.
    data: {
      url: '/', // URL a la que se dirigirá al hacer clic.
      primaryKey: 1
    }
  };

  // Si la notificación incluye datos, los usamos y mezclamos con el payload por defecto.
  if (event.data) {
    try {
      const dataFromServer = event.data.json();
      payload = { ...payload, ...dataFromServer };
    } catch (e) {
      console.error('Service Worker: Error al parsear el payload de la notificación:', e);
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    vibrate: [100, 50, 100], // Hace vibrar al teléfono.
    data: payload.data, // Pasamos los datos para usarlos en el evento 'click'.
    requireInteraction: true, // La notificación no desaparece hasta que el usuario interactúa con ella.
    actions: [
      {
        action: 'explore',
        title: 'Ver detalles',
      },
      {
        action: 'close',
        title: 'Cerrar',
      },
    ],
  };

  // Mostramos la notificación al usuario.
  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Evento que se dispara cuando el usuario hace clic en la notificación o en sus botones.
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notificación clickeada.', event);
  
  // Cerramos la notificación.
  event.notification.close();

  // Determinamos la URL a abrir. Por defecto, la del payload.
  let urlToOpen = event.notification.data.url || '/';

  // Manejamos las acciones personalizadas (ej. "Ver detalles", "Cerrar").
  if (event.action === 'explore') {
    console.log('Usuario quiere explorar');
    // La URL ya está en urlToOpen, así que solo procedemos a abrirla.
  } else if (event.action === 'close') {
    console.log('Usuario cerró la notificación');
    return; // No hacemos nada más.
  }

  // Buscamos si ya hay una pestaña de nuestra app abierta para enfocarla en lugar de abrir una nueva.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          // Si encontramos una pestaña abierta, la enfocamos.
          return client.focus();
        }
      }
      // Si no hay ninguna pestaña abierta, abrimos una nueva.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});