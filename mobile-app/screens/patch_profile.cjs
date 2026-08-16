const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/ProfileScreen.tsx', 'utf8');

if (!code.includes('const handleOpenFollows')) {
  const insertIndex = code.indexOf('const handleOpenEditProfile');
  const func = `  const handleOpenFollows = async (type: 'followers' | 'following') => {
    setShowFollowsModal(type);
    setLoadingFollows(true);
    try {
      const db = require('../firebaseConfig').db;
      const { collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');
      
      const q = type === 'followers'
        ? query(collection(db, "follows"), where("followingId", "==", userId))
        : query(collection(db, "follows"), where("followerId", "==", userId));
        
      const snapshot = await getDocs(q);
      const userIds = snapshot.docs.map(d => type === 'followers' ? d.data().followerId : d.data().followingId);
      
      const users = [];
      for (const id of userIds) {
        const uDoc = await getDoc(doc(db, "users", id));
        if (uDoc.exists()) {
          users.push({ id: uDoc.id, ...uDoc.data() });
        }
      }
      setFollowsList(users);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFollows(false);
    }
  };

`;
  code = code.substring(0, insertIndex) + func + code.substring(insertIndex);
  fs.writeFileSync('mobile-app/screens/ProfileScreen.tsx', code);
}
