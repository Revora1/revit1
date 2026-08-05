const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const oldFetch = `        // Let's get the user data for each ticket
        const userPromises = ticketsSnap.docs.map(async (docSnap) => {
           const userId = docSnap.id;
           // We need to check if they have a car and post
           // Actually the prompt says "users who have entered that specific giveaway"
           // Let's just fetch all tickets or do the full check? The prompt says "only the usernames of all users who have entered that specific giveaway."
           const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
           if (!userDoc.empty) {
              const userData = userDoc.docs[0].data();
              return { userId, username: userData.username, ...docSnap.data() };
           }
           return { userId, ...docSnap.data() };
        });
        const tickets = await Promise.all(userPromises);
        setGiveawayTickets(tickets);`;

const newFetch = `        // Filter users who actually entered (i.e., meet the requirements: have car and post)
        // Note: For a very large database, this would need cloud functions, but we do it client-side for now
        const userPromises = ticketsSnap.docs.map(async (docSnap) => {
           const userId = docSnap.id;
           
           // Check car
           const carQ = query(collection(db, 'garage'), where('ownerId', '==', userId), limit(1));
           const carSnap = await getDocs(carQ);
           if (carSnap.empty) return null; // not eligible
           
           // Check post
           const postQ = query(collection(db, 'posts'), where('authorId', '==', userId), limit(1));
           const postSnap = await getDocs(postQ);
           if (postSnap.empty) return null; // not eligible

           // Get username
           const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
           if (!userDoc.empty) {
              const userData = userDoc.docs[0].data();
              return { userId, username: userData.username, ...docSnap.data() };
           }
           return { userId, username: 'Unknown', ...docSnap.data() };
        });
        
        let tickets = await Promise.all(userPromises);
        tickets = tickets.filter(t => t !== null);
        setGiveawayTickets(tickets);`;

code = code.replace(oldFetch, newFetch);
fs.writeFileSync('src/components/AdminPanel.tsx', code);
