const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');
code = code.replace(/}, firebaseConfig\.firestoreDatabaseId\);/, '});');
fs.writeFileSync('src/lib/firebase.ts', code);
