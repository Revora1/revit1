const fs = require('fs');

// Fix ActivitiesScreen
let actCode = fs.readFileSync('mobile-app/screens/ActivitiesScreen.tsx', 'utf8');
actCode = "import { writeBatch } from 'firebase/firestore';\n" + actCode;
fs.writeFileSync('mobile-app/screens/ActivitiesScreen.tsx', actCode);

// Fix ProfileScreen
let profCode = fs.readFileSync('mobile-app/screens/ProfileScreen.tsx', 'utf8');
profCode = "import { TextInput } from 'react-native';\n" + profCode;
fs.writeFileSync('mobile-app/screens/ProfileScreen.tsx', profCode);

