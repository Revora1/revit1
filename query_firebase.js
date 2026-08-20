import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA86P77_HGZldA0OnEWpgLtdp-wtHCBkf0",
  authDomain: "revitup.today",
  projectId: "revitup-c8a66",
  storageBucket: "revitup-c8a66.firebasestorage.app",
  messagingSenderId: "848807710523",
  appId: "1:848807710523:web:d89df1cec6f9e38d57b11e"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, "ai-studio-94b91240-6a0e-4947-9a3e-944940cdc81d");
const auth = getAuth(app);

async function run() {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", "tonyang11552883@gmail.com"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("No user found with that email");
      return;
    }
    
    snapshot.forEach(d => {
      console.log("User doc ID:", d.id);
      console.log("User data:", d.data());
    });
  } catch(e) {
    console.error(e);
  }
}

run();
