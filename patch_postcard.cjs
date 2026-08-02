const fs = require('fs');

let fileCode = fs.readFileSync('src/components/PostCard.tsx', 'utf8');

const pushLogicFollowProfile = `
        const notifId = \`\${Date.now()}_\${currentUser.uid}_follow_\${profile.uid}\`;
        await setDoc(doc(db, 'notifications', notifId), {
          userId: profile.uid,
          actorId: currentUser.uid,
          type: 'follow',
          read: false,
          createdAt: Date.now()
        });
        
        // Push notification
        try {
          const targetUserSnap = await getDoc(targetRef);
          if (targetUserSnap.exists()) {
            const token = targetUserSnap.data().fcmToken;
            if (token) {
              await fetch('/api/send-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  title: 'New Follower',
                  body: \`\${currentUser.displayName || currentUser.email?.split('@')[0] || 'Someone'} started following you.\`
                })
              });
            }
          }
        } catch (pushErr) {
          console.error("Failed to send push:", pushErr);
        }
`;

fileCode = fileCode.replace(
  `        const notifId = \`\${Date.now()}_\${currentUser.uid}_follow_\${profile.uid}\`;
        await setDoc(doc(db, 'notifications', notifId), {
          userId: profile.uid,
          actorId: currentUser.uid,
          type: 'follow',
          read: false,
          createdAt: Date.now()
        });`,
  pushLogicFollowProfile
);

const pushLogicLike = `
          const notifId = \`\${Date.now()}_\${user.uid}_like_\${post.id}\`;
          await setDoc(doc(db, 'notifications', notifId), {
            userId: post.authorId,
            actorId: user.uid,
            type: 'like',
            postId: post.id,
            read: false,
            createdAt: Date.now()
          });
          
          // Push notification
          try {
            const targetUserSnap = await getDoc(doc(db, 'users', post.authorId));
            if (targetUserSnap.exists()) {
              const token = targetUserSnap.data().fcmToken;
              if (token) {
                await fetch('/api/send-push', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token,
                    title: 'New Like',
                    body: \`\${user.displayName || user.email?.split('@')[0] || 'Someone'} liked your post.\`
                  })
                });
              }
            }
          } catch (pushErr) {
            console.error("Failed to send push:", pushErr);
          }
`;

fileCode = fileCode.replace(
  `          const notifId = \`\${Date.now()}_\${user.uid}_like_\${post.id}\`;
          await setDoc(doc(db, 'notifications', notifId), {
            userId: post.authorId,
            actorId: user.uid,
            type: 'like',
            postId: post.id,
            read: false,
            createdAt: Date.now()
          });`,
  pushLogicLike
);

const pushLogicFollowAuthor = `
        const notifId = \`\${Date.now()}_\${user.uid}_follow_\${post.authorId}\`;
        await setDoc(doc(db, 'notifications', notifId), {
          userId: post.authorId,
          actorId: user.uid,
          type: 'follow',
          read: false,
          createdAt: Date.now()
        });
        
        // Push notification
        try {
          const targetUserSnap = await getDoc(targetRef);
          if (targetUserSnap.exists()) {
            const token = targetUserSnap.data().fcmToken;
            if (token) {
              await fetch('/api/send-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  title: 'New Follower',
                  body: \`\${user.displayName || user.email?.split('@')[0] || 'Someone'} started following you.\`
                })
              });
            }
          }
        } catch (pushErr) {
          console.error("Failed to send push:", pushErr);
        }
`;

fileCode = fileCode.replace(
  `        const notifId = \`\${Date.now()}_\${user.uid}_follow_\${post.authorId}\`;
        await setDoc(doc(db, 'notifications', notifId), {
          userId: post.authorId,
          actorId: user.uid,
          type: 'follow',
          read: false,
          createdAt: Date.now()
        });`,
  pushLogicFollowAuthor
);

fs.writeFileSync('src/components/PostCard.tsx', fileCode);
