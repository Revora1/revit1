const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const adminImport = `
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (err) {
    console.error("Firebase Admin initialization error:", err);
  }
}
`;

serverCode = serverCode.replace('const PORT = 3000;', 'const PORT = 3000;\n' + adminImport);

const pushEndpoint = `
app.use(express.json());

app.post('/api/send-push', async (req, res) => {
  try {
    const { token, title, body } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Missing token" });
    }

    const message = {
      notification: {
        title: title || 'New Notification',
        body: body || 'You have a new notification.'
      },
      token: token,
      android: {
        priority: 'high',
        notification: {
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default'
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, response });
  } catch (error) {
    console.error("Error sending push notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});
`;

serverCode = serverCode.replace('// REST API and Proxy routes first', '// REST API and Proxy routes first\n' + pushEndpoint);

fs.writeFileSync('server.ts', serverCode);
