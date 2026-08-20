const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = require('./firebase-applet-config.json');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'users'), where('email', '==', 'tonyang11552883@gmail.com'));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    console.log(doc.data().username);
  });
}
run().catch(console.error);
