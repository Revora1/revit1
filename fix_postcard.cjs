const fs = require('fs');

let fileCode = fs.readFileSync('src/components/PostCard.tsx', 'utf8');
fileCode = fileCode.replace(/targetUserSnap\.data\(\)\.fcmToken/g, '(targetUserSnap.data() as any).fcmToken');
fileCode = fileCode.replace(/await getDoc\(targetRef\)/g, "await getDoc(doc(db, 'users', post.authorId))");

// Actually, wait, in handleFollowClick (around line 115), it used targetRef which is for `profile.uid`. 
// So replacing all targetRef with post.authorId might break the first one. Let's fix that.
// First one: `const targetRef = doc(db, 'users', profile.uid);` is on line 86.
// Let's just restore `targetRef` where it's needed, or replace it carefully.

