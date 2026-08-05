const fs = require('fs');
let code = fs.readFileSync('src/components/GiveawaysView.tsx', 'utf8');

const importTarget1 = `import { collection, doc, getDoc, getCountFromServer, setDoc, onSnapshot } from 'firebase/firestore';`;
code = code.replace(importTarget1, `import { collection, doc, getDoc, getCountFromServer, setDoc, onSnapshot, query, where } from 'firebase/firestore';`);

const importTarget2 = `import { Gift, Copy, CheckCircle2, ChevronLeft, Users, Trophy } from 'lucide-react';`;
code = code.replace(importTarget2, `import { Gift, Copy, CheckCircle2, ChevronLeft, Users, Trophy, ShieldCheck } from 'lucide-react';`);

const stateTarget = `  const [loading, setLoading] = useState(true);`;
code = code.replace(stateTarget, `  const [loading, setLoading] = useState(true);
  const [hasCar, setHasCar] = useState(false);
  const [hasPost, setHasPost] = useState(false);`);

const effectTarget = `        if (user) {
          // Listen to user's ticket`;
const effectReplacement = `        if (user) {
          // Check checklist status
          const carQ = query(collection(db, 'garage'), where('ownerId', '==', user.uid));
          const postQ = query(collection(db, 'posts'), where('authorId', '==', user.uid));
          const [carSnap, postSnap] = await Promise.all([
            getCountFromServer(carQ),
            getCountFromServer(postQ)
          ]);
          setHasCar(carSnap.data().count > 0);
          setHasPost(postSnap.data().count > 0);

          // Listen to user's ticket`;
code = code.replace(effectTarget, effectReplacement);

const checklistTarget = `        {/* Your Tickets */}`;
const checklistReplacement = `        {/* Entry Status Checklist */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={20} className="text-amber-500" />
            <h3 className="font-black text-xl italic uppercase">Entry Status</h3>
          </div>
          <p className="text-zinc-400 text-xs mb-4">Complete these steps to unlock your raffle ticket.</p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {user?.emailVerified || user ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
              <span className={\`text-sm font-bold uppercase tracking-wide \${user?.emailVerified || user ? 'text-white' : 'text-zinc-500'}\`}>Account Verified</span>
            </div>
            <div className="flex items-center gap-3">
              {hasCar ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
              <span className={\`text-sm font-bold uppercase tracking-wide \${hasCar ? 'text-white' : 'text-zinc-500'}\`}>Add 1+ Car to Garage</span>
            </div>
            <div className="flex items-center gap-3">
              {hasPost ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
              <span className={\`text-sm font-bold uppercase tracking-wide \${hasPost ? 'text-white' : 'text-zinc-500'}\`}>Post a Build Update</span>
            </div>
          </div>
          
          <div className={\`mt-4 pt-4 border-t border-zinc-800 text-center font-black italic uppercase tracking-widest \${(user?.emailVerified || user) && hasCar && hasPost ? 'text-green-500' : 'text-zinc-500'}\`}>
            {(user?.emailVerified || user) && hasCar && hasPost ? 'TICKET UNLOCKED' : 'TICKET LOCKED'}
          </div>
        </div>

        {/* Your Tickets */}`;
code = code.replace(checklistTarget, checklistReplacement);

fs.writeFileSync('src/components/GiveawaysView.tsx', code);
