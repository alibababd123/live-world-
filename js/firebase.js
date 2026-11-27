
// LiveWorld Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMlVuop0-OdJk03mQn7YSxIALJ__PWUHM",
  authDomain: "dollar-income-app.firebaseapp.com",
  projectId: "dollar-income-app",
  storageBucket: "dollar-income-app.firebasestorage.app",
  messagingSenderId: "1033973531784",
  appId: "1:1033973531784:web:f806f38d931c7a86d88b3d"
};

export const isFirebaseConfigured = true;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

