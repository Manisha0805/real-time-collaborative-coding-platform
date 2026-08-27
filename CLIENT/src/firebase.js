import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAFM9B0XSbZ9b10sioQcReqWLIDEXcPQv0",
  authDomain: "codesync-20853.firebaseapp.com",
  projectId: "codesync-20853",
  storageBucket: "codesync-20853.firebasestorage.app",
  messagingSenderId: "764514387728",
  appId: "1:764514387728:web:ce56f189f5b781882cc795",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);