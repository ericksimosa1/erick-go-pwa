// netlify/functions/save-subscription.js

const admin = require('firebase-admin');

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

exports.handler = async function (event, context) {
  console.log('=== INICIO save-subscription (versión corregida) ===');
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { userId, subscription } = JSON.parse(event.body);

    if (!userId || !subscription) {
      console.log('Error: Faltan userId o subscription');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan userId o subscription' }),
      };
    }

    const db = admin.firestore();
    
    // Guardar o actualizar la suscripción en Firebase
    await db.collection('suscripciones').doc(userId).set({
      userId: userId,
      subscription: subscription,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`Suscripción guardada para usuario: ${userId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Suscripción guardada con éxito',
        userId: userId
      }),
    };
  } catch (error) {
    console.error('Error al guardar la suscripción:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
    };
  }
};