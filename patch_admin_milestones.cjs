const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const importTarget = `import { collection, query, getDocs, doc, deleteDoc, orderBy, limit, where } from 'firebase/firestore';`;
code = code.replace(importTarget, `import { collection, query, getDocs, doc, deleteDoc, orderBy, limit, where, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';`);

const lucideTarget = `import { Shield, Trash2, X, AlertTriangle, Users, Gift, Download } from 'lucide-react';`;
code = code.replace(lucideTarget, `import { Shield, Trash2, X, AlertTriangle, Users, Gift, Download, ImagePlus, Save } from 'lucide-react';`);

const stateTarget = `  const [giveawayTickets, setGiveawayTickets] = useState<any[]>([]);`;
code = code.replace(stateTarget, `  const [giveawayTickets, setGiveawayTickets] = useState<any[]>([]);
  const [milestonesConfig, setMilestonesConfig] = useState<any[]>([
    { target: 10000, prize: '£50 Giftcard', image: '' },
    { target: 100000, prize: '£1000 Cash', image: '' },
    { target: 1000000, prize: 'A Brand New Car', image: '' }
  ]);
  const [savingMilestones, setSavingMilestones] = useState(false);`);

const fetchTarget = `        let tickets = await Promise.all(userPromises);
        tickets = tickets.filter(t => t !== null);
        setGiveawayTickets(tickets);`;
const fetchReplacement = `        let tickets = await Promise.all(userPromises);
        tickets = tickets.filter(t => t !== null);
        setGiveawayTickets(tickets);
        
        const configSnap = await getDoc(doc(db, 'giveaways', 'config'));
        if (configSnap.exists() && configSnap.data().milestones) {
          setMilestonesConfig(configSnap.data().milestones);
        }`;
code = code.replace(fetchTarget, fetchReplacement);

const handleDownloadTarget = `  const handleDownloadEntries = async () => {`;
const handleDownloadReplacement = `  const handleMilestoneChange = (index: number, field: string, value: any) => {
    const newM = [...milestonesConfig];
    newM[index][field] = value;
    setMilestonesConfig(newM);
  };

  const handleMilestoneImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    try {
      const storageRef = ref(storage, \`giveaways/milestone_\${index}_\${Date.now()}\`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      handleMilestoneChange(index, 'image', url);
    } catch (error) {
      console.error(error);
      alert('Error uploading image');
    }
  };

  const saveMilestones = async () => {
    setSavingMilestones(true);
    try {
      await setDoc(doc(db, 'giveaways', 'config'), { milestones: milestonesConfig }, { merge: true });
      alert('Milestones saved!');
    } catch (e) {
      console.error(e);
      alert('Error saving');
    }
    setSavingMilestones(false);
  };

  const handleDownloadEntries = async () => {`;
code = code.replace(handleDownloadTarget, handleDownloadReplacement);


const renderTarget = `          <div className="space-y-4">
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
            {giveawayTickets.map(t => (`;
            
const renderReplacement = `          <div className="space-y-4">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                Milestone Config
                <button onClick={saveMilestones} disabled={savingMilestones} className="bg-amber-500 text-black px-3 py-1 rounded-lg text-xs flex items-center gap-1">
                  <Save size={14} /> {savingMilestones ? 'Saving...' : 'Save'}
                </button>
              </h3>
              <div className="space-y-4">
                {milestonesConfig.map((m, idx) => (
                  <div key={idx} className="p-3 bg-black rounded-lg border border-zinc-800 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500 uppercase">Target Users</label>
                        <input type="number" value={m.target} onChange={(e) => handleMilestoneChange(idx, 'target', Number(e.target.value))} className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500 uppercase">Prize Name</label>
                        <input type="text" value={m.prize} onChange={(e) => handleMilestoneChange(idx, 'prize', e.target.value)} className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                    </div>
                    <div>
                       <label className="text-[10px] text-zinc-500 uppercase block mb-1">Prize Image URL</label>
                       <div className="flex gap-2">
                         <input type="text" value={m.image || ''} onChange={(e) => handleMilestoneChange(idx, 'image', e.target.value)} className="flex-1 bg-zinc-900 p-2 rounded text-sm text-white" placeholder="https://..." />
                         <label className="bg-zinc-800 p-2 rounded cursor-pointer flex items-center justify-center">
                           <ImagePlus size={16} className="text-zinc-400" />
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMilestoneImageUpload(idx, e)} />
                         </label>
                       </div>
                    </div>
                    {m.image && <img src={m.image} alt="preview" className="h-16 rounded object-cover mt-2" />}
                  </div>
                ))}
              </div>
            </div>

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
            {giveawayTickets.map(t => (`;
code = code.replace(renderTarget, renderReplacement);
fs.writeFileSync('src/components/AdminPanel.tsx', code);
