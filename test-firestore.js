import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

// Test DB with config as is
const app1 = initializeApp(firebaseConfig, "app1");
const db1 = getFirestore(app1);

// Test DB without firestoreDatabaseId
const config2 = { ...firebaseConfig };
delete config2.firestoreDatabaseId;
const app2 = initializeApp(config2, "app2");
const db2 = getFirestore(app2);

async function run() {
  try {
    const q1 = query(collection(db1, 'users'), limit(2));
    const s1 = await getDocs(q1);
    console.log("DB1 users count:", s1.docs.length);
  } catch (e) {
    console.log("DB1 error", e.message);
  }

  try {
    const q2 = query(collection(db2, 'users'), limit(2));
    const s2 = await getDocs(q2);
    console.log("DB2 users count:", s2.docs.length);
  } catch (e) {
    console.log("DB2 error", e.message);
  }
  process.exit(0);
}
run();
