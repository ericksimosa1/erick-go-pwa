// netlify/functions/send-notification.js

const webPush = require('web-push');
const admin = require('firebase-admin');

// Configurar claves VAPID
webPush.setVapidDetails(
  'mailto:erickgoapp@gmail.com', // Reemplazado con tu email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log('Firebase Admin inicializado correctamente.');
  } catch (error) {
    console.error('Error al inicializar Firebase Admin:', error);
  }
}

// Función para obtener suscripciones de usuarios desde Firestore
async function getUserSubscriptions(userIds) {
  try {
    const db = admin.firestore();
    const subscriptions = [];
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      console.log('getUserSubscriptions: La lista de userIds es inválida o está vacía.');
      return [];
    }

    const subscriptionPromises = userIds.map(async (userId) => {
      const doc = await db.collection('suscripciones').doc(userId).get();
      if (doc.exists) {
        return {
          userId: userId,
          subscription: doc.data().subscription
        };
      }
      return null;
    });

    const results = await Promise.all(subscriptionPromises);
    return results.filter(sub => sub !== null);

  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    return [];
  }
}

exports.handler = async function (event, context) {
  console.log('=== INICIO send-notification (versión universal) ===');
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const requestBody = JSON.parse(event.body);
    console.log('Cuerpo de la petición recibido:', JSON.stringify(requestBody, null, 2));

    const { userIds, userId, subscription, payload } = requestBody;

    // --- CASO 1: Notificación manual desde el panel de admin ---
    // Espera un array de userIds o un único userId
    if (payload && (userIds || userId)) {
      console.log('Detectado envío manual a usuarios.');
      let targetUserIds = Array.isArray(userIds) ? userIds : (userId ? [userId] : []);
      
      if (targetUserIds.length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Falta el campo userId o userIds para la notificación manual.' }),
        };
      }

      const subscriptions = await getUserSubscriptions(targetUserIds);
      
      if (subscriptions.length === 0) {
        console.log('No se encontraron suscripciones para los usuarios seleccionados.');
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'No hay suscripciones para notificar' }),
        };
      }

      console.log(`Enviando notificación a ${subscriptions.length} suscripciones encontradas.`);
      const results = await Promise.allSettled(
        subscriptions.map(async ({ userId, subscription }) => {
          try {
            await webPush.sendNotification(subscription, JSON.stringify(payload));
            console.log(`✅ Notificación enviada con éxito al usuario: ${userId}`);
            return { userId, success: true };
          } catch (error) {
            console.error(`❌ Error al enviar notificación al usuario ${userId}:`, error.message);
            return { userId, success: false, error: error.message };
          }
        })
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Proceso de notificación manual completado.',
          results: results
        }),
      };
    } 
    
    // --- CASO 2: Notificación automática ---
    // Espera un objeto de suscripción directo
    else if (payload && subscription) {
      console.log('Detectado envío automático a una suscripción.');
      try {
        await webPush.sendNotification(subscription, JSON.stringify(payload));
        console.log('✅ Notificación automática enviada con éxito.');
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Notificación automática enviada con éxito.' }),
        };
      } catch (error) {
        console.error('❌ Error al enviar notificación automática:', error.message);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Error al enviar notificación automática.', details: error.message }),
        };
      }
    } 
    
    // --- CASO 3: Error, el formato de la petición es incorrecto ---
    else {
      console.error('Error: El formato de la petición no es válido.');
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Formato de petición inválido. Se requiere {userIds: [...], payload: {...}} o {subscription: {...}, payload: {...}}.' 
        }),
      };
    }

  } catch (error) {
    console.error('Error general en la función send-notification:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
    };
  }
};