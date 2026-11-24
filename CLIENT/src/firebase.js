import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Configured through VITE_FIREBASE_* variables (see CLIENT/.env.example) so development and
// production can use different Firebase projects. If they are missing, `auth` is null and the
// "Continue with Google" buttons show a clear message instead of crashing the app.
const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

if (!configured) {
  console.warn("Firebase is not configured (VITE_FIREBASE_* missing): Google sign-in is disabled.");
}

export const auth = configured ? getAuth(initializeApp(firebaseConfig)) : null;
