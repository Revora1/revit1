const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/ProfileScreen.tsx', 'utf8');

if (!code.includes("import AsyncStorage")) {
  code = code.replace('import { Ionicons } from "@expo/vector-icons";', "import { Ionicons } from '@expo/vector-icons';\nimport AsyncStorage from '@react-native-async-storage/async-storage';");
}
if (!code.includes("TextInput")) {
  code = code.replace('import {', "import { TextInput,");
}

code = code.split('==", uid)').join('==", targetUserId)');

code = code.split('styles.postsGrid').join('styles.postGrid');
code = code.split('styles.postThumbnailImage').join('styles.postImage');
code = code.split('styles.postThumbnail').join('styles.postItem');

fs.writeFileSync('mobile-app/screens/ProfileScreen.tsx', code);

// Fix DiscoverScreen issues
let discoverCode = fs.readFileSync('mobile-app/screens/DiscoverScreen.tsx', 'utf8');
if (!discoverCode.includes("import { collection")) {
   discoverCode = discoverCode.replace("import { db } from '../firebaseConfig';", "import { db } from '../firebaseConfig';\nimport { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';");
}
fs.writeFileSync('mobile-app/screens/DiscoverScreen.tsx', discoverCode);
