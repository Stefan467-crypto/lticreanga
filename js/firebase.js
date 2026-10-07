import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
export const firebaseConfig = {
  apiKey: "AIzaSyDpwehFUAiMew5bzsD-6vzhAX249sU2fh8",
  authDomain: "ltic-1cbec.firebaseapp.com",
  projectId: "ltic-1cbec",
  storageBucket: "ltic-1cbec.firebasestorage.app",
  messagingSenderId: "588253538861",
  appId: "1:588253538861:web:f4dedfa047708c55b0a6a4"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app), db = getFirestore(app);
