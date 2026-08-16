const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/ProfileScreen.tsx', 'utf8');

code = code.replace(/const pSnap = await getDocs\(pQuery\);\n        setPosts\(pSnap\.docs\.map\(\(doc\) => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}\)\)\);/, `const pSnap = await getDocs(pQuery);
        setPosts(pSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        
        // Fetch partner garage and posts
        if (profileData && profileData.partnerId) {
          const pgQuery = query(
            collection(db, "garage"),
            where("ownerId", "==", profileData.partnerId),
            orderBy("createdAt", "desc")
          );
          const pgSnap = await getDocs(pgQuery);
          setPartnerGarage(pgSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          
          const ppQuery = query(
            collection(db, "posts"),
            where("authorId", "==", profileData.partnerId),
            orderBy("createdAt", "desc")
          );
          const ppSnap = await getDocs(ppQuery);
          setPartnerPosts(ppSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }`);

code = code.replace(/const \[partnerProfile, setPartnerProfile\] = useState<any>\(null\);/, `const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [partnerGarage, setPartnerGarage] = useState<any[]>([]);
  const [partnerPosts, setPartnerPosts] = useState<any[]>([]);`);

fs.writeFileSync('mobile-app/screens/ProfileScreen.tsx', code);
