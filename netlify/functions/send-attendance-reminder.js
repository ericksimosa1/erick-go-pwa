// netlify/functions/send-attendance-reminder.js

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
  try {
    console.log('Función de recordatorio activada. Buscando administradores...');
    
    // Obtener administradores globales
    const administrators = await getGlobalAdministrators();
    
    if (administrators.length === 0) {
      return { 
        statusCode: 200, 
        body: JSON.stringify({ message: 'No hay administradores a quienes notificar.' }) 
      };
    }
    
    console.log(`Se encontraron ${administrators.length} administradores`);
    
    // Aquí podrías enviar notificaciones a todos los administradores
    // Por ahora, mantenemos la lógica original
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: `Función de recordatorio ejecutada. Se encontraron ${administrators.length} administradores.` 
      }),
    };
  } catch (error) {
    console.error('Error en la función de recordatorio:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};