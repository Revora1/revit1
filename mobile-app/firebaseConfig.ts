import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA86P77_HGZldA0OnEWpgLtdp-wtHCBkf0",
  authDomain: "revitup.today",
  projectId: "revitup-c8a66",
  storageBucket: "revitup-c8a66.firebasestorage.app",
  messagingSenderId: "848807710523",
  appId: "1:848807710523:web:d89df1cec6f9e38d57b11e"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true
}, "ai-studio-94b91240-6a0e-4947-9a3e-944940cdc81d");
export const auth = getAuth(app);
export const storage = getStorage(app);
