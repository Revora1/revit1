const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  projectId: "revitup-c8a66"
});

const db = getFirestore("ai-studio-revit1-94b91240-6a0e-4947-9a3e-944940cdc81d");

async function run() {
  try {
    const sAll = await db.collection('users').get();
    console.log("Total users in AI studio database:", sAll.size);
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
