const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/FeedScreen.tsx', 'utf8');

if (!code.includes("where,")) {
  code = code.replace(/import { collection,/, "import { collection, where,");
}
fs.writeFileSync('mobile-app/screens/FeedScreen.tsx', code);
