const fs = require('fs');
let code = fs.readFileSync('src/components/SearchView.tsx', 'utf8');

const searchUsersReplacement = `
    const searchUsers = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const qLower = query(
          usersRef,
          where('usernameLower', '>=', searchTerm.toLowerCase()),
          where('usernameLower', '<=', searchTerm.toLowerCase() + '\uf8ff'),
          limit(10)
        );
        const snap = await getDocs(qLower);
        let users = snap.docs.map(doc => doc.data() as UserProfile);

        if (users.length === 0) {
          const qNormal = query(
            usersRef,
            where('username', '>=', searchTerm),
            where('username', '<=', searchTerm + '\uf8ff'),
            limit(10)
          );
          const snapNormal = await getDocs(qNormal);
          users = snapNormal.docs.map(doc => doc.data() as UserProfile);
        }
        
        if (users.length === 0) {
          const capitalized = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
          const qCap = query(
            usersRef,
            where('username', '>=', capitalized),
            where('username', '<=', capitalized + '\uf8ff'),
            limit(10)
          );
          const snapCap = await getDocs(qCap);
          users = snapCap.docs.map(doc => doc.data() as UserProfile);
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
