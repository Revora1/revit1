const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: 'revitup-c8a66' });
const db = getFirestore();

async function run() {
  try {
    const snap = await db.collection('posts').get();
    console.log("Total posts in DB:", snap.size);
    snap.docs.forEach(d => console.log("- Post ID:", d.id, "Author ID:", d.data().authorId));
  } catch (e) {
    console.error("Error reading posts via admin SDK:", e.message);
  }
}
run();
