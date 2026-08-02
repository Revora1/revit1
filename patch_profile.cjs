const fs = require('fs');

let profileCode = fs.readFileSync('src/components/Profile.tsx', 'utf8');

const pushLogic = `
        const notifId = \`\${Date.now()}_\${currentUser.uid}_follow_\${effectiveUserId}\`;
        await setDoc(doc(db, 'notifications', notifId), {
          userId: effectiveUserId,
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
                  body: \`\${currentProfile?.username || 'Someone'} started following you.\`
                })
              });
            }
          }
        } catch (pushErr) {
          console.error("Failed to send push:", pushErr);
        }
`;

profileCode = profileCode.replace(
  `        const notifId = \`\${Date.now()}_\${currentUser.uid}_follow_\${effectiveUserId}\`;
        await setDoc(doc(db, 'notifications', notifId), {
          userId: effectiveUserId,
          actorId: currentUser.uid,
          type: 'follow',
          read: false,
          createdAt: Date.now()
        });`,
  pushLogic
);

fs.writeFileSync('src/components/Profile.tsx', profileCode);
