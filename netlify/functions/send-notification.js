// netlify/functions/send-notification.js

const webPush = require('web-push');

// Configuramos las claves VAPID que guardamos en Netlify
const PUBLIC_VAPID_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY;

// Es necesario configurar el 'subject' con tu email o sitio web
webPush.setVapidDetails(
  'mailto:erickgoapp@gmail.com',
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

// Función para obtener administradores globales desde Firebase
async function getGlobalAdministrators() {
  try {
    const admin = require('firebase-admin');
    
    // Inicializar Firebase Admin si no está inicializado
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      });
    }
    
    const db = admin.firestore();
    const usersRef = db.collection('usuarios');
    const snapshot = await usersRef.where('rol', '==', 'administrador').get();
    
    if (snapshot.empty) {
      console.log('No se encontraron administradores globales');
      return [];
    }
    
    const administrators = [];
    snapshot.forEach(doc => {
      administrators.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Se encontraron ${administrators.length} administradores globales`);
    return administrators;
  } catch (error) {
    console.error('Error al obtener administradores globales:', error);
    return [];
  }
}

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
    const { subscription, payload, notificationType } = JSON.parse(event.body);

    if (!subscription || !payload) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan la suscripción o el payload' }),
      };
    }

    // Si es una notificación para administradores, obtener administradores globales
    if (notificationType === 'admin') {
      const administrators = await getGlobalAdministrators();
      
      if (administrators.length === 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'No hay administradores a quienes notificar' }),
        };
      }
      
      console.log(`Enviando notificación a ${administrators.length} administradores`);
      
      // Aquí podrías enviar notificaciones a todos los administradores
      // Por ahora, mantenemos la lógica original para una sola suscripción
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