const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
`import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (err) {
    console.error("Firebase Admin initialization error:", err);
  }
}`,
`import { initializeApp, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  try {
    initializeApp();
  } catch (err) {
    console.error("Firebase Admin initialization error:", err);
  }
}`
);

code = code.replace(/admin\.messaging\(\)\.send/g, 'getMessaging().send');

fs.writeFileSync('server.ts', code);
