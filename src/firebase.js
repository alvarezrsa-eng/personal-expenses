import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAsR89CjajlSSvjta15K9caIPkHPsXRxng",
  authDomain: "personal-expenses-e52f0.firebaseapp.com",
  projectId: "personal-expenses-e52f0",
  storageBucket: "personal-expenses-e52f0.firebasestorage.app",
  messagingSenderId: "687612799973",
  appId: "1:687612799973:web:a53260c5757d371751dd0c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);