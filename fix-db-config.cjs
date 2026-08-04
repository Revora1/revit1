const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

// replace the initializeApp line with one that deletes the databaseId
code = code.replace(
  'const app = initializeApp(firebaseConfig);',
  '// Remove the studio databaseId so we hit the default db!\nconst cfg = { ...firebaseConfig };\ndelete cfg.firestoreDatabaseId;\nconst app = initializeApp(cfg);'
);

fs.writeFileSync('src/lib/firebase.ts', code);
