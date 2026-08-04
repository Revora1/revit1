const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(/persistence: browserLocalPersistence/, 'persistence: browserLocalPersistence\n});');
code = code.replace(/console\.warn\("FCM is not supported in this environment:", err\);/, 'console.warn("FCM is not supported in this environment:", err);\n});');
code = code.replace(/serviceWorkerRegistration: registration/, 'serviceWorkerRegistration: registration\n    });');
code = code.replace(/fcmTokens: arrayUnion\(token\)/, 'fcmTokens: arrayUnion(token)\n      });');

fs.writeFileSync('src/lib/firebase.ts', code);
