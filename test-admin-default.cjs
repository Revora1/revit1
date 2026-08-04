const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  projectId: "revitup-c8a66"
});

const db = getFirestore();

async function run() {
  try {
    const sAll = await db.collection('users').get();
    console.log("Total users in (default) database:", sAll.size);
    sAll.forEach(d => {
       const data = d.data();
       if (data.username && data.username.toLowerCase().includes('cin')) {
           console.log("Found:", data.username);
       }
    });
  } catch (e) {
    console.log("Error:", e.message);
  }
  process.exit(0);
}
run();
