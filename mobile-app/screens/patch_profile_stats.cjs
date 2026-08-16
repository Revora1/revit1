const fs = require('fs');
const file = '/app/applet/mobile-app/screens/ProfileScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add states for image modal and follows modal
if (!code.includes('selectedImage')) {
  code = code.replace(
    'const [dynamicFollowingCount, setDynamicFollowingCount] = useState<',
    `const [selectedImage, setSelectedImage] = useState<string | null>(null);\n  const [showFollowsModal, setShowFollowsModal] = useState<'followers' | 'following' | null>(null);\n  const [followsList, setFollowsList] = useState<any[]>([]);\n  const [loadingFollows, setLoadingFollows] = useState(false);\n  const [dynamicFollowingCount, setDynamicFollowingCount] = useState<`
  );
}

// 2. Add handleOpenFollows function
if (!code.includes('handleOpenFollows')) {
  const func = `
  const handleOpenFollows = async (type: 'followers' | 'following') => {
    setShowFollowsModal(type);
    setLoadingFollows(true);
    try {
      const field = type === 'followers' ? 'followingId' : 'followerId';
      const otherField = type === 'followers' ? 'followerId' : 'followingId';
      const q = query(collection(db, 'follows'), where(field, '==', targetUserId));
      const snap = await getDocs(q);
      
      const userIds = snap.docs.map(doc => doc.data()[otherField]);
      if (userIds.length > 0) {
        const usersData = [];
        for (const id of userIds) {
           const uDoc = await getDoc(doc(db, 'users', id));
           if (uDoc.exists()) usersData.push({ id: uDoc.id, ...uDoc.data() });
        }
        setFollowsList(usersData);
      } else {
        setFollowsList([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFollows(false);
    }
  };
  `;
  code = code.replace('const handleSignOut = async () => {', func + '\n  const handleSignOut = async () => {');
}

fs.writeFileSync(file, code);
console.log('Stats patched');
