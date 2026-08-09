import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, config.firestoreDatabaseId);
  
  // Try calling it again to force error
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, config.firestoreDatabaseId);
} catch (e) {
  console.error("Caught error:", e.message);
  dbInstance = getFirestore(app, config.firestoreDatabaseId);
}
console.log("DB Instance exists:", !!dbInstance);
