import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
console.log("App initialized.");

try {
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, config.firestoreDatabaseId);
  console.log("DB created", !!db);
  collection(db, 'test');
  console.log("Collection created successfully.");
} catch (e) {
  console.error("Error creating collection:", e);
}
