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