// netlify/functions/send-attendance-reminder.js
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc, setDoc, Timestamp } = require('firebase/firestore');
const webpush = require('web-push');

// Configuración de Firebase (deberás poner la tuya)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Configuración VAPID (usaremos variables de entorno)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL;

if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
  console.error('Faltan las variables de entorno VAPID.');
}

webpush.setVapidDetails(
  `mailto:${vapidEmail}`,
  vapidPublicKey,
  vapidPrivateKey
);

exports.handler = async (event, context) => {
  console.log('Iniciando proceso de recordatorios de asistencia...');
  
  // 1. Obtener todas las empresas (clientes)
  const clientsSnapshot = await getDocs(collection(db, 'clientes'));
  if (clientsSnapshot.empty) {
    console.log('No se encontraron empresas. Finalizando.');
    return { statusCode: 200, body: 'No companies found.' };
  }

  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD

  for (const clientDoc of clientsSnapshot.docs) {
    const clientId = clientDoc.id;
    const companyName = clientDoc.data().nombre;
    console.log(`\n--- Procesando empresa: ${companyName} (ID: ${clientId}) ---`);

    try {
      // 2. Obtener todos los usuarios de esta empresa
      const usersSnapshot = await getDocs(
        query(collection(db, 'vinculos'), where('clientId', '==', clientId), where('activo', '==', true))
      );

      const employees = [];
      for (const vinculoDoc of usersSnapshot.docs) {
        const userDoc = await getDoc(doc(db, 'usuarios', vinculoDoc.data().userId));
        if (userDoc.exists() && userDoc.data().rol === 'empleado') {
          employees.push({ userId: userDoc.id, userData: userDoc.data() });
        }
      }
      
      if (employees.length === 0) {
        console.log(`No hay empleados para la empresa ${companyName}.`);
        continue;
      }

      // 3. Para cada empleado, verificar si necesita recordatorio
      for (const employee of employees) {
        const employeeId = employee.userId;
        const employeeName = employee.userData.nombre;
        
        // ID del documento de recordatorio de hoy
        const reminderDocId = `${employeeId}_${dateString}`;
        const reminderRef = doc(db, 'attendanceReminders', reminderDocId);

        // Verificar si ya se registró asistencia hoy
        const attendanceQuery = query(
          collection(db, 'asistencias'),
          where('empleadoId', '==', employeeId),
          where('fecha', '>=', Timestamp.fromDate(new Date(today.setHours(0,0,0,0)))),
          where('fecha', '<', Timestamp.fromDate(new Date(today.setHours(23,59,59,59))))
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);

        // Verificar si ya se envió un recordatorio o se silenció hoy
        const reminderDoc = await getDoc(reminderRef);

        if (attendanceSnapshot.empty && !reminderDoc.exists()) {
          console.log(`  -> El empleado ${employeeName} necesita recordatorio.`);
          
          // Obtener la suscripción del empleado
          const subRef = doc(db, 'pushSubscriptions', employeeId);
          const subSnapshot = await getDoc(subRef);

          if (subSnapshot.exists()) {
            const subscription = subSnapshot.data().subscription;
            const payload = {
              title: 'Recordatorio de Asistencia',
              body: '¡Hola! Aún no has registrado tu asistencia. Por favor, haz clic aquí.',
              icon: '/erick-go-logo.png',
              data: { url: '/login' },
              actions: [
                { action: 'register_attendance', title: 'Registrar Asistencia' },
                { action: 'going_on_my_own', title: 'Irme por mi cuenta' },
                { action: 'free', title: 'Estoy libre' }
              ]
            };

            try {
              await webpush.sendNotification(subscription, JSON.stringify(payload));
              console.log(`  -> Recordatorio enviado a ${employeeName}.`);

              // Marcar que se envió un recordatorio para no enviar de nuevo esta hora
              await setDoc(reminderRef, { status: 'reminder_sent', sentAt: new Date() });

            } catch (error) {
              console.error(`  -> Error al enviar notificación a ${employeeName}:`, error);
            }
          } else {
            console.log(`  -> El empleado ${employeeName} no tiene suscripción de push.`);
          }
        } else {
          console.log(`  -> El empleado ${employeeName} ya registró asistencia o fue silenciado.`);
        }
      }
    } catch (error) {
      console.error(`Error procesando la empresa ${companyName}:`, error);
    }
  }

  console.log('\nProceso de recordatorios finalizado.');
  return { statusCode: 200, body: 'Reminder process completed.' };
};