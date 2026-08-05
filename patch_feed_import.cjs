const fs = require('fs');
let code = fs.readFileSync('src/components/Feed.tsx', 'utf8');
code = code.replace(
  "import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';",
  "import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';"
);
fs.writeFileSync('src/components/Feed.tsx', code);
