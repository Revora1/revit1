const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/ProfileScreen.tsx', 'utf8');

// 1. Add activeTab "duo"
code = code.replace(/const \[activeTab, setActiveTab\] = useState<"garage" \| "posts">/, 'const [activeTab, setActiveTab] = useState<"garage" | "posts" | "duo">');

// 2. Add partnerProfile state
code = code.replace(/const \[garage, setGarage\] = useState<any\[\]>\(\[\]\);/, 'const [garage, setGarage] = useState<any[]>([]);\n  const [partnerProfile, setPartnerProfile] = useState<any>(null);');

// 3. Fetch partner profile if profileData.partnerId exists
code = code.replace(/if \(docSnap.exists\(\)\) \{\n          profileData = docSnap.data\(\);\n          setProfile\(profileData\);\n        \}/, `if (docSnap.exists()) {
          profileData = docSnap.data();
          setProfile(profileData);
          if (profileData.partnerId) {
            const partnerRef = doc(db, "users", profileData.partnerId);
            const partnerSnap = await getDoc(partnerRef);
            if (partnerSnap.exists()) {
               setPartnerProfile({ id: partnerSnap.id, ...partnerSnap.data() });
            }
          }
        }`);

fs.writeFileSync('mobile-app/screens/ProfileScreen.tsx', code);
