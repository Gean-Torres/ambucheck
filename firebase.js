// Firebase initialization and exports
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

// Prefer using environment variables (Vite `import.meta.env`) in production.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCp_SzJGsN-xnmSb_o2ekdjyjnPVlcB4I4',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ambucheck-ffa94.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ambucheck-ffa94',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ambucheck-ffa94.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1062094255070',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1062094255070:web:e81868469ec5effe06a34f',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-NYFJNQXWC7'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export { app, auth, db };
