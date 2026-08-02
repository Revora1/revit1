const fs = require('fs');

let fileCode = fs.readFileSync('src/components/CommentsSheet.tsx', 'utf8');

const pushLogicComment = `
           const notifId = \`\${Date.now()}_\${user.uid}_comment_\${postId}\`;
           await setDoc(doc(db, 'notifications', notifId), {
             userId: postAuthorId,
             actorId: user.uid,
             type: 'comment',
             postId: postId,
             read: false,
             createdAt: Date.now()
           });
           
           try {
             const targetUserSnap = await getDoc(doc(db, 'users', postAuthorId));
             if (targetUserSnap.exists()) {
               const token = targetUserSnap.data().fcmToken;
               if (token) {
                 await fetch('/api/send-push', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     token,
                     title: 'New Comment',
                     body: \`\${user.displayName || user.email?.split('@')[0] || 'Someone'} commented on your post.\`
                   })
                 });
               }
             }
           } catch (pushErr) {
             console.error("Failed to send push:", pushErr);
           }
`;

fileCode = fileCode.replace(
  `           const notifId = \`\${Date.now()}_\${user.uid}_comment_\${postId}\`;
           await setDoc(doc(db, 'notifications', notifId), {
             userId: postAuthorId,
             actorId: user.uid,
             type: 'comment',
             postId: postId,
             read: false,
             createdAt: Date.now()
           });`,
  pushLogicComment
);

const pushLogicTag = `
                const tagNotifId = \`\${Date.now()}_\${user.uid}_tag_\${targetUserId}_\${postId}\`;
                await setDoc(doc(db, 'notifications', tagNotifId), {
                  userId: targetUserId,
                  actorId: user.uid,
                  type: 'tag',
                  postId: postId,
                  message: 'tagged you in a comment',
                  read: false,
                  createdAt: Date.now()
                });
                
                try {
                  const targetUserSnap = await getDoc(doc(db, 'users', targetUserId));
                  if (targetUserSnap.exists()) {
                    const token = targetUserSnap.data().fcmToken;
                    if (token) {
                      await fetch('/api/send-push', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          token,
                          title: 'You were tagged',
                          body: \`\${user.displayName || user.email?.split('@')[0] || 'Someone'} tagged you in a comment.\`
                        })
                      });
                    }
                  }
                } catch (pushErr) {
                  console.error("Failed to send push:", pushErr);
                }
`;

fileCode = fileCode.replace(
  `                const tagNotifId = \`\${Date.now()}_\${user.uid}_tag_\${targetUserId}_\${postId}\`;
                await setDoc(doc(db, 'notifications', tagNotifId), {
                  userId: targetUserId,
                  actorId: user.uid,
                  type: 'tag',
                  postId: postId,
                  message: 'tagged you in a comment',
                  read: false,
                  createdAt: Date.now()
                });`,
  pushLogicTag
);

fs.writeFileSync('src/components/CommentsSheet.tsx', fileCode);
