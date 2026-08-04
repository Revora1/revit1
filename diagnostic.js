import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("=== Firebase Diagnostic ===");
  console.log("Project ID:", firebaseConfig.projectId);
  console.log("Auth Domain:", firebaseConfig.authDomain);
  
  try {
    console.log("\nTesting unauthenticated read access to 'users' collection...");
    await getDocs(collection(db, "users"));
    console.log("Unauthenticated read success!");
  } catch (e) {
    console.error("Unauthenticated read failed:", e.message);
  }

  try {
    console.log("\nTesting unauthenticated read access to 'posts' collection...");
    await getDocs(collection(db, "posts"));
    console.log("Unauthenticated read success!");
  } catch (e) {
    console.error("Unauthenticated read failed:", e.message);
  }

  console.log("\nDiagnostic complete.");
  process.exit(0);
}

run();
