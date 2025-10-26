// netlify/functions/send-notification.js

const webPush = require('web-push');

// Configuramos las claves VAPID que guardamos en Netlify
const PUBLIC_VAPID_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY;

// Es necesario configurar el 'subject' con tu email o sitio web
webPush.setVapidDetails(
  'mailto:erickgoapp@gmail.com', // <-- CAMBIA ESTO por un email tuyo
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

exports.handler = async function (event, context) {
  // Solo permitimos solicitudes POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Parseamos el cuerpo de la solicitud para obtener la suscripción y el mensaje
    const { subscription, payload } = JSON.parse(event.body);

    if (!subscription || !payload) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan la suscripción o el payload' }),
      };
    }

    // Enviamos la notificación usando web-push
    await webPush.sendNotification(subscription, payload);

    console.log('Notificación enviada con éxito a:', subscription.endpoint);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notificación enviada con éxito' }),
    };
  } catch (error) {
    console.error('Error al enviar la notificación:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor al enviar notificación' }),
    };
  }
};