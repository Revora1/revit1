import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    // We cannot easily test this without a known username/password for a real user,
    // but we can try to sign in with a dummy credential to see if it gives auth/user-not-found
    await signInWithEmailAndPassword(auth, "tonyang11552883@gmail.com", "password123");
    const snap = await getDocs(collection(db, "posts"));
    console.log("Success! Found posts:", snap.size);
  } catch (e) {
    console.log("Error:", e.code, e.message);
  }
  process.exit(0);
}
run();
