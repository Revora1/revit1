const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: 'revitup-c8a66' });
const db = getFirestore();

async function run() {
  try {
    const snap = await db.collection('posts').limit(5).get();
    console.log(`Found ${snap.size} posts`);
    snap.forEach(doc => {
      console.log(doc.id, doc.data().authorId);
    });
  } catch(e) { console.error(e.message); }
  process.exit();
}
run();
