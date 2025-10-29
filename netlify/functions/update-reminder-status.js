// netlify/functions/update-reminder-status.js

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

exports.handler = async function (event, context) {
  // Solo permitimos solicitudes POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Parseamos el cuerpo de la solicitud
    const { userId, status, subscriptionId } = JSON.parse(event.body);

    // Preferimos userId sobre subscriptionId
    if (!userId && !subscriptionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan userId o subscriptionId' }),
      };
    }

    if (status === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Falta el status' }),
      };
    }

    const db = admin.firestore();
    
    // Si tenemos userId, actualizamos directamente
    if (userId) {
      await db.collection('suscripciones').doc(userId).update({
        remindersEnabled: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Preferencia de recordatorios actualizada para usuario ${userId}: ${status}`);
    } 
    // Si solo tenemos subscriptionId, buscamos el usuario
    else if (subscriptionId) {
      const subscriptionsRef = db.collection('suscripciones');
      const snapshot = await subscriptionsRef.where('subscription.endpoint', '==', subscriptionId).get();
      
      if (snapshot.empty) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Suscripción no encontrada' }),
        };
      }
      
      // Actualizar todos los documentos que coincidan (debería ser solo uno)
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          remindersEnabled: status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      console.log(`Preferencia de recordatorios actualizada para suscripción ${subscriptionId}: ${status}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Estado del recordatorio actualizado con éxito',
        status: status
      }),
    };
  } catch (error) {
    console.error('Error al actualizar el estado del recordatorio:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};