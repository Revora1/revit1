const fs = require('fs');
let code = fs.readFileSync('src/components/Profile.tsx', 'utf8');

const effectBlock = `  useEffect(() => {
    if (!effectiveUserId || effectiveUserId === 'not_found') return;
    const fetchCounts = async () => {
        try {
           const followersQ = query(collection(db, 'follows'), where('followingId', '==', effectiveUserId));
           const followingQ = query(collection(db, 'follows'), where('followerId', '==', effectiveUserId));
           const [followersSnap, followingSnap] = await Promise.all([
               getCountFromServer(followersQ),
               getCountFromServer(followingQ)
           ]);
           
           const actualFollowers = followersSnap.data().count;
           const actualFollowing = followingSnap.data().count;
           
           setDynamicFollowersCount(actualFollowers);
           setDynamicFollowingCount(actualFollowing);
           
           // Self heal the counts in DB if needed (only if own profile to avoid spam)
           if (isOwnProfile && currentUser) {
             const myRef = doc(db, 'users', currentUser.uid);
             if (currentProfile?.followersCount !== actualFollowers || currentProfile?.followingCount !== actualFollowing) {
               await updateDoc(myRef, {
                 followersCount: actualFollowers,
                 followingCount: actualFollowing
               });
             }
           }
        } catch (e) {
           console.error("Error fetching dynamic counts", e);
        }
    };
    fetchCounts();
  }, [effectiveUserId, isFollowing, isFollower, isOwnProfile, currentProfile?.followersCount, currentProfile?.followingCount, currentUser]);`;

// Remove the effect from where it was
code = code.replace(effectBlock, '');

// Insert it right after the declaration of ownerStats and its effect, or just after effectiveUserId
const insertionPoint = `  const isOwner = isOwnProfile && currentUser?.email?.toLowerCase() === 'tonyang11552883@gmail.com';`;
code = code.replace(insertionPoint, insertionPoint + '\n' + effectBlock);

fs.writeFileSync('src/components/Profile.tsx', code);
