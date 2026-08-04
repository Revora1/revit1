import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { db, storage } from '../lib/firebase';
import { collection, doc, updateDoc, setDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { processImageFile } from '../lib/imageUtils';
import { 
  Terminal, Shield, User, UserPlus, Sliders, Gift, 
  Database, Sparkles, CheckCircle, Lock, Unlock, 
  Eye, RefreshCw, X, HelpCircle, Code, Settings, ChevronRight,
  Upload, Trash2, Plus, Loader2, ChevronDown, ChevronUp, Image as ImageIcon,
  Download
} from 'lucide-react';

export function DeveloperSwitcher() {
  const { 
    user, 
    isAdmin, 
    currentRole, 
    setCurrentRole, 
    simulatedUserCount, 
    setSimulatedUserCount 
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'personas' | 'giveaway_sim' | 'entries_export' | 'schema_draft'>('personas');

  // Export entries states
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingSpecific, setDownloadingSpecific] = useState<string | null>(null);
  const [entriesCount, setEntriesCount] = useState<number | null>(null);

  // Firestore Live Giveaways State
  const [giveaways, setGiveaways] = useState<any[]>([]);
  const [loadingGiveaways, setLoadingGiveaways] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  
  // Form fields for editing
  const [editForm, setEditForm] = useState<any>({
    reward: '',
    description: '',
    target: 0,
    type: 'Gift Card',
    specs: {
      make: '',
      model: '',
      year: '',
      horsepower: '',
      torque: '',
      zeroToSixty: '',
      engine: '',
      transmission: ''
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default seed data for giveaways
  const defaultMilestones = [
    { 
      id: 'm1', 
      target: 10000, 
      targetCount: 10000,
      reward: '£50 Giftcard', 
      prizeName: '£50 Giftcard',
      description: 'Distributed to 5 lucky newly joined users',
      type: 'Gift Card',
      color: 'from-orange-500 to-amber-500',
      imageUrls: [],
      specs: {},
      status: 'active',
      createdAt: Date.now()
    },
    { 
      id: 'm2', 
      target: 100000, 
      targetCount: 100000,
      reward: '£1,000 Cash Prize', 
      prizeName: '£1,000 Cash Prize',
      description: 'Distributed to 1 lucky active enthusiast',
      type: 'Cash Prize',
      color: 'from-emerald-500 to-teal-500',
      imageUrls: [],
      specs: {},
      status: 'locked',
      createdAt: Date.now()
    },
    { 
      id: 'm3', 
      target: 1000000, 
      targetCount: 1000000,
      reward: 'Performance Car 🏎️', 
      prizeName: 'Performance Car 🏎️',
      description: 'Dream track car sweepstake for all verified participants',
      type: 'Vehicle Sweepstakes',
      color: 'from-red-500 to-pink-500',
      imageUrls: [
        'https://images.unsplash.com/photo-1594051673809-5c4d0ec3ca81?auto=format&fit=crop&q=80&w=800'
      ],
      specs: {
        make: '2015 focus',
        model: 'st250',
        horsepower: '250',
        engine: '2.0 ecoboost',
        transmission: '6 speed manual'
      },
      status: 'locked',
      createdAt: Date.now()
    }
  ];

  // Live Sync with Firestore Giveaways Collection
  useEffect(() => {
    if (user?.email?.toLowerCase() !== 'tonyang11552883@gmail.com') {
      return;
    }

    setLoadingGiveaways(true);
    const unsubscribe = onSnapshot(collection(db, 'giveaways'), async (snapshot) => {
      if (snapshot.empty) {
        // Automatically seed Firestore with default milestones if empty
        console.log("Seeding initial giveaways into Firestore...");
        for (const item of defaultMilestones) {
          try {
            await setDoc(doc(db, 'giveaways', item.id), item);
          } catch (e) {
            console.error("Failed to seed giveaway:", item.id, e);
          }
        }
      } else {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by target
        list.sort((a: any, b: any) => a.target - b.target);
        setGiveaways(list);
      }
      setLoadingGiveaways(false);
    }, (error) => {
      console.error("Error subscribing to giveaways:", error);
      setLoadingGiveaways(false);
    });

    return unsubscribe;
  }, [user]);

  // Listen for external open/close/toggle event triggers and report state status
  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('toggle-dev-switcher', handleToggle);
    window.addEventListener('open-dev-switcher', handleOpen);
    window.addEventListener('close-dev-switcher', handleClose);

    return () => {
      window.removeEventListener('toggle-dev-switcher', handleToggle);
      window.removeEventListener('open-dev-switcher', handleOpen);
      window.removeEventListener('close-dev-switcher', handleClose);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('dev-switcher-status', { detail: { isOpen } }));
  }, [isOpen]);

  // Fetch count of entries on load or when activeTab changes
  useEffect(() => {
    if (activeTab === 'entries_export' && user?.email?.toLowerCase() === 'tonyang11552883@gmail.com') {
      const fetchCount = async () => {
        try {
          const snapshot = await getDocs(collection(db, 'giveaway_entries'));
          setEntriesCount(snapshot.size);
        } catch (e) {
          console.error("Failed to fetch entries count:", e);
        }
      };
      fetchCount();
    }
  }, [activeTab, user]);

  // Verify authorization - Only allow for the specified developer account (Tony)
  if (user?.email?.toLowerCase() !== 'tonyang11552883@gmail.com') {
    return null;
  }

  const handleRoleChange = (role: 'admin' | 'user' | 'new_user') => {
    setCurrentRole(role);
  };

  const handleQuickSetUsers = (count: number) => {
    setSimulatedUserCount(count);
  };

  const handleDownloadAllEntries = async () => {
    setDownloadingAll(true);
    try {
      const snapshot = await getDocs(collection(db, 'giveaway_entries'));
      if (snapshot.empty) {
        alert("No entries found to download.");
        return;
      }

      const rows = [
        ['Username']
      ];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.username) {
          rows.push([data.username]);
        }
      });

      // Generate CSV content
      const csvContent = "data:text/csv;charset=utf-8," 
        + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `revitup_giveaway_usernames_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Failed to download entries:", e);
      alert("Error exporting entries. Please try again.");
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadGiveawayEntries = async (giveawayId: string, giveawayReward: string) => {
    setDownloadingSpecific(giveawayId);
    try {
      const snapshot = await getDocs(collection(db, 'giveaway_entries'));
      const filteredDocs = snapshot.docs.filter(docSnap => docSnap.data().giveawayId === giveawayId);

      if (filteredDocs.length === 0) {
        alert(`No entries found for ${giveawayReward}.`);
        return;
      }

      const rows = [
        ['Username']
      ];

      filteredDocs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.username) {
          rows.push([data.username]);
        }
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      const sanitizedReward = giveawayReward.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.setAttribute("download", `usernames_${sanitizedReward}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Error exporting giveaway entries:", e);
      alert("Error occurred while exporting entries.");
    } finally {
      setDownloadingSpecific(null);
    }
  };

  const startEditing = (m: any) => {
    setEditingId(m.id);
    setEditForm({
      reward: m.reward || '',
      description: m.description || '',
      target: m.target || 0,
      type: m.type || 'Gift Card',
      specs: {
        make: m.specs?.make || '',
        model: m.specs?.model || '',
        year: m.specs?.year || '',
        horsepower: m.specs?.horsepower || '',
        torque: m.specs?.torque || '',
        zeroToSixty: m.specs?.zeroToSixty || '',
        engine: m.specs?.engine || '',
        transmission: m.specs?.transmission || ''
      }
    });
  };

  const handleSaveDetails = async (id: string) => {
    setSavingDetails(true);
    try {
      await updateDoc(doc(db, 'giveaways', id), {
        reward: editForm.reward,
        prizeName: editForm.reward,
        description: editForm.description,
        target: Number(editForm.target),
        targetCount: Number(editForm.target),
        type: editForm.type,
        specs: editForm.specs || {}
      });
      setEditingId(null);
    } catch (e) {
      console.error("Failed to save giveaway details:", e);
      alert("Failed to save giveaway settings.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);

    try {
      const current = giveaways.find(g => g.id === id);
      const existingUrls = current?.imageUrls || [];
      const newUrls: string[] = [];

      for (const file of files) {
        // Compress and sanitize image format (includes HEIC to JPG conversion)
        const processed = await processImageFile(file);
        
        // Upload to Firebase Storage bucket
        const fileRef = ref(storage, `giveaways/${id}/${Date.now()}_${processed.name}`);
        const snapshot = await uploadBytes(fileRef, processed);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        newUrls.push(downloadUrl);
      }

      const updatedUrls = [...existingUrls, ...newUrls];
      await updateDoc(doc(db, 'giveaways', id), {
        imageUrls: updatedUrls
      });
    } catch (e) {
      console.error("Error uploading giveaway images:", e);
      alert("Error occurred while processing or uploading files.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (id: string, urlToDelete: string) => {
    try {
      const current = giveaways.find(g => g.id === id);
      const updatedUrls = (current?.imageUrls || []).filter((u: string) => u !== urlToDelete);
      
      await updateDoc(doc(db, 'giveaways', id), {
        imageUrls: updatedUrls
      });
    } catch (e) {
      console.error("Failed to delete image:", e);
    }
  };

  // Giveaways milestones database/array reference (fallback to default milestones if firebase is loading/empty)
  const milestones = giveaways.length > 0 ? giveaways : defaultMilestones;

  return (
    <>
      {/* Slide-over Drawer Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            />

            {/* Slide-over Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-900 h-full flex flex-col shadow-2xl text-white select-none"
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/20">
                <div>
                  <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold tracking-wider uppercase">
                    <Terminal size={12} className="text-emerald-500" />
                    <span>RevitUp Lab Sandbox</span>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">Developer Switcher</h3>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 bg-zinc-900/60 hover:bg-zinc-900 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sub-navigation tabs */}
              <div className="grid grid-cols-4 border-b border-zinc-900/80 bg-zinc-950 px-2 py-1.5 gap-1 shrink-0">
                <button
                  onClick={() => setActiveTab('personas')}
                  className={`py-2 text-[10.5px] font-bold flex flex-col items-center justify-center gap-1 rounded-md transition-all ${
                    activeTab === 'personas' 
                      ? 'bg-zinc-900 text-white border border-zinc-800' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <User size={13} />
                  <span>Account</span>
                </button>
                <button
                  onClick={() => setActiveTab('giveaway_sim')}
                  className={`py-2 text-[10.5px] font-bold flex flex-col items-center justify-center gap-1 rounded-md transition-all ${
                    activeTab === 'giveaway_sim' 
                      ? 'bg-zinc-900 text-white border border-zinc-800' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Gift size={13} />
                  <span>Milestones</span>
                </button>
                <button
                  onClick={() => setActiveTab('entries_export')}
                  className={`py-2 text-[10.5px] font-bold flex flex-col items-center justify-center gap-1 rounded-md transition-all ${
                    activeTab === 'entries_export' 
                      ? 'bg-zinc-900 text-white border border-zinc-800' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Download size={13} />
                  <span>Entries</span>
                </button>
                <button
                  onClick={() => setActiveTab('schema_draft')}
                  className={`py-2 text-[10.5px] font-bold flex flex-col items-center justify-center gap-1 rounded-md transition-all ${
                    activeTab === 'schema_draft' 
                      ? 'bg-zinc-900 text-white border border-zinc-800' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Database size={13} />
                  <span>Schema</span>
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* 1. PERSONAS TAB */}
                {activeTab === 'personas' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                        <User size={16} className="text-zinc-400" />
                        Account Impersonator
                      </h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Toggle user archetypes instantly to test interface restrictions and access levels without re-logging.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {/* Persona A: Admin (Tony) */}
                      <button
                        onClick={() => handleRoleChange('admin')}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                          currentRole === 'admin' 
                            ? 'bg-emerald-950/10 border-emerald-500/40 hover:bg-emerald-950/20' 
                            : 'bg-zinc-900/40 border-zinc-900 hover:bg-zinc-900/60 hover:border-zinc-800'
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg ${currentRole === 'admin' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                          <Shield size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">Tony Ang (Developer/Admin)</span>
                            {currentRole === 'admin' && (
                              <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">tonyang11552883@gmail.com</p>
                          <p className="text-[11px] text-zinc-500 mt-1">Full dashboard permissions, access to modify giveaway thresholds, configure milestones, and manage core user data.</p>
                        </div>
                      </button>

                      {/* Persona B: Regular User */}
                      <button
                        onClick={() => handleRoleChange('user')}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                          currentRole === 'user' 
                            ? 'bg-blue-950/10 border-blue-500/40 hover:bg-blue-950/20' 
                            : 'bg-zinc-900/40 border-zinc-900 hover:bg-zinc-900/60 hover:border-zinc-800'
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg ${currentRole === 'user' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-800 text-zinc-400'}`}>
                          <User size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">Regular Enthusiast</span>
                            {currentRole === 'user' && (
                              <span className="bg-blue-500/20 text-blue-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">@race_enthusiast</p>
                          <p className="text-[11px] text-zinc-500 mt-1">Simulates an established user profile. View progress bars, participations status, and the upcoming sweepstake info.</p>
                        </div>
                      </button>

                      {/* Persona C: New User */}
                      <button
                        onClick={() => handleRoleChange('new_user')}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                          currentRole === 'new_user' 
                            ? 'bg-purple-950/10 border-purple-500/40 hover:bg-purple-950/20' 
                            : 'bg-zinc-900/40 border-zinc-900 hover:bg-zinc-900/60 hover:border-zinc-800'
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg ${currentRole === 'new_user' ? 'bg-purple-500/10 text-purple-400' : 'bg-zinc-800 text-zinc-400'}`}>
                          <UserPlus size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">New Sign-Up</span>
                            {currentRole === 'new_user' && (
                              <span className="bg-purple-500/20 text-purple-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">@new_driver</p>
                          <p className="text-[11px] text-zinc-500 mt-1">Simulates a user who just created an account. Experience welcome modals, sign-up bonus milestones, and referral tracker.</p>
                        </div>
                      </button>
                    </div>

                    <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold uppercase">
                        <Eye size={12} className="text-zinc-500" />
                        <span>Active Session State</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
                          <span className="text-zinc-500 block uppercase text-[10px] tracking-tight">Active Role</span>
                          <span className="font-bold block mt-0.5 capitalize text-zinc-200">{currentRole === 'admin' ? '👑 Admin (Tony)' : currentRole === 'user' ? '👤 Enthusiast' : '🌱 New Sign-Up'}</span>
                        </div>
                        <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
                          <span className="text-zinc-500 block uppercase text-[10px] tracking-tight">Admin Override</span>
                          <span className={`font-bold block mt-0.5 uppercase ${isAdmin ? 'text-emerald-400' : 'text-red-500'}`}>{isAdmin ? 'AUTHORIZED' : 'LOCKED'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MILESTONE SIMULATOR TAB */}
                {activeTab === 'giveaway_sim' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                        <Sliders size={16} className="text-zinc-400" />
                        User Milestone Simulator
                      </h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Adjust total site users in real-time to preview how progressive milestones look for normal users as goals unlock.
                      </p>
                    </div>

                    {/* Interactive User Count Slider */}
                    <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400 font-semibold uppercase">Total Joined Users</span>
                        <span className="font-mono text-base font-bold text-emerald-400">
                          {simulatedUserCount.toLocaleString()}
                        </span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="1200000"
                        step="500"
                        value={simulatedUserCount}
                        onChange={(e) => setSimulatedUserCount(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                      />

                      <div className="grid grid-cols-4 gap-1.5">
                        <button 
                          onClick={() => handleQuickSetUsers(450)} 
                          className="py-1 bg-zinc-950 hover:bg-zinc-900 text-[10px] font-mono border border-zinc-800/80 rounded"
                        >
                          450
                        </button>
                        <button 
                          onClick={() => handleQuickSetUsers(12000)} 
                          className="py-1 bg-zinc-950 hover:bg-zinc-900 text-[10px] font-mono border border-zinc-800/80 rounded"
                        >
                          12k (M1)
                        </button>
                        <button 
                          onClick={() => handleQuickSetUsers(150000)} 
                          className="py-1 bg-zinc-950 hover:bg-zinc-900 text-[10px] font-mono border border-zinc-800/80 rounded"
                        >
                          150k (M2)
                        </button>
                        <button 
                          onClick={() => handleQuickSetUsers(1100000)} 
                          className="py-1 bg-zinc-950 hover:bg-zinc-900 text-[10px] font-mono border border-zinc-800/80 rounded"
                        >
                          1.1M (M3)
                        </button>
                      </div>
                    </div>

                    {/* Milestone Progress Indicators */}
                    <div className="space-y-3">
                      <span className="text-xs text-zinc-400 font-semibold uppercase block px-1">Concept 1 Milestones Status</span>
                      
                      {milestones.map((m) => {
                        const progress = Math.min((simulatedUserCount / m.target) * 100, 100);
                        const isUnlocked = simulatedUserCount >= m.target;

                        return (
                          <div key={m.id} className="bg-zinc-900/30 border border-zinc-900/60 p-3.5 rounded-xl space-y-2.5">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-zinc-500 uppercase font-mono tracking-tight">Target: {m.target.toLocaleString()}</span>
                                  {isUnlocked ? (
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Unlocked</span>
                                  ) : (
                                    <span className="bg-zinc-800 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Locked</span>
                                  )}
                                </div>
                                <h5 className="font-bold text-sm text-zinc-200 mt-1">{m.reward}</h5>
                                <p className="text-[11px] text-zinc-500 leading-normal mt-0.5">{m.description}</p>
                              </div>
                              <div className={`p-2 rounded-lg bg-zinc-900 border border-zinc-800 ${isUnlocked ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                {isUnlocked ? <Unlock size={16} /> : <Lock size={16} />}
                              </div>
                            </div>

                            {/* Custom mini progress bar */}
                            <div className="space-y-1">
                              <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden border border-zinc-900">
                                <div 
                                  className={`h-full rounded-full bg-gradient-to-r ${isUnlocked ? m.color : 'from-zinc-700 to-zinc-600'}`} 
                                  style={{ width: `${progress}%` }} 
                                />
                              </div>
                              <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                                <span>{progress.toFixed(0)}% Complete</span>
                                <span>{simulatedUserCount.toLocaleString()} / {m.target.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Admin Config & Photo Management Button */}
                            <div className="pt-2 border-t border-zinc-900/80 flex items-center justify-between">
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Images: {m.imageUrls?.length || 0} uploaded
                              </span>
                              <button
                                onClick={() => editingId === m.id ? setEditingId(null) : startEditing(m)}
                                className="flex items-center gap-1 text-[10px] bg-zinc-900 hover:bg-zinc-850 text-emerald-400 font-bold px-2.5 py-1 rounded-md border border-zinc-800 transition-colors"
                              >
                                <Settings size={10} />
                                {editingId === m.id ? "Close Config" : "Edit Award & Photos"}
                              </button>
                            </div>

                            {/* Collapsible Config & Image Uploader Form */}
                            {editingId === m.id && (
                              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 space-y-3 mt-2.5 text-left">
                                <h6 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1 border-b border-zinc-900 pb-2">
                                  <Sliders size={12} className="text-emerald-400" />
                                  Milestone Configurator
                                </h6>

                                {/* Reward title */}
                                <div className="space-y-1">
                                  <label className="text-[10px] text-zinc-500 font-bold uppercase block">Reward Name</label>
                                  <input 
                                    type="text"
                                    value={editForm.reward}
                                    onChange={(e) => setEditForm({ ...editForm, reward: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs focus:outline-none focus:border-zinc-700 font-medium text-white"
                                  />
                                </div>

                                {/* Description */}
                                <div className="space-y-1">
                                  <label className="text-[10px] text-zinc-500 font-bold uppercase block">Description</label>
                                  <textarea 
                                    value={editForm.description}
                                    rows={2}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs focus:outline-none focus:border-zinc-700 font-medium text-white leading-relaxed resize-none"
                                  />
                                </div>

                                {/* Target & Type */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase block">User Target</label>
                                    <input 
                                      type="number"
                                      value={editForm.target}
                                      onChange={(e) => setEditForm({ ...editForm, target: Number(e.target.value) })}
                                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs focus:outline-none focus:border-zinc-700 font-mono text-zinc-300"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase block">Reward Type</label>
                                    <select
                                      value={editForm.type}
                                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
                                    >
                                      <option value="Gift Card">Gift Card</option>
                                      <option value="Cash Prize">Cash Prize</option>
                                      <option value="Vehicle Sweepstakes">Vehicle Sweepstakes</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Specs configuration block (only for Vehicle Sweepstakes types) */}
                                {editForm.type === 'Vehicle Sweepstakes' && (
                                  <div className="bg-zinc-900/40 p-2 rounded-lg border border-zinc-850 space-y-2">
                                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase">
                                      <Sparkles size={11} />
                                      <span>Vehicle Specifications</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                      <div className="space-y-0.5">
                                        <label className="text-zinc-500 uppercase font-bold text-[9px]">Make</label>
                                        <input 
                                          type="text" 
                                          placeholder="e.g. Porsche"
                                          value={editForm.specs?.make || ''}
                                          onChange={(e) => setEditForm({
                                            ...editForm,
                                            specs: { ...editForm.specs, make: e.target.value }
                                          })}
                                          className="w-full bg-zinc-950 border border-zinc-900 p-1.5 rounded focus:outline-none text-zinc-200"
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <label className="text-zinc-500 uppercase font-bold text-[9px]">Model</label>
                                        <input 
                                          type="text" 
                                          placeholder="e.g. 911 GT3 RS"
                                          value={editForm.specs?.model || ''}
                                          onChange={(e) => setEditForm({
                                            ...editForm,
                                            specs: { ...editForm.specs, model: e.target.value }
                                          })}
                                          className="w-full bg-zinc-950 border border-zinc-900 p-1.5 rounded focus:outline-none text-zinc-200"
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <label className="text-zinc-500 uppercase font-bold text-[9px]">Year</label>
                                        <input 
                                          type="text" 
                                          placeholder="e.g. 2023"
                                          value={editForm.specs?.year || ''}
                                          onChange={(e) => setEditForm({
                                            ...editForm,
                                            specs: { ...editForm.specs, year: e.target.value }
                                          })}
                                          className="w-full bg-zinc-950 border border-zinc-900 p-1.5 rounded focus:outline-none text-zinc-200"
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <label className="text-zinc-500 uppercase font-bold text-[9px]">Horsepower</label>
                                        <input 
                                          type="text" 
                                          placeholder="e.g. 518 HP"
                                          value={editForm.specs?.horsepower || ''}
                                          onChange={(e) => setEditForm({
                                            ...editForm,
                                            specs: { ...editForm.specs, horsepower: e.target.value }
                                          })}
                                          className="w-full bg-zinc-950 border border-zinc-900 p-1.5 rounded focus:outline-none text-zinc-200"
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <label className="text-zinc-500 uppercase font-bold text-[9px]">Torque</label>
                                        <input 
                                          type="text" 
                                          placeholder="e.g. 342 lb-ft"
                                          value={editForm.specs?.torque || ''}
                                          onChange={(e) => setEditForm({
                                            ...editForm,
                                            specs: { ...editForm.specs, torque: e.target.value }
                                          })}
                                          className="w-full bg-zinc-950 border border-zinc-900 p-1.5 rounded focus:outline-none text-zinc-200"
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <label className="text-zinc-500 uppercase font-bold text-[9px]">0-60 MPH</label>
                                        <input 
                                          type="text" 
                                          placeholder="e.g. 3.0s"
                                          value={editForm.specs?.zeroToSixty || ''}
                                          onChange={(e) => setEditForm({
                                            ...editForm,
                                            specs: { ...editForm.specs, zeroToSixty: e.target.value }
                                          })}
                                          className="w-full bg-zinc-950 border border-zinc-900 p-1.5 rounded focus:outline-none text-zinc-200"
                                        />
                                      </div>
                                      <div className="space-y-0.5 col-span-2">
                                        <label className="text-zinc-500 uppercase font-bold text-[9px]">Engine</label>
                                        <input 
                                          type="text" 
                                          placeholder="e.g. 4.0L Naturally Aspirated Flat-6"
                                          value={editForm.specs?.engine || ''}
                                          onChange={(e) => setEditForm({
                                            ...editForm,
                                            specs: { ...editForm.specs, engine: e.target.value }
                                          })}
                                          className="w-full bg-zinc-950 border border-zinc-900 p-1.5 rounded focus:outline-none text-zinc-200"
                                        />
                                      </div>
                                      <div className="space-y-0.5 col-span-2">
                                        <label className="text-zinc-500 uppercase font-bold text-[9px]">Transmission</label>
                                        <input 
                                          type="text" 
                                          placeholder="e.g. 7-Speed PDK"
                                          value={editForm.specs?.transmission || ''}
                                          onChange={(e) => setEditForm({
                                            ...editForm,
                                            specs: { ...editForm.specs, transmission: e.target.value }
                                          })}
                                          className="w-full bg-zinc-950 border border-zinc-900 p-1.5 rounded focus:outline-none text-zinc-200"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Image Showcase Manager */}
                                <div className="space-y-2 pt-1">
                                  <label className="text-[10px] text-zinc-500 font-bold uppercase block">Upload Car Images</label>
                                  <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer text-center relative"
                                  >
                                    <input 
                                      type="file"
                                      ref={fileInputRef}
                                      multiple
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleFileChange(e, m.id)}
                                    />
                                    {uploading ? (
                                      <div className="flex flex-col items-center gap-1.5">
                                        <Loader2 size={16} className="text-emerald-400 animate-spin" />
                                        <span className="text-[10px] font-medium text-zinc-400 animate-pulse">Processing HEIC/Compresing...</span>
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <Upload size={16} className="text-zinc-400 mx-auto" />
                                        <div className="text-[11px] font-bold text-zinc-200">Select or Drag Car Photos</div>
                                        <div className="text-[9px] text-zinc-500">Auto-converts HEIC format to compressed JPEG</div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Current Car Photos grid */}
                                  {m.imageUrls && m.imageUrls.length > 0 && (
                                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                                      {m.imageUrls.map((url: string, imgIdx: number) => (
                                        <div key={imgIdx} className="aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 relative group">
                                          <img 
                                            src={url} 
                                            alt={`Giveaway car preview`} 
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover" 
                                          />
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteImage(m.id, url);
                                            }}
                                            className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Save/Cancel details */}
                                <div className="flex gap-2 pt-2 border-t border-zinc-900">
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="flex-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-bold py-2 rounded-lg text-xs transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveDetails(m.id)}
                                    disabled={savingDetails}
                                    className="flex-1 bg-white hover:bg-zinc-200 text-zinc-950 font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                                  >
                                    {savingDetails ? (
                                      <Loader2 size={12} className="animate-spin text-zinc-950" />
                                    ) : (
                                      <CheckCircle size={12} className="text-zinc-950" />
                                    )}
                                    Save Config
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. ENTRIES EXPORT TAB */}
                {activeTab === 'entries_export' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                        <Download size={16} className="text-emerald-400" />
                        Giveaways Entries Exporter
                      </h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Query, verify, and download user giveaway and sweepstakes registrations from Firestore. Export in standard CSV format for drawings.
                      </p>
                    </div>

                    {/* Consolidated Export Button */}
                    <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs text-zinc-400 font-semibold uppercase block">All Consolidated Entries</span>
                          <span className="text-[11px] text-zinc-500">Includes all registered tickets across all milestones</span>
                        </div>
                        <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-900 text-center min-w-[70px]">
                          <span className="text-[10px] text-zinc-500 block uppercase font-mono">Live Count</span>
                          <span className="text-sm font-bold font-mono text-emerald-400">
                            {entriesCount !== null ? entriesCount.toLocaleString() : '...'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleDownloadAllEntries}
                        disabled={downloadingAll}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/25 text-zinc-950 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/20"
                      >
                        {downloadingAll ? (
                          <>
                            <Loader2 size={14} className="animate-spin text-zinc-950" />
                            <span>Exporting Database...</span>
                          </>
                        ) : (
                          <>
                            <Download size={14} className="text-zinc-950" />
                            <span>Download All Entries (CSV)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Individual Giveaway Exporter */}
                    <div className="space-y-3">
                      <span className="text-xs text-zinc-400 font-semibold uppercase block px-1">Export by Milestone Target</span>
                      
                      <div className="space-y-2">
                        {milestones.map((m) => {
                          const isDownloadingThis = downloadingSpecific === m.id;
                          return (
                            <div key={m.id} className="bg-zinc-900/20 border border-zinc-900/60 p-3.5 rounded-xl flex items-center justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono text-zinc-500">Target: {m.target.toLocaleString()}</span>
                                  <span className="bg-zinc-800 text-zinc-400 text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wider font-mono">
                                    {m.type}
                                  </span>
                                </div>
                                <h5 className="font-bold text-xs text-zinc-200 mt-1 truncate">{m.reward}</h5>
                              </div>

                              <button
                                onClick={() => handleDownloadGiveawayEntries(m.id, m.reward)}
                                disabled={isDownloadingThis || downloadingAll}
                                className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-900/40 text-zinc-300 hover:text-white font-mono text-[10px] font-bold py-2 px-3 rounded-lg border border-zinc-800/80 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                              >
                                {isDownloadingThis ? (
                                  <Loader2 size={12} className="animate-spin text-zinc-400" />
                                ) : (
                                  <Download size={12} />
                                )}
                                <span>CSV</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SCHEMA DESIGN TAB */}
                {activeTab === 'schema_draft' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                        <Database size={16} className="text-zinc-400" />
                        Firestore Schema Blueprint
                      </h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Design and inspect the Firestore architecture for giveaways before committing to live database schema files.
                      </p>
                    </div>

                    {/* Proposed Collections Grid */}
                    <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-900 pb-2">
                        <Code size={14} className="text-emerald-400" />
                        <span>Proposed Collections</span>
                      </div>

                      <div className="space-y-2">
                        <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 text-xs">
                          <span className="font-mono text-emerald-400 font-bold block">/giveaways</span>
                          <span className="text-zinc-400 block mt-1">Tracks milestone definitions, current progress, rewards, target counts, and statuses.</span>
                          <pre className="text-[10px] font-mono text-zinc-500 bg-zinc-900/40 p-2 rounded mt-2 overflow-x-auto border border-zinc-900/60 leading-relaxed">
{`{
  id: "milestone_10k",
  targetCount: 10000,
  reward: "£50 Giftcard",
  status: "active", // active, unlocked, completed
  totalParticipants: 4850,
  createdAt: 1785239511
}`}
                          </pre>
                        </div>

                        <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 text-xs">
                          <span className="font-mono text-emerald-400 font-bold block">/giveaway_entries</span>
                          <span className="text-zinc-400 block mt-1">Tracks which user has entered which milestone giveaway, for drawing random winners.</span>
                          <pre className="text-[10px] font-mono text-zinc-500 bg-zinc-900/40 p-2 rounded mt-2 overflow-x-auto border border-zinc-900/60 leading-relaxed">
{`{
  id: "uid_giveawayId",
  userId: "user_abc123",
  giveawayId: "milestone_10k",
  joinedAt: 1785241021,
  username: "race_enthusiast"
}`}
                          </pre>
                        </div>
                      </div>
                    </div>

                    {/* Security Rules Draft */}
                    <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-900 pb-2">
                        <Shield size={14} className="text-amber-400" />
                        <span>Planned Security Rules</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Ensures regular users can only read giveaways and write their own participation docs, while only Tony can modify giveaway configs.
                      </p>
                      <pre className="text-[10px] font-mono text-amber-500/90 bg-zinc-950 p-3 rounded-lg border border-zinc-900 overflow-x-auto leading-relaxed">
{`match /giveaways/{id} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.email == 'tonyang11552883@gmail.com';
}
match /giveaway_entries/{id} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
}`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="p-4 bg-zinc-900/40 border-t border-zinc-900 text-center text-[10px] text-zinc-500">
                <span>Brainstorm Mode Active • RevitUp Lab Environment v2.4</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
