// netlify/functions/send-notification.js

const webPush = require('web-push');
const admin = require('firebase-admin');

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
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
  console.log('=== INICIO send-notification (versión corregida) ===');
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { userIds, payload, notificationType } = JSON.parse(event.body);
    
    console.log('Datos recibidos:');
    console.log('userIds:', userIds);
    console.log('payload:', payload);
    console.log('notificationType:', notificationType);
    
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