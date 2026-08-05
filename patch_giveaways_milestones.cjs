const fs = require('fs');
let code = fs.readFileSync('src/components/GiveawaysView.tsx', 'utf8');

const target1 = `  const giveawayId = 'community_milestone_1';
  
  const milestones = [
    { target: 10000, prize: '£50 Giftcard' },
    { target: 100000, prize: '£1000 Cash' },
    { target: 1000000, prize: 'A Brand New Car' },
  ];`;

const replacement1 = `  const giveawayId = 'community_milestone_1';
  
  const [milestones, setMilestones] = useState<any[]>([
    { target: 10000, prize: '£50 Giftcard' },
    { target: 100000, prize: '£1000 Cash' },
    { target: 1000000, prize: 'A Brand New Car' },
  ]);`;

code = code.replace(target1, replacement1);

const target2 = `        // Get total users count
        const usersSnap = await getCountFromServer(collection(db, 'users'));
        setTotalUsers(usersSnap.data().count);`;

const replacement2 = `        // Get total users count
        const usersSnap = await getCountFromServer(collection(db, 'users'));
        setTotalUsers(usersSnap.data().count);

        // Fetch custom milestones if they exist
        const configSnap = await getDoc(doc(db, 'giveaways', 'config'));
        if (configSnap.exists() && configSnap.data().milestones) {
          setMilestones(configSnap.data().milestones);
        }`;

code = code.replace(target2, replacement2);

const target3 = `                     <span className={isCurrent ? 'text-amber-500' : 'text-zinc-500'}>{m.prize}</span>
                   </div>
                   <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">`;

const replacement3 = `                     <span className={isCurrent ? 'text-amber-500' : 'text-zinc-500'}>{m.prize}</span>
                   </div>
                   {m.image && (
                     <div className="my-2 rounded-xl overflow-hidden border border-zinc-800 relative">
                       <img src={m.image} alt={m.prize} className="w-full h-32 object-cover" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                         <span className="text-white font-black italic uppercase text-xs">{m.prize}</span>
                       </div>
                     </div>
                   )}
                   <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">`;

code = code.replace(target3, replacement3);
fs.writeFileSync('src/components/GiveawaysView.tsx', code);
