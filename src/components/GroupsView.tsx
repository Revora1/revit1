import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, orderBy, onSnapshot, getDoc } from 'firebase/firestore';
import { Group, GroupMember, UserProfile } from '../types';
import { Plus, Users, Shield, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface GroupsViewProps {
  onBack: () => void;
  onSelectGroup: (groupId: string) => void;
}

export function GroupsView({ onBack, onSelectGroup }: GroupsViewProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my_groups' | 'discover'>('discover');
  
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  
  // Create Group Form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [groupImageFile, setGroupImageFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Discover groups (latest 20)
    const qDiscover = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    const unsubDiscover = onSnapshot(qDiscover, (snap) => {
      setDiscoverGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
      setLoading(false);
    });

    // My Groups
    const qMy = query(collection(db, 'groupMembers'), where('userId', '==', user.uid));
    const unsubMy = onSnapshot(qMy, async (snap) => {
      const groupIds = snap.docs.map(d => d.data().groupId);
      if (groupIds.length === 0) {
        setMyGroups([]);
        return;
      }
      
      const myGroupsData: Group[] = [];
      for (const id of groupIds) {
        const gSnap = await getDoc(doc(db, 'groups', id));
        if (gSnap.exists()) {
          myGroupsData.push({ id: gSnap.id, ...gSnap.data() } as Group);
        }
      }
      setMyGroups(myGroupsData);
    });

    return () => {
      unsubDiscover();
      unsubMy();
    };
  }, [user]);

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim() || !newGroupDesc.trim()) return;
    
    setCreating(true);
    try {
      let coverImage = '';
      if (groupImageFile) {
        
        const storageRef = ref(storage, `groups/${user.uid}_${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, groupImageFile);
        const url = await getDownloadURL(snapshot.ref);
  
        if (url) coverImage = url;
      }
      
      const groupId = `${user.uid}_${Date.now()}`;
      
      await setDoc(doc(db, 'groups', groupId), {
        name: newGroupName.trim(),
        nameLower: newGroupName.trim().toLowerCase(),
        description: newGroupDesc.trim(),
        adminId: user.uid,
        coverImage,
        memberCount: 1,
        createdAt: Date.now()
      });
      
      await setDoc(doc(db, 'groupMembers', `${groupId}_${user.uid}`), {
        groupId,
        userId: user.uid,
        role: 'admin',
        createdAt: Date.now()
      });
      
      setShowCreate(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setGroupImageFile(null);
      onSelectGroup(groupId);
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.WRITE, 'groups');
    } finally {
      setCreating(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setGroupImageFile(e.target.files[0]);
    }
  };

  const renderGroupCard = (group: Group) => (
    <div key={group.id} onClick={() => onSelectGroup(group.id)} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-zinc-700 transition-colors">
      <div className="h-24 w-full bg-zinc-800 relative">
        {group.coverImage ? (
          <img src={group.coverImage} alt={group.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <Users size={32} />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-white font-bold text-lg mb-1">{group.name}</h3>
        <p className="text-zinc-400 text-sm line-clamp-2 mb-3">{group.description}</p>
        <div className="flex items-center text-zinc-500 text-xs font-medium">
          <Users size={12} className="mr-1" />
          {group.memberCount} Members
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-black text-white relative">
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-900/60 p-4 pt-[calc(16px+env(safe-area-inset-top,0px))] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-white/80 hover:text-white rounded-full">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-black italic tracking-tighter">CAR CLUBS</h1>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-white text-black px-3 py-1.5 rounded-full text-sm font-bold active:scale-95 transition-transform"
        >
          <Plus size={16} /> Create
        </button>
      </div>

      <div className="flex border-b border-zinc-900/60">
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'discover' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
        >
          Discover
        </button>
        <button
          onClick={() => setActiveTab('my_groups')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'my_groups' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
        >
          My Clubs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {loading ? (
          <div className="text-center p-8 text-zinc-500">Loading clubs...</div>
        ) : activeTab === 'discover' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {discoverGroups.length > 0 ? discoverGroups.map(renderGroupCard) : (
              <div className="col-span-full text-center p-8 text-zinc-500">No clubs found. Create one!</div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myGroups.length > 0 ? myGroups.map(renderGroupCard) : (
              <div className="col-span-full text-center p-8 text-zinc-500">You haven't joined any clubs yet.</div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className="w-full sm:max-w-md bg-zinc-950 sm:rounded-2xl sm:border border-zinc-900 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-950 sticky top-0 z-10">
                <h2 className="text-lg font-bold">Create Car Club</h2>
                <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white p-2">
                  <ArrowLeft size={20} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Club Banner Image (Optional)</label>
                  <div className="flex items-center gap-4">
                    {groupImageFile ? (
                      <img src={URL.createObjectURL(groupImageFile)} alt="Preview" className="w-32 h-20 object-cover rounded-lg border border-zinc-800" />
                    ) : (
                      <div className="w-32 h-20 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-600">
                        <ImageIcon size={24} />
                      </div>
                    )}
                    <label className="bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors border border-zinc-800">
                      Upload Banner
                      <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Club Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="e.g. Midnight Runners"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Description</label>
                  <textarea
                    value={newGroupDesc}
                    onChange={e => setNewGroupDesc(e.target.value)}
                    placeholder="What is this club about?"
                    rows={4}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all resize-none"
                  />
                </div>
              </div>
              
              <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-zinc-900 bg-zinc-950">
                <button
                  onClick={handleCreateGroup}
                  disabled={creating || !newGroupName.trim() || !newGroupDesc.trim()}
                  className="w-full bg-white text-black py-3 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  {creating ? 'Creating...' : 'Create Club'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
