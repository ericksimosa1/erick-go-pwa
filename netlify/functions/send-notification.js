// netlify/functions/send-notification.js

const webPush = require('web-push');
const admin = require('firebase-admin');

// Configurar claves VAPID
webPush.setVapidDetails(
  'mailto:tu-email@ejemplo.com', // <-- IMPORTANTE: Reemplaza esto con tu email de contacto
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL, // <-- CORRECCIÓN CLAVE
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') // <-- CORRECCIÓN CLAVE
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log('Firebase Admin inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar Firebase Admin:', error);
  }
}

// Función para obtener suscripciones de usuarios
async function getUserSubscriptions(userIds) {
  try {
    const db = admin.firestore();
    const subscriptions = [];
    
    // <-- CORRECCIÓN: Verificar que userIds es un array válido
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      console.log('getUserSubscriptions: userIds no es un array válido o está vacío.');
      return [];
    }

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
    
    // <-- CORRECCIÓN: Verificar que userIds exista antes de continuar
    if (!userIds) {
      console.log('Error: userIds no fue proporcionado en el cuerpo de la petición.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Falta el campo userIds en la petición' }),
      };
    }
    
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
        await webPush.sendNotification(subscription, JSON.stringify(payload)); // <-- CORRECCIÓN: Stringify payload
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
      body: JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
    };
  }
};