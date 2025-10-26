// netlify/functions/update-reminder-status.js
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebase.app);
const db = getFirestore(app);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, action } = JSON.parse(event.body);

    if (!userId || !action) {
      return { statusCode: 400, body: 'Missing userId or action.' };
    }

    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const reminderDocId = `${userId}_${dateString}`;
    const reminderRef = doc(db, 'attendanceReminders', reminderDocId);

    // Guardar el estado para que no se envíen más recordatorios hoy
    await setDoc(reminderRef, {
      status: action, // 'going_on_my_own' o 'free'
      updatedAt: new Date()
    });

    console.log(`Estado de recordatorio para usuario ${userId} actualizado a: ${action}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Reminder status updated.' }),
    };
  } catch (error) {
    console.error('Error al actualizar estado de recordatorio:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update reminder status.' }),
    };
  }
};