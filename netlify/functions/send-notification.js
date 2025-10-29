// netlify/functions/send-notification.js

const webPush = require('web-push');
const admin = require('firebase-admin');

// Configuramos las claves VAPID
webPush.setVapidDetails(
  'mailto:erickgoapp@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID, // Cambiado a project_id
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

// Función para obtener suscripciones de usuarios
async function getUserSubscriptions(userIds) {
  try {
    const db = admin.firestore();
    const subscriptions = [];
    
    for (const userId of userIds) {
      const doc = await db.collection('suscripciones').doc(userId).get();
      if (doc.exists) {
        subscriptions.push({
          userId: userId,
          subscription: doc.data().subscription
        });
      }
    }
    
    return subscriptions;
  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    return [];
  }
}

exports.handler = async function (event, context) {
  console.log('=== INICIO send-notification ===');
  console.log('Método HTTP:', event.httpMethod);
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    console.log('Body recibido:', JSON.stringify(body, null, 2));
    
    const { userIds, payload, notificationType } = body;

    if (!userIds || !payload) {
      console.log('Error: Faltan userIds o payload');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan userIds o payload' }),
      };
    }

    console.log(`Buscando suscripciones para ${userIds.length} usuarios`);
    
    // Obtener suscripciones de los usuarios
    const subscriptions = await getUserSubscriptions(userIds);
    
    if (subscriptions.length === 0) {
      console.log('No hay suscripciones para notificar');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No hay suscripciones para notificar' }),
      };
    }

    console.log(`Enviando notificaciones a ${subscriptions.length} suscripciones`);
    
    // Enviar notificaciones a todas las suscripciones
    const results = [];
    for (const { userId, subscription } of subscriptions) {
      try {
        await webPush.sendNotification(subscription, payload);
        results.push({ userId, success: true });
        console.log(`✅ Notificación enviada a usuario: ${userId}`);
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
        console.error(`❌ Error al enviar a usuario ${userId}:`, error);
      }
    }

    console.log('Resultados:', JSON.stringify(results, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Proceso completado',
        results: results
      }),
    };
  } catch (error) {
    console.error('Error al enviar notificaciones:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};