const fs = require('fs');
let code = fs.readFileSync('src/components/SearchView.tsx', 'utf8');

const searchUsersReplacement = `
    const searchUsers = async () => {
      setLoading(true);
      try {
        const cleanTerm = searchTerm.trim();
        if (!cleanTerm) {
          setResults([]);
          setLoading(false);
          return;
        }

        const usersRef = collection(db, 'users');
        const lowerTerm = cleanTerm.toLowerCase();
        
        // 1. Try usernameLower field (if it exists)
        const qLower = query(
          usersRef,
          where('usernameLower', '>=', lowerTerm),
          where('usernameLower', '<=', lowerTerm + '\uf8ff'),
          limit(10)
        );
        let snap = await getDocs(qLower);
        let users = snap.docs.map(doc => doc.data() as UserProfile);

        // 2. Try exact casing they typed against 'username'
        if (users.length === 0) {
          const qNormal = query(
            usersRef,
            where('username', '>=', cleanTerm),
            where('username', '<=', cleanTerm + '\uf8ff'),
            limit(10)
          );
          snap = await getDocs(qNormal);
          users = snap.docs.map(doc => doc.data() as UserProfile);
        }
        
        // 3. Try lowercase term against 'username' (helps if user typed "Cin" but db has "cinders29392" without usernameLower)
        if (users.length === 0) {
          const qNormalLower = query(
            usersRef,
            where('username', '>=', lowerTerm),
            where('username', '<=', lowerTerm + '\uf8ff'),
            limit(10)
          );
          snap = await getDocs(qNormalLower);
          users = snap.docs.map(doc => doc.data() as UserProfile);
        }

        // 4. Try capitalized term against 'username'
        if (users.length === 0) {
          const capitalized = cleanTerm.charAt(0).toUpperCase() + cleanTerm.slice(1);
          const qCap = query(
            usersRef,
            where('username', '>=', capitalized),
            where('username', '<=', capitalized + '\uf8ff'),
            limit(10)
          );
          snap = await getDocs(qCap);
          users = snap.docs.map(doc => doc.data() as UserProfile);
        }

        setResults(users.filter(u => !blockedUserIds.includes(u.uid)));
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setLoading(false);
      }
    };
`;

code = code.replace(/const searchUsers = async \(\) => \{[\s\S]*?setLoading\(false\);\n      \}\n    \};/, searchUsersReplacement.trim());
fs.writeFileSync('src/components/SearchView.tsx', code);
