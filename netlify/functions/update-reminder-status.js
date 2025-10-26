// netlify/functions/update-reminder-status.js

exports.handler = async function (event, context) {
  // Solo permitimos solicitudes POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Parseamos el cuerpo de la solicitud para obtener el estado
    const { subscriptionId, status } = JSON.parse(event.body);

    if (!subscriptionId || !status) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan el subscriptionId o el status' }),
      };
    }

    // --- IMPORTANTE ---
    // En una aplicación real, aquí usarías el 'subscriptionId' para encontrar
    // al usuario en tu base de datos y actualizar su preferencia de recordatorios.
    // Por ejemplo, establecer un flag 'remindersEnabled = false' para ese usuario.
    console.log(`Solicitud para actualizar el estado del recordatorio para la suscripción ${subscriptionId} a: ${status}`);

    // await database.updateReminderStatus(subscriptionId, status); // Ejemplo de cómo sería

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Estado del recordatorio actualizado con éxito' }),
    };
  } catch (error) {
    console.error('Error al actualizar el estado del recordatorio:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};