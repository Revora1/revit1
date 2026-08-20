const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/FeedScreen.tsx', 'utf8');

if (!code.includes("ScrollView")) {
  code = code.replace(/import {/, "import { ScrollView,");
}
fs.writeFileSync('mobile-app/screens/FeedScreen.tsx', code);
