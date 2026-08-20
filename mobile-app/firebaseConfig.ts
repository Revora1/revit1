import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache, getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyA86P77_HGZldA0OnEWpgLtdp-wtHCBkf0",
  authDomain: "revitup.today",
  projectId: "revitup-c8a66",
  storageBucket: "revitup-c8a66.firebasestorage.app",
  messagingSenderId: "848807710523",
  appId: "1:848807710523:web:d89df1cec6f9e38d57b11e"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: memoryLocalCache()
  }, "ai-studio-94b91240-6a0e-4947-9a3e-944940cdc81d");
} catch {
  dbInstance = getFirestore(app, "ai-studio-94b91240-6a0e-4947-9a3e-944940cdc81d");
}
export const db = dbInstance;

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch {
  authInstance = getAuth(app);
}
export const auth = authInstance;

export const storage = getStorage(app);

