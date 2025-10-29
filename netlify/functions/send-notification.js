// netlify/functions/send-notification.js

const webPush = require('web-push');
const admin = require('firebase-admin');

// Configurar claves VAPID
// Asegúrate de que estas variables de entorno estén configuradas en Netlify
webPush.setVapidDetails(
  'mailto:erickgoapp@gmail.com', // <-- Reemplazado con tu email
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
    // No detenemos la ejecución, pero el log ayudará a depurar
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

    // Usamos Promise.all para obtener las suscripciones en paralelo (más eficiente)
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
    return results.filter(sub => sub !== null); // Filtramos los nulos

  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    return [];
  }
}

exports.handler = async function (event, context) {
  console.log('=== INICIO send-notification ===');
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Añadimos un log para ver exactamente qué se está recibiendo
    console.log('Cuerpo de la petición (raw):', event.body);
    
    const { userIds, payload } = JSON.parse(event.body);
    
    console.log('Datos recibidos y parseados:');
    console.log('- userIds:', userIds);
    console.log('- payload:', payload);
    
    // Verificación robusta: si userIds no es un array, lo convertimos.
    if (!Array.isArray(userIds)) {
      if (userIds) {
        console.log('Advertencia: userIds no era un array, se ha convertido a array.');
        userIds = [userIds];
      } else {
        console.log('Error: El campo userIds es obligatorio y no fue proporcionado.');
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Falta el campo obligatorio: userIds' }),
        };
      }
    }
    
    if (!payload) {
        console.log('Error: El campo payload es obligatorio y no fue proporcionado.');
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Falta el campo obligatorio: payload' }),
        };
    }
    
    // Obtener suscripciones de los usuarios
    const subscriptions = await getUserSubscriptions(userIds);
    
    if (subscriptions.length === 0) {
      console.log('No se encontraron suscripciones activas para los userIds proporcionados.');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No hay suscripciones para notificar' }),
      };
    }

    console.log(`Se encontraron ${subscriptions.length} suscripciones. Enviando notificaciones...`);
    
    // Enviar notificaciones a todas las suscripciones encontradas
    const results = await Promise.allSettled(
      subscriptions.map(async ({ userId, subscription }) => {
        try {
          await webPush.sendNotification(subscription, JSON.stringify(payload));
          console.log(`✅ Notificación enviada con éxito al usuario: ${userId}`);
          return { userId, success: true };
        } catch (error) {
          console.error(`❌ Error al enviar notificación al usuario ${userId}:`, error.message);
          // Si el error es 410 (Gone), significa que la suscripción ya no es válida.
          // Aquí podrías añadir lógica para borrarla de Firestore.
          return { userId, success: false, error: error.message };
        }
      })
    );

    console.log('Resultados del envío:', results);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Proceso de notificación completado.',
        results: results
      }),
    };
  } catch (error) {
    console.error('Error general en la función send-notification:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
    };
  }
};