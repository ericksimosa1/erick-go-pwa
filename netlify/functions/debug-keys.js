// netlify/functions/debug-keys.js

exports.handler = async function (event, context) {
  console.log('--- DEPURACIÓN DE CLAVES EN NETLIFY ---');
  console.log('CLAVE PÚBLICA:', process.env.VAPID_PUBLIC_KEY);
  console.log('CLAVE PRIVADA:', process.env.VAPID_PRIVATE_KEY ? 'CONFIGURADA' : 'NO CONFIGURADA');
  console.log('----------------------------------------');

  return {
    statusCode: 200,
    body: JSON.stringify({
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKeyStatus: process.env.VAPID_PRIVATE_KEY ? 'Configurada' : 'No configurada'
    }),
  };
};