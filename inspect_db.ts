import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    projectId: "revitup-c8a66"
  });
}

// Pass the specific database ID to getFirestore
const db = getFirestore();

async function run() {
  const firestoreDb = (db as any).databaseId ? db : getFirestore("ai-studio-94b91240-6a0e-4947-9a3e-944940cdc81d");

  console.log("=== USERS IN DB ===");
  const usersSnap = await firestoreDb.collection('users').get();
  console.log(`Total users: ${usersSnap.size}`);
  usersSnap.forEach((doc: any) => {
    console.log(`ID: ${doc.id} | Username: ${doc.data().username} | Followers: ${doc.data().followersCount} | Following: ${doc.data().followingCount}`);
  });

  console.log("\n=== FOLLOWS IN DB ===");
  const followsSnap = await firestoreDb.collection('follows').get();
  console.log(`Total follows: ${followsSnap.size}`);
  followsSnap.forEach((doc: any) => {
    console.log(`ID: ${doc.id} | FollowerId: ${doc.data().followerId} | FollowingId: ${doc.data().followingId}`);
  });
}

run().catch(console.error);
