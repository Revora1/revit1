import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, deleteDoc, orderBy, limit, where, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Shield, Trash2, X, AlertTriangle, Users, Gift, Download, ImagePlus, Save } from 'lucide-react';
import { UserProfile } from '../types';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'giveaways'>('reports');
  const [giveawayTickets, setGiveawayTickets] = useState<any[]>([]);
  const [milestonesConfig, setMilestonesConfig] = useState<any[]>([
    { target: 10000, prize: '£50 Giftcard', image: '', carMake: '', carModel: '', carYear: '', carPower: '' },
    { target: 100000, prize: '£1000 Cash', image: '', carMake: '', carModel: '', carYear: '', carPower: '' },
    { target: 1000000, prize: 'A Brand New Car', image: '', carMake: '', carModel: '', carYear: '', carPower: '' }
  ]);
  const [savingMilestones, setSavingMilestones] = useState(false);

  useEffect(() => {
    if (user?.email === 'tonyang11552883@gmail.com') {
      fetchData();
    } else {
      onClose(); // unauthorized
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === 'users') {
        const q = query(collection(db, 'users'), limit(50));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as UserProfile)));
      } else if (activeTab === 'giveaways') {
        // Fetch users who have unlocked tickets for the active milestone
        const ticketsQ = query(collection(db, 'giveaways', 'community_milestone_1', 'tickets'));
        const ticketsSnap = await getDocs(ticketsQ);
        
        // Filter users who actually entered (i.e., meet the requirements: have car and post)
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
        setGiveawayTickets(tickets);
        
        const configSnap = await getDoc(doc(db, 'giveaways', 'config'));
        if (configSnap.exists() && configSnap.data().milestones) {
          setMilestonesConfig(configSnap.data().milestones);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    try {
      await deleteDoc(doc(db, 'reports', id));
      setReports(reports.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
      alert('Error deleting report.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user account and all their data? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      // Optionally could delete their posts, cars, etc. via Cloud Function or manual loops here.
      setUsers(users.filter(u => u.uid !== userId));
      alert('User deleted.');
    } catch (e) {
      console.error(e);
      alert('Error deleting user.');
    }
  };


  const handleMilestoneChange = (index: number, field: string, value: any) => {
    const newM = [...milestonesConfig];
    newM[index][field] = value;
    setMilestonesConfig(newM);
  };

  const handleMilestoneImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    try {
      const storageRef = ref(storage, `giveaways/milestone_${index}_${Date.now()}`);
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

  const handleDrawWinner = async (idx: number) => {
    if (giveawayTickets.length === 0) return alert('No tickets found');
    const winner = giveawayTickets[Math.floor(Math.random() * giveawayTickets.length)];
    const updatedMilestones = [...milestonesConfig];
    updatedMilestones[idx].winnerUsername = winner.username;
    updatedMilestones[idx].winnerId = winner.userId;
    updatedMilestones[idx].status = 'drawn';
    setMilestonesConfig(updatedMilestones);
    try {
      await setDoc(doc(db, 'giveaways', 'config'), { milestones: updatedMilestones }, { merge: true });
      alert(`Winner drawn: ${winner.username}`);
    } catch (e) {
      console.error(e);
      alert('Error saving winner');
    }
  };

  const handleDownloadEntries = async (milestoneIndex?: number) => {
    // Generate CSV
    const csvHeader = 'username,userId,referrals\n';
    const csvContent = giveawayTickets.map(t => `${t.username || 'Unknown'},${t.userId},${t.referralBonusCount || 0}`).join('\n');
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = typeof milestoneIndex === 'number' ? `giveaway_entries_milestone_${milestoneIndex + 1}.csv` : 'giveaway_entries.csv';
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Shield className="text-red-500" />
          <h2 className="text-lg font-bold">Admin Panel</h2>
        </div>
        <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full">
          <X size={20} />
        </button>
      </div>

      <div className="flex border-b border-zinc-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-none px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'reports' ? 'border-b-2 border-red-500 text-white' : 'text-zinc-500'}`}
        >
          <AlertTriangle size={16} /> Reports
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-none px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'users' ? 'border-b-2 border-red-500 text-white' : 'text-zinc-500'}`}
        >
          <Users size={16} /> Users
        </button>
        <button
          onClick={() => setActiveTab('giveaways')}
          className={`flex-none px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'giveaways' ? 'border-b-2 border-red-500 text-white' : 'text-zinc-500'}`}
        >
          <Gift size={16} /> Giveaways
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-center text-zinc-500 mt-10">Loading...</p>
        ) : activeTab === 'reports' ? (
          reports.length === 0 ? <p className="text-center text-zinc-500 mt-10">No reports found.</p> :
          reports.map(r => (
            <div key={r.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-bold text-red-500">Target Type: {r.targetType}</p>
                  <p className="text-xs text-zinc-500">Target ID: {r.targetId}</p>
                </div>
                <button onClick={() => handleDeleteReport(r.id)} className="text-zinc-500 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-sm">Reason: {r.reason}</p>
              <p className="text-xs text-zinc-500 mt-2">Reporter: {r.reporterId}</p>
            </div>
          ))
        ) : activeTab === 'users' ? (
          users.length === 0 ? <p className="text-center text-zinc-500 mt-10">No users found.</p> :
          users.map(u => (
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
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase">Make</label>
                        <input type="text" value={m.carMake || ''} onChange={(e) => handleMilestoneChange(idx, 'carMake', e.target.value)} placeholder="e.g. BMW" className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase">Model</label>
                        <input type="text" value={m.carModel || ''} onChange={(e) => handleMilestoneChange(idx, 'carModel', e.target.value)} placeholder="e.g. M3" className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase">Year</label>
                        <input type="text" value={m.carYear || ''} onChange={(e) => handleMilestoneChange(idx, 'carYear', e.target.value)} placeholder="e.g. 2023" className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase">Power (HP/BHP)</label>
                        <input type="text" value={m.carPower || ''} onChange={(e) => handleMilestoneChange(idx, 'carPower', e.target.value)} placeholder="e.g. 500 HP" className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                    </div>
                    <div>
                       <label className="text-[10px] text-zinc-500 uppercase block mb-1">Prize Image</label>
                       <div className="flex flex-col gap-2">
                         {m.image && <img src={m.image} alt="preview" className="h-24 w-full rounded-lg object-cover" />}
                         <label className="bg-zinc-800 hover:bg-zinc-700 transition-colors p-3 rounded-lg cursor-pointer flex items-center justify-center gap-2">
                           <ImagePlus size={16} className="text-zinc-400" />
                           <span className="text-sm text-zinc-300">Upload Image</span>
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMilestoneImageUpload(idx, e)} />
                         </label>
                       </div>
                    </div>
                    
                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        onClick={() => handleDownloadEntries(idx)}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download size={14} /> Download Entries for Milestone {idx + 1}
                      </button>
                      
                      <button
                        onClick={() => handleDrawWinner(idx)}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors"
                      >
                        Draw Winner
                      </button>
                      
                      {m.winnerUsername && (
                        <div className="text-center text-xs text-amber-500 font-bold mt-1">
                          Winner: {m.winnerUsername}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <h3 className="font-bold text-lg mb-2">Active Milestone Giveaway</h3>
              <p className="text-sm text-zinc-400 mb-2">Total Entries: {giveawayTickets.length}</p>
            </div>
            {giveawayTickets.map(t => (
              <div key={t.userId} className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex justify-between items-center text-sm">
                <span>{t.username || t.userId}</span>
                <span className="text-amber-500 font-bold text-xs">{t.referralBonusCount || 0} bonuses</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
