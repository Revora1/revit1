const fs = require('fs');
let code = fs.readFileSync('src/components/SearchView.tsx', 'utf8');

const searchUsersReplacement = `
    const searchUsers = async () => {
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
        
        // --- DEBUG FALLBACK ---
        // If we still found nothing, just grab the first 10 users in the whole database
        // and show them so we can see what the data actually looks like!
        if (users.length === 0) {
            const qAll = query(usersRef, limit(10));
            const snapAll = await getDocs(qAll);
            users = snapAll.docs.map(doc => {
               const data = doc.data();
               return {
                 uid: data.uid || doc.id,
                 username: (data.username || 'NO_USERNAME_FIELD') + ' (Debug)',
                 displayName: 'Found in DB: ' + JSON.stringify(data).substring(0, 50),
                 avatarUrl: data.avatarUrl || '',
                 bio: data.bio || '',
                 followersCount: data.followersCount || 0,
                 followingCount: data.followingCount || 0,
                 createdAt: data.createdAt || 0
               } as any;
            });
        }

        setResults(users.filter(u => !blockedUserIds.includes(u.uid)));
      } catch (error) {
        console.error("Error searching users:", error);
        setResults([{ uid: 'error', username: String(error), displayName: 'Error Fetching Users', avatarUrl: '', bio: '', followersCount: 0, followingCount: 0, createdAt: 0 } as any]);
      } finally {
        setLoading(false);
      }
    };
`;

code = code.replace(/const searchUsers = async \(\) => \{[\s\S]*?setLoading\(false\);\n      \}\n    \};/, searchUsersReplacement.trim());
fs.writeFileSync('src/components/SearchView.tsx', code);
