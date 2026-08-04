import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const q1 = query(collection(db, 'users'), limit(5));
    const s1 = await getDocs(q1);
    console.log("Users fetched:", s1.docs.length);
    s1.docs.forEach(d => console.log(d.data().username));
  } catch (e) {
    console.log("Error:", e.message);
  }
  process.exit(0);
}
run();
