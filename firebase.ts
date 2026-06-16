import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBY8cTLnqg58ciXccwTk3qJx0kB1Os40Dk",
  authDomain: "circle-of-hope-academy.firebaseapp.com",
  projectId: "circle-of-hope-academy",
  storageBucket: "circle-of-hope-academy.firebasestorage.app",
  messagingSenderId: "80960093872",
  appId: "1:80960093872:web:7ace3a1536ddf6e5ab0575"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;