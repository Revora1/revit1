const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const importTarget = `import { Shield, Trash2, X, AlertTriangle, Users } from 'lucide-react';`;
code = code.replace(importTarget, `import { Shield, Trash2, X, AlertTriangle, Users, Gift, Download } from 'lucide-react';`);

const stateTarget = `  const [activeTab, setActiveTab] = useState<'reports' | 'users'>('reports');`;
code = code.replace(stateTarget, `  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'giveaways'>('reports');
  const [giveawayTickets, setGiveawayTickets] = useState<any[]>([]);`);

const fetchDataTarget = `      } else {
        const q = query(collection(db, 'users'), limit(50));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as UserProfile)));
      }`;
code = code.replace(fetchDataTarget, `      } else if (activeTab === 'users') {
        const q = query(collection(db, 'users'), limit(50));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as UserProfile)));
      } else if (activeTab === 'giveaways') {
        // Fetch users who have unlocked tickets for the active milestone
        const ticketsQ = query(collection(db, 'giveaways', 'community_milestone_1', 'tickets'));
        const ticketsSnap = await getDocs(ticketsQ);
        
        // Let's get the user data for each ticket
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
        setGiveawayTickets(tickets);
      }`);

const tabsTarget = `      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('reports')}
          className={\`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 \${activeTab === 'reports' ? 'border-b-2 border-red-500 text-white' : 'text-zinc-500'}\`}
        >
          <AlertTriangle size={16} /> Reports
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={\`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 \${activeTab === 'users' ? 'border-b-2 border-red-500 text-white' : 'text-zinc-500'}\`}
        >
          <Users size={16} /> Users
        </button>
      </div>`;
code = code.replace(tabsTarget, `      <div className="flex border-b border-zinc-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('reports')}
          className={\`flex-none px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 \${activeTab === 'reports' ? 'border-b-2 border-red-500 text-white' : 'text-zinc-500'}\`}
        >
          <AlertTriangle size={16} /> Reports
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={\`flex-none px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 \${activeTab === 'users' ? 'border-b-2 border-red-500 text-white' : 'text-zinc-500'}\`}
        >
          <Users size={16} /> Users
        </button>
        <button
          onClick={() => setActiveTab('giveaways')}
          className={\`flex-none px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 \${activeTab === 'giveaways' ? 'border-b-2 border-red-500 text-white' : 'text-zinc-500'}\`}
        >
          <Gift size={16} /> Giveaways
        </button>
      </div>`);

const handleDownloadEntries = `
  const handleDownloadEntries = async () => {
    // Generate CSV
    const csvHeader = 'username,userId,referrals\\n';
    const csvContent = giveawayTickets.map(t => \`\${t.username || 'Unknown'},\${t.userId},\${t.referralBonusCount || 0}\`).join('\\n');
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'giveaway_entries.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
`;
const handleTarget = `  return (`;
code = code.replace(handleTarget, handleDownloadEntries + `\n  return (`);


const contentTarget = `          users.map(u => (
            <div key={u.uid} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
              <div>
                <p className="font-bold">{u.username}</p>
                <p className="text-xs text-zinc-500">UID: {u.uid}</p>
              </div>
              <button onClick={() => handleDeleteUser(u.uid)} className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}`;

const contentReplacement = `          users.map(u => (
            <div key={u.uid} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
              <div>
                <p className="font-bold">{u.username}</p>
                <p className="text-xs text-zinc-500">UID: {u.uid}</p>
              </div>
              <button onClick={() => handleDeleteUser(u.uid)} className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                <Trash2 size={18} />
              </button>
            </div>
          ))
        ) : activeTab === 'giveaways' ? (
          <div className="space-y-4">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <h3 className="font-bold text-lg mb-2">Active Milestone Giveaway</h3>
              <p className="text-sm text-zinc-400 mb-4">Total Entries: {giveawayTickets.length}</p>
              <button
                onClick={handleDownloadEntries}
                className="w-full bg-white text-black py-2 rounded-lg font-bold flex items-center justify-center gap-2"
              >
                <Download size={16} /> Download Entries CSV
              </button>
            </div>
            {giveawayTickets.map(t => (
              <div key={t.userId} className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex justify-between items-center text-sm">
                <span>{t.username || t.userId}</span>
                <span className="text-amber-500 font-bold text-xs">{t.referralBonusCount || 0} bonuses</span>
              </div>
            ))}
          </div>
        ) : null}`;

code = code.replace(contentTarget, contentReplacement);

// also need to import where
code = code.replace(`import { collection, query, getDocs, doc, deleteDoc, orderBy, limit } from 'firebase/firestore';`,
`import { collection, query, getDocs, doc, deleteDoc, orderBy, limit, where } from 'firebase/firestore';`);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
