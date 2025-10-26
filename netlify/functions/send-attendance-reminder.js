// netlify/functions/send-attendance-reminder.js

const webPush = require('web-push');

// Configuramos las claves VAPID que guardamos en Netlify
const PUBLIC_VAPID_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY;

// Es necesario configurar el 'subject' con tu email o sitio web
webPush.setVapidDetails(
  'mailto:tu-erickgoapp@gmail.com', // <-- CAMBIA ESTO por el mismo email que antes
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

exports.handler = async function (event, context) {
  try {
    // --- IMPORTANTE ---
    // En una aplicación real, aquí harías una consulta a tu base de datos
    // para obtener la lista de todas las suscripciones activas.
    // Por ahora, como no tenemos base de datos, esta función no hará nada
    // hasta que la conectemos a un sistema de almacenamiento.
    console.log('Función de recordatorio activada. Buscando suscripciones...');

    // const subscriptions = await database.getAllSubscriptions(); // Ejemplo de cómo sería

    // if (subscriptions.length === 0) {
    //   return { statusCode: 200, body: 'No hay suscriptores a quienes notificar.' };
    // }

    // const payload = JSON.stringify({
    //   title: 'Recordatorio de Transporte',
    //   body: 'Tu servicio de transporte está por llegar. ¡Esté listo!',
    //   icon: '/icons/icon-192x192.png',
    // });

    // for (const subscription of subscriptions) {
    //   try {
    //     await webPush.sendNotification(subscription, payload);
    //     console.log('Recordatorio enviado a:', subscription.endpoint);
    //   } catch (error) {
    //     console.error('Error al enviar recordatorio a:', subscription.endpoint, error);
    //   }
    // }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Función de recordatorio ejecutada (sin lógica de base de datos aún).' }),
    };
  } catch (error) {
    console.error('Error en la función de recordatorio:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};