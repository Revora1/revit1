const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
  '// Remove the studio databaseId so we hit the default db!\nconst cfg = { ...firebaseConfig };\ndelete (cfg as any).firestoreDatabaseId;\nconst app = initializeApp(cfg);',
  'const app = initializeApp(firebaseConfig);'
);

fs.writeFileSync('src/lib/firebase.ts', code);
