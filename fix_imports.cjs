const fs = require('fs');

// Fix ActivitiesScreen
let actCode = fs.readFileSync('mobile-app/screens/ActivitiesScreen.tsx', 'utf8');
if (!actCode.includes("writeBatch")) {
    actCode = actCode.replace(/import \{\n  collection,\n  query,\n  orderBy,\n  getDocs,\n  where,\n  doc,\n  updateDoc,\n  arrayUnion,\n  arrayRemove,\n  increment,\n  getDoc,\n  addDoc,\n  serverTimestamp,\n\} from "firebase\/firestore";/, 'import { collection, query, orderBy, getDocs, where, doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc, addDoc, serverTimestamp, writeBatch } from "firebase/firestore";');
}
fs.writeFileSync('mobile-app/screens/ActivitiesScreen.tsx', actCode);

// Fix DiscoverScreen
let discCode = fs.readFileSync('mobile-app/screens/DiscoverScreen.tsx', 'utf8');
if (!discCode.includes("import { db }")) {
    discCode = "import { db } from '../firebaseConfig';\nimport { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';\n" + discCode;
}
fs.writeFileSync('mobile-app/screens/DiscoverScreen.tsx', discCode);

// Fix ProfileScreen
let profCode = fs.readFileSync('mobile-app/screens/ProfileScreen.tsx', 'utf8');
if (!profCode.includes("TextInput")) {
    profCode = profCode.replace(/import \{.*?\} from "react-native";/s, (match) => {
       return match.replace("}", ", TextInput }");
    });
}
fs.writeFileSync('mobile-app/screens/ProfileScreen.tsx', profCode);

