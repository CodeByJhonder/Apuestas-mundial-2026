/* ==========================================================================
   CONFIGURACIÓN DE FIREBASE
   ==========================================================================
   1. Ve a https://console.firebase.google.com
   2. Crea un proyecto nuevo (gratis)
   3. Dentro del proyecto: "Compilación" > "Firestore Database" > "Crear base
      de datos" (elige modo de prueba para empezar)
   4. Ve a "Configuración del proyecto" (ícono de engrane) > "Tus apps" >
      ícono "</>" (Web) > registra la app
   5. Copia el objeto firebaseConfig que te da Firebase y pégalo abajo,
      reemplazando todo este objeto de ejemplo.
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyC8MMdSZLUZpLjAmihpKKsSJtPjM1902eI",
  authDomain: "quinielamny.firebaseapp.com",
  projectId: "quinielamny",
  storageBucket: "quinielamny.firebasestorage.app",
  messagingSenderId: "1053481329657",
  appId: "1:1053481329657:web:08a825efa829002a9c5328"
};
 
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
 
/* Nombre de la contraseña de administrador.
   CÁMBIALA antes de subir el proyecto a GitHub. */
const ADMIN_PASSWORD = "ya-no-se-usa-esta-clave";
 