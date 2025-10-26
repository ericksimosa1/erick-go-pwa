// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// PEGA AQUÍ TUS CREDENCIALES (el bloque firebaseConfig)
const firebaseConfig = {
  apiKey: "AIzaSyAu2b9DzdY8MPgyabIHLAb6d_6N70kWxY0",
  authDomain: "mi-app-de-transporte-301c7.firebaseapp.com",
  projectId: "mi-app-de-transporte-301c7",
  storageBucket: "mi-app-de-transporte-301c7.firebasestorage.app",
  messagingSenderId: "917714216243",
  appId: "1:917714216243:web:d4497bf10427c8d58a0a46"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios que usaremos
export const auth = getAuth(app);
export const db = getFirestore(app);