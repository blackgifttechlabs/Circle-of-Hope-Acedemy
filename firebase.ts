import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDniprsEFTRh-9SZLNh6waUd8USD84JR0M",
  authDomain: "coha-bdb7e.firebaseapp.com",
  projectId: "coha-bdb7e",
  storageBucket: "coha-bdb7e.firebasestorage.app",
  messagingSenderId: "992458437051",
  appId: "1:992458437051:web:7b99461b9e017cf31cd49e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;