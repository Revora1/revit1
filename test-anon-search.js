import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    console.log("Signing in anonymously...");
    await signInAnonymously(auth);
    console.log("Signed in.");
    
    const usersRef = collection(db, "users");
    const q1 = query(usersRef, where("username", ">=", "cin"), where("username", "<=", "cin\uf8ff"));
    const snap1 = await getDocs(q1);
    console.log("Results for username >= cin:");
    snap1.docs.forEach(d => console.log(d.id, d.data().username, d.data().usernameLower));
    
    const q2 = query(usersRef, where("usernameLower", ">=", "cin"), where("usernameLower", "<=", "cin\uf8ff"));
    const snap2 = await getDocs(q2);
    console.log("Results for usernameLower >= cin:");
    snap2.docs.forEach(d => console.log(d.id, d.data().username, d.data().usernameLower));
    
  } catch (e) {
    console.log("Error:", e.message);
  }
  process.exit(0);
}
run();
