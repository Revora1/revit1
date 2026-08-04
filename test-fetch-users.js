import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const qAll = query(collection(db, 'users'), limit(100));
    const sAll = await getDocs(qAll);
    console.log("Total users in Firestore 'users' collection:", sAll.docs.length);
    sAll.docs.forEach(d => {
       const data = d.data();
       console.log("- UID:", d.id, "| Username:", data.username, "| Email:", data.email || 'N/A');
    });
  } catch (e) {
    console.log("Error:", e.message);
  }
  process.exit(0);
}
run();
