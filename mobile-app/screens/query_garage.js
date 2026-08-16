import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const app = initializeApp({ projectId: "revitup-c8a66" });
const db = getFirestore(app, 'ai-studio-94b91240-6a0e-4947-9a3e-944940cdc81d');

async function run() {
  const userRecord = await getAuth(app).getUserByEmail('tonyang11552883@gmail.com');
  console.log("UID:", userRecord.uid);
  process.exit(0);
}
run();
