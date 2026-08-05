const fs = require('fs');
let code = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const targetStr = `              try {
                
                await setDoc(profileRef, newProfile);`;

const replacement = `              try {
                const refCode = sessionStorage.getItem('referralCode');
                if (refCode && refCode !== user.uid) {
                  // Increment referral count for the referrer in the active giveaway
                  try {
                    const giveawayId = 'community_milestone_1';
                    const ticketRef = doc(db, 'giveaways', giveawayId, 'tickets', refCode);
                    // Ensure document exists
                    const tSnap = await getDoc(ticketRef);
                    if (tSnap.exists()) {
                      await updateDoc(ticketRef, {
                        referralBonusCount: (tSnap.data().referralBonusCount || 0) + 1,
                        updatedAt: Date.now()
                      });
                    } else {
                      await setDoc(ticketRef, {
                        userId: refCode,
                        referralBonusCount: 1,
                        joinedAt: Date.now(),
                        updatedAt: Date.now()
                      });
                    }
                  } catch (refErr) {
                    console.error("Error processing referral code:", refErr);
                  }
                }
                
                await setDoc(profileRef, newProfile);`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/context/AuthContext.tsx', code);
