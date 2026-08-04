import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { 
  X, Gift, Lock, Unlock, CheckCircle2, ChevronLeft, ChevronRight, 
  Gauge, Zap, Star, Share2, Copy, Check, Users, Trophy, ShieldCheck, 
  Car as CarIcon, FileText, AlertTriangle, UserCheck, ChevronDown, ChevronUp, Scale, Info
} from 'lucide-react';

interface GiveawaysModalProps {
  onClose: () => void;
}

export function GiveawaysModal({ onClose }: GiveawaysModalProps) {
  const { user, profile, simulatedUserCount } = useAuth();
  
  const [giveaways, setGiveaways] = useState<any[]>([]);
  const [entries, setEntries] = useState<string[]>([]); // holds giveawayIds joined
  const [currentImageIndices, setCurrentImageIndices] = useState<Record<string, number>>({});
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showOfficialRules, setShowOfficialRules] = useState(false);

  // Real-time task checklist states
  const [hasCar, setHasCar] = useState(false);
  const [hasPosted, setHasPosted] = useState(false);

  // Default fallback milestones matching specification
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
      status: 'active'
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
      status: 'locked'
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
      status: 'locked'
    }
  ];

  // Subscribe to real-time Giveaway configurations from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'giveaways'), (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Normalise legacy / spec properties to guarantee matching accessors
            target: data.targetCount || data.target || 10000,
            targetCount: data.targetCount || data.target || 10000,
            reward: data.prizeName || data.reward || '',
            prizeName: data.prizeName || data.reward || '',
            imageUrls: data.imageUrls || (data.prizeImage ? [data.prizeImage] : [])
          };
        });
        list.sort((a: any, b: any) => a.target - b.target);
        setGiveaways(list);
      }
    });
    return unsubscribe;
  }, []);

  // Subscribe to user's registered entries in real-time
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'giveaway_entries'), (snapshot) => {
      const userJoinedIds: string[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.userId === user.uid) {
          userJoinedIds.push(data.giveawayId);
        }
      });
      setEntries(userJoinedIds);
    });
    return unsubscribe;
  }, [user]);

  // Subscribe to user's garage count in real-time
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'garage'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasCar(!snapshot.empty);
    }, (err) => {
      console.warn("Garage observer error:", err);
    });
    return unsubscribe;
  }, [user]);

  // Subscribe to user's posts count in real-time
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'posts'), where('authorId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasPosted(!snapshot.empty);
    }, (err) => {
      console.warn("Posts observer error:", err);
    });
    return unsubscribe;
  }, [user]);

  // Task states & total eligibility
  const isAccountVerified = !!(user?.emailVerified || profile?.isVerified);
  const isEligible = isAccountVerified && hasCar && hasPosted;

  const milestones = giveaways.length > 0 ? giveaways : defaultMilestones;

  // Active referrals count
  const referralsCount = profile?.referralsCount || 0;
  const totalTickets = 1 + referralsCount; // 1 base ticket + 1 per referral

  // Compute next target threshold
  const nextMilestone = milestones.find(m => simulatedUserCount < m.target) || milestones[milestones.length - 1];
  const nextTarget = nextMilestone ? nextMilestone.target : 10000;
  const overallProgressPercent = Math.min(Math.round((simulatedUserCount / nextTarget) * 1000) / 10, 100);

  // Handle manual instant profile verification
  const handleVerifyAccount = async () => {
    if (!user) return;
    setIsVerifying(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isVerified: true
      });
    } catch (e) {
      console.error("Failed to verify user profile:", e);
    } finally {
      setIsVerifying(false);
    }
  };

  // Close and navigate to Garage on profile
  const handleNavigateToGarage = () => {
    if (!user) return;
    window.dispatchEvent(new CustomEvent('navigate-profile', { 
      detail: { userId: user.uid, initialTab: 'garage' } 
    }));
    onClose();
  };

  // Close and navigate to Upload View
  const handleNavigateToUpload = () => {
    window.dispatchEvent(new CustomEvent('navigate-view', { 
      detail: { view: 'upload' } 
    }));
    onClose();
  };

  // Handle joining a sweepstake and claims
  const handleJoinSweepstake = async (giveawayId: string) => {
    if (!user || !isEligible) return;
    setJoiningId(giveawayId);

    try {
      const entryId = `${user.uid}_${giveawayId}`;
      const username = profile?.username || user.displayName || user.email?.split('@')[0] || 'Enthusiast';
      
      // 1. Save entry to central /giveaway_entries/{userId_giveawayId} collection
      await setDoc(doc(db, 'giveaway_entries', entryId), {
        id: entryId,
        userId: user.uid,
        giveawayId: giveawayId,
        username: username,
        joinedAt: Date.now()
      });

      // 2. Save nested ticket into /giveaways/{giveawayId}/tickets/{userId} according to DB architecture
      const ticketRef = doc(db, 'giveaways', giveawayId, 'tickets', user.uid);
      await setDoc(ticketRef, {
        userId: user.uid,
        username: username,
        enteredAt: Date.now(),
        referralBonusCount: referralsCount
      });

    } catch (e) {
      console.error("Failed to register sweepstakes ticket:", e);
    } finally {
      setJoiningId(null);
    }
  };

  // Gallery slider control helpers
  const handlePrevImage = (id: string, max: number) => {
    setCurrentImageIndices(prev => {
      const current = prev[id] || 0;
      return { ...prev, [id]: current === 0 ? max - 1 : current - 1 };
    });
  };

  const handleNextImage = (id: string, max: number) => {
    setCurrentImageIndices(prev => {
      const current = prev[id] || 0;
      return { ...prev, [id]: current === max - 1 ? 0 : current + 1 };
    });
  };

  // Referral Link Copy helper
  const handleCopyLink = () => {
    if (!user) return;
    const referralLink = `${window.location.origin}/?ref=${user.uid}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl shadow-black/80 text-white"
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/25 text-amber-400">
              <Gift size={20} className="animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-black italic tracking-tighter text-white uppercase">Milestone Sweepstakes</h3>
              <p className="text-[10px] text-zinc-500 font-mono">LIVE COMMUNITY PROGRESS REWARDS</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-zinc-900 hover:bg-zinc-850 rounded-lg transition-colors text-zinc-400 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Progress Section */}
          <div className="bg-gradient-to-br from-zinc-900/40 to-black/60 border border-zinc-900/80 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-zinc-500">Live Community Progress</span>
                <h4 className="text-sm font-black text-zinc-200">RevitUp Active Users</h4>
              </div>
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-black text-sm rounded-lg shadow-inner">
                {simulatedUserCount.toLocaleString()}
              </div>
            </div>

            {/* Custom elegant global progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-400 font-bold">Progress to Next Milestone</span>
                <span className="text-amber-400 font-black">{overallProgressPercent}%</span>
              </div>
              <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden p-0.5 border border-zinc-900 relative">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-1000 ease-out"
                  style={{ width: `${overallProgressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-zinc-500 uppercase">
                <span>{simulatedUserCount.toLocaleString()} Users</span>
                <span>Next Milestone: {nextTarget.toLocaleString()} Users</span>
              </div>
            </div>
          </div>

          {/* Interactive Referral odds Booster Card */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-5 rounded-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Star size={14} className="fill-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider">Odds Multiplier Engine</span>
                </div>
                <h4 className="text-sm font-black text-white leading-tight">Booster Ticket referral system</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-normal">
                  Each user who registers via your link earns you <span className="text-amber-400 font-bold">+1 Referral Ticket</span>, increasing your odds directly in the draw!
                </p>
              </div>
              <div className="px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-center min-w-[70px]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Your Tickets</div>
                <div className="text-base font-black text-white font-mono">{totalTickets}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-black/40 p-2.5 rounded-xl border border-zinc-900">
              <div className="flex flex-col">
                <span className="text-zinc-500 uppercase text-[8px]">Base Entry Ticket</span>
                <span className="text-zinc-300 font-bold">1 Ticket</span>
              </div>
              <div className="flex flex-col border-l border-zinc-900 pl-3">
                <span className="text-zinc-500 uppercase text-[8px]">Bonus Invites Ticket</span>
                <span className="text-amber-400 font-bold">+{referralsCount} Tickets</span>
              </div>
            </div>

            {/* Referral Link Copy Section */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono uppercase text-zinc-500">Your Share Link</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-black border border-zinc-900 px-3 py-2 rounded-xl text-xs font-mono text-zinc-400 truncate select-all">
                  {user ? `${window.location.origin}/?ref=${user.uid}` : 'Sign in to get referral link'}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 bg-white text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer flex items-center justify-center gap-1 min-w-[90px]"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">Your Entry Status</h4>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              To keep giveaways bot-resistant and ensure maximum community engagement, complete these 3 platform tasks to unlock ticket claims:
            </p>

            <div className="space-y-3 pt-1">
              
              {/* Task 1: Account Verified */}
              <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-zinc-900 text-xs">
                <div className="flex items-center gap-2.5">
                  {isAccountVerified ? (
                    <CheckCircle2 size={16} className="text-emerald-400 fill-emerald-950/40" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-500" />
                  )}
                  <span className={`font-bold ${isAccountVerified ? 'text-zinc-200' : 'text-zinc-400'}`}>Account Verified</span>
                </div>
                {isAccountVerified ? (
                  <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold">Completed</span>
                ) : (
                  <button 
                    onClick={handleVerifyAccount}
                    disabled={isVerifying}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-black text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Now'}
                  </button>
                )}
              </div>

              {/* Task 2: Car in Garage */}
              <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-zinc-900 text-xs">
                <div className="flex items-center gap-2.5">
                  {hasCar ? (
                    <CheckCircle2 size={16} className="text-emerald-400 fill-emerald-950/40" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-500" />
                  )}
                  <span className={`font-bold ${hasCar ? 'text-zinc-200' : 'text-zinc-400'}`}>Add Car to Garage</span>
                </div>
                {hasCar ? (
                  <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1">
                    <CarIcon size={10} />
                    <span>Added</span>
                  </span>
                ) : (
                  <button 
                    onClick={handleNavigateToGarage}
                    className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-zinc-950 font-mono font-black text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    + Add Car
                  </button>
                )}
              </div>

              {/* Task 3: Post on Feed */}
              <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-zinc-900 text-xs">
                <div className="flex items-center gap-2.5">
                  {hasPosted ? (
                    <CheckCircle2 size={16} className="text-emerald-400 fill-emerald-950/40" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-500" />
                  )}
                  <span className={`font-bold ${hasPosted ? 'text-zinc-200' : 'text-zinc-400'}`}>Posted Build Update</span>
                </div>
                {hasPosted ? (
                  <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1">
                    <FileText size={10} />
                    <span>Posted</span>
                  </span>
                ) : (
                  <button 
                    onClick={handleNavigateToUpload}
                    className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-zinc-950 font-mono font-black text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Post Now
                  </button>
                )}
              </div>

            </div>

            {isEligible ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-[11px] font-semibold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={14} className="flex-shrink-0 animate-pulse" />
                <span>Eligibility Status Approved! You can now claim sweepstakes tickets.</span>
              </div>
            ) : (
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-[10px] font-medium text-red-400 flex items-start gap-2 leading-relaxed">
                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                <span>Please complete all 3 items to authorize entry ticket claims. Locked milestones will unlock once completed.</span>
              </div>
            )}
          </div>

          {/* Giveaway List */}
          <div className="space-y-5">
            {milestones.map((m) => {
              const isUnlocked = simulatedUserCount >= m.target;
              const hasJoined = entries.includes(m.id);
              const isVehicle = m.type === 'Vehicle Sweepstakes';
              const images = m.imageUrls || [];
              const activeImgIdx = currentImageIndices[m.id] || 0;

              return (
                <div 
                  key={m.id} 
                  className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                    isUnlocked 
                      ? 'bg-zinc-900/20 border-zinc-800' 
                      : 'bg-zinc-950/40 border-zinc-900/60 opacity-80'
                  }`}
                >
                  
                  {/* Status Banner */}
                  <div className={`px-4 py-1.5 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest ${
                    isUnlocked 
                      ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/5' 
                      : 'bg-zinc-950/60 text-zinc-500 border-b border-zinc-900/30'
                  }`}>
                    <span>Target: {m.target.toLocaleString()} users</span>
                    <span className="flex items-center gap-1">
                      {isUnlocked ? (
                        <>
                          <Unlock size={10} className="text-emerald-400 animate-pulse" />
                          <span className="text-emerald-400 font-black">UNLOCKED / OPEN</span>
                        </>
                      ) : (
                        <>
                          <Lock size={10} className="text-zinc-500" />
                          <span>LOCKED</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            isVehicle ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {m.type}
                          </span>
                        </div>
                        <h5 className="text-base font-black tracking-tight text-white">{m.reward}</h5>
                        <p className="text-xs text-zinc-400 leading-relaxed font-normal">{m.description}</p>
                      </div>
                    </div>

                    {/* VEHICLE SHOWCASE INTERACTIVE MEDIA */}
                    {isVehicle && images.length > 0 && (
                      <div className="space-y-3 pt-1">
                        
                        {/* Swipeable Image Gallery */}
                        <div className="aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 relative group">
                          <img 
                            src={images[activeImgIdx]} 
                            alt={`${m.reward} dynamic showcase`} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 hover:scale-105"
                          />
                          
                          {/* Navigation Buttons */}
                          {images.length > 1 && (
                            <>
                              <button
                                onClick={() => handlePrevImage(m.id, images.length)}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full border border-zinc-800 transition-colors cursor-pointer"
                              >
                                <ChevronLeft size={14} />
                              </button>
                              <button
                                onClick={() => handleNextImage(m.id, images.length)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full border border-zinc-800 transition-colors cursor-pointer"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </>
                          )}

                          {/* Image indicator count */}
                          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-black/70 rounded text-[9px] font-mono text-zinc-400 border border-zinc-800/50">
                            {activeImgIdx + 1} / {images.length}
                          </div>
                        </div>

                        {/* Racing Style Technical Spec Sheet Card */}
                        {m.specs && Object.keys(m.specs).length > 0 && (
                          <div className="bg-gradient-to-br from-zinc-900/60 to-black/80 border border-zinc-800/80 p-4 rounded-xl space-y-3.5 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-1">
                              <Star size={10} className="text-amber-500/20" />
                            </div>
                            <div className="flex items-center gap-1.5 border-b border-zinc-800/80 pb-2">
                              <Gauge size={13} className="text-red-400" />
                              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Engine Specs & Mods</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-[11px] font-mono leading-none">
                              {m.specs.make && (
                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-500 uppercase">Brand</span>
                                  <span className="block font-bold text-zinc-200">{m.specs.year} {m.specs.make}</span>
                                </div>
                              )}
                              {m.specs.model && (
                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-500 uppercase">Model</span>
                                  <span className="block font-bold text-red-400">{m.specs.model}</span>
                                </div>
                              )}
                              {m.specs.horsepower && (
                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-500 uppercase">Max Output</span>
                                  <span className="block font-bold text-zinc-200 flex items-center gap-1 text-emerald-400">
                                    <Zap size={10} />
                                    {m.specs.horsepower}
                                  </span>
                                </div>
                              )}
                              {m.specs.zeroToSixty && (
                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-500 uppercase">0-60 MPH</span>
                                  <span className="block font-bold text-zinc-200">{m.specs.zeroToSixty}</span>
                                </div>
                              )}
                              {m.specs.engine && (
                                <div className="space-y-1 col-span-2 border-t border-zinc-900 pt-2">
                                  <span className="text-[9px] text-zinc-500 uppercase block">Powerplant</span>
                                  <span className="block font-bold text-zinc-300 leading-normal mt-0.5">{m.specs.engine}</span>
                                </div>
                              )}
                              {m.specs.transmission && (
                                <div className="space-y-1 col-span-2">
                                  <span className="text-[9px] text-zinc-500 uppercase block">Gearbox</span>
                                  <span className="block font-bold text-zinc-300 leading-normal mt-0.5">{m.specs.transmission}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sweepstakes Join Action */}
                    <div className="pt-2">
                      {hasJoined ? (
                        <div className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 shadow-inner">
                          <CheckCircle2 size={15} />
                          <span>Ticket Claimed for Sweepstake! 🎉</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleJoinSweepstake(m.id)}
                          disabled={!isUnlocked || !isEligible || joiningId === m.id}
                          className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider ${
                            isUnlocked && isEligible
                              ? 'bg-white hover:bg-zinc-200 text-zinc-950 shadow-md active:scale-[0.98]' 
                              : 'bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-800'
                          }`}
                        >
                          {joiningId === m.id ? (
                            <div className="h-4 w-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                          ) : !isEligible ? (
                            <>
                              <Lock size={14} className="text-zinc-500" />
                              <span>Complete Checklist to Claim Entry</span>
                            </>
                          ) : isUnlocked ? (
                            <>
                              <Gift size={14} />
                              <span>Claim My Free Ticket</span>
                            </>
                          ) : (
                            <>
                              <Lock size={14} />
                              <span>Requires {(m.targetCount || m.target).toLocaleString()} users</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Apple & Google Legal Compliance Disclosures Block */}
          <div className="border-t border-zinc-900 pt-5 mt-3 space-y-4">
            <button
              onClick={() => setShowOfficialRules(!showOfficialRules)}
              className="w-full flex items-center justify-between p-3.5 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-900 rounded-xl transition-all text-left text-zinc-300 hover:text-white cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Scale size={14} className="text-amber-400" />
                <span className="text-[11px] font-black uppercase tracking-wider">Official Rules & Legal Disclosures</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                <span>View Guidelines</span>
                {showOfficialRules ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            <AnimatePresence>
              {showOfficialRules && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4 text-[11px] text-zinc-400 leading-relaxed font-normal">
                    
                    {/* Apple Mandatory Sponsor Disclaimer */}
                    <div className="p-3 bg-red-950/20 border border-red-500/10 rounded-lg space-y-1">
                      <div className="flex items-center gap-1.5 text-red-400 font-bold uppercase tracking-wider text-[9px] font-mono">
                        <Info size={11} />
                        <span>Apple App Store Review Disclaimer</span>
                      </div>
                      <p className="text-zinc-400 text-[10.5px]">
                        <strong>Mandatory Review Statement:</strong> Apple Inc. is <strong>NOT</strong> a sponsor of, nor is it involved or associated in any way with, any contest, sweepstake, prize draw, or giveaway hosted on the RevitUp application. All prizes, rewards, and milestone draws are sponsored and fulfilled solely by RevitUp.
                      </p>
                    </div>

                    {/* Google & General Sweepstakes Rules */}
                    <div className="space-y-3">
                      <div>
                        <h6 className="font-bold text-zinc-200 uppercase tracking-wide text-[10px] font-mono">1. Free Alternative Method of Entry (AMOE)</h6>
                        <p className="mt-0.5">
                          Entry into any milestone sweepstake is 100% free and open to all registered RevitUp users who complete the basic free engagement tasks (Verifying account, adding 1 car to their garage, posting 1 feed update). There is absolutely <strong>no purchase necessary</strong> to participate, and making a purchase, upgrade, or donation does not increase your odds of winning.
                        </p>
                      </div>

                      <div>
                        <h6 className="font-bold text-zinc-200 uppercase tracking-wide text-[10px] font-mono">2. UK Legal Compliance & Licensing</h6>
                        <p className="mt-0.5">
                          In compliance with the UK Gambling Act 2005 and UK Gambling Commission guidelines, these milestone promotions are operated as a **Free Prize Draw**. Since entry is completely free of charge and does not require any payment to enter or claim, they do not constitute lotteries or gambling under UK law and completely bypass licensing requirements.
                        </p>
                      </div>

                      <div>
                        <h6 className="font-bold text-zinc-200 uppercase tracking-wide text-[10px] font-mono">3. Prize Details & Cash Values</h6>
                        <p className="mt-0.5">
                          Prizes are unlocked dynamically upon hitting specified global RevitUp platform user thresholds:
                        </p>
                        <ul className="list-disc pl-4 mt-1 space-y-1 font-mono text-[10px] text-zinc-300">
                          <li><strong>10,000 Users:</strong> £50 Gift Card. Distributed to 5 newly joined active users (Est. value £50).</li>
                          <li><strong>100,000 Users:</strong> £1,000 Cash Prize. Distributed to 1 lucky active enthusiast (Est. value £1,000).</li>
                          <li><strong>1,000,000 Users:</strong> Performance Car Sweepstake. No cash alternative unless legally required.</li>
                        </ul>
                      </div>

                      <div>
                        <h6 className="font-bold text-zinc-200 uppercase tracking-wide text-[10px] font-mono">4. Winner Selection & Eligibility</h6>
                        <p className="mt-0.5">
                          Winners are drawn live on stream and chosen via a verifiable randomizing algorithm from all qualified ticket holders (including bonus referral booster tickets). Participants must be at least 18 years of age and hold a valid, verified profile on RevitUp. Void where prohibited by law.
                        </p>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
