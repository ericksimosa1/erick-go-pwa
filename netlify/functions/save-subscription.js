// netlify/functions/save-subscription.js

exports.handler = async function (event, context) {
  // Solo permitimos solicitudes POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Parseamos el cuerpo de la solicitud para obtener la suscripción
    const subscription = JSON.parse(event.body);

    // --- IMPORTANTE ---
    // Por ahora, solo vamos a imprimir la suscripción en la consola.
    // En una aplicación real, aquí guardarías esta información en una base de datos
    // (como FaunaDB, MongoDB, o una simple tabla de Netlify).
    console.log('Nueva suscripción recibida:', subscription);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Suscripción guardada con éxito' }),
    };
  } catch (error) {
    console.error('Error al guardar la suscripción:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};