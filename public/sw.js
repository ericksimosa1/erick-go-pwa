const CACHE_NAME = 'erick-go-cache-v2';
const urlsToCache = [
  '/',
  '/erick-go-logo.png',
  '/manifest.json'
];

// Evento de instalación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Error al abrir la caché:', error);
      })
  );
});

// Evento de activación para limpiar cachés antiguas
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento fetch con manejo de errores mejorado
self.addEventListener('fetch', event => {
  // Ignorar peticiones a Firebase (Firestore, Auth, etc.)
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, devolverlo
        if (response) {
          return response;
        }
        
        // Si no está en caché, intentar obtenerlo de la red
        return fetch(event.request)
          .then(response => {
            // Verificar si la respuesta es válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar la respuesta para poder guardarla en caché
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.error('Error al guardar en caché:', error);
              });
              
            return response;
          })
          .catch(error => {
            console.error('Error en la petición de red:', error);
            
            // Si es una petición de página y falla la red, intentar servir una página offline
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            
            // Para otros recursos, devolver un error controlado
            return new Response('Error de conexión', {
              status: 408,
              statusText: 'Request Timeout'
            });
          });
      })
      .catch(error => {
        console.error('Error general en el Service Worker:', error);
        
        // Para peticiones de página, intentar servir la página principal
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
        
        // Para otros recursos, devolver un error controlado
        return new Response('Error de conexión', {
          status: 408,
          statusText: 'Request Timeout'
        });
      })
  );
});

// --- NUEVA SECCIÓN PARA NOTIFICACIONES PUSH ---

// Evento que se dispara cuando el servidor envía una notificación push
self.addEventListener('push', event => {
  console.log('Notificación push recibida:', event);

  // Si no hay datos en la notificación, mostramos una por defecto
  let payload = {
    title: 'Erick Go',
    body: 'Tienes una nueva notificación.',
    icon: '/erick-go-logo.png',
    badge: '/erick-go-logo.png',
    data: {
      url: '/' // URL a la que se dirigirá al hacer clic
    }
  };

  // Si la notificación incluye datos, los usamos
  if (event.data) {
    payload = { ...payload, ...event.data.json() };
  }

  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    vibrate: [100, 50, 100],
    data: {
      url: payload.data.url,
      action: payload.data.action
    },
    // Definimos las acciones para el recordatorio de asistencia
    actions: payload.actions || []
  };

  // Mostramos la notificación
  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Evento que se dispara cuando el usuario hace clic en la notificación
self.addEventListener('notificationclick', event => {
  console.log('Notificación clickeada:', event.notification);
  
  // Cerramos la notificación
  event.notification.close();

  // Obtenemos la URL base de los datos de la notificación
  let urlToOpen = event.notification.data.url || '/';

  // Si la acción es una de las del recordatorio, manejamos la URL específica
  if (event.action) {
    console.log('Acción seleccionada:', event.action);
    // Construimos una URL con la acción como parámetro de consulta
    const actionUrl = `/?action=${event.action}`;
    urlToOpen = actionUrl;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Buscamos si ya hay una ventana de la app abierta
      for (const client of clientList) {
        // En lugar de verificar una URL específica, verificamos que el cliente sea visible y lo enfocamos
        if (client.url && 'focus' in client) {
          return client.focus().then(client => {
            // Enviamos un mensaje a la app para que navegue a la URL correcta
            client.postMessage({ type: 'NAVIGATE', payload: { url: urlToOpen } });
          });
        }
      }
      // Si no hay una ventana abierta, abrimos una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});