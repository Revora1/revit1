import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, getCountFromServer, setDoc, onSnapshot, query, where } from 'firebase/firestore';
import { Gift, Copy, CheckCircle2, ChevronLeft, Users, Trophy, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { ErrorBoundary } from './ErrorBoundary';
import { Share } from '@capacitor/share';
import { getBaseUrl } from '../lib/utils';

interface GiveawaysViewProps {
  onBack: () => void;
}

export function GiveawaysView({ onBack }: GiveawaysViewProps) {
  const { user } = useAuth();
  const [totalUsers, setTotalUsers] = useState(0);
  const [myReferrals, setMyReferrals] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasCar, setHasCar] = useState(false);
  const [hasPost, setHasPost] = useState(false);
  const [showTC, setShowTC] = useState(false);
  
  const [milestones, setMilestones] = useState<any[]>([
    { target: 10000, prize: '£50 Giftcard' },
    { target: 100000, prize: '£1000 Cash' },
    { target: 1000000, prize: 'A Brand New Car' },
  ]);

  useEffect(() => {
    let unsubscribe: () => void;
    const loadData = async () => {
      try {
        // Exact number of registered users via getCountFromServer
        const usersSnap = await getCountFromServer(collection(db, 'users'));
        setTotalUsers(usersSnap.data().count);
        
        const configDoc = await getDoc(doc(db, 'giveaways', 'config'));
        if (configDoc.exists()) {
          const configData = configDoc.data();
          if (configData.milestones && Array.isArray(configData.milestones)) {
            setMilestones(configData.milestones);
          }
        }
        
        if (user) {
          const uDoc = await getDoc(doc(db, 'users', user.uid));
          if (uDoc.exists()) {
            setMyReferrals(uDoc.data().referralsCount || 0);
          }
          
          const qGarage = query(collection(db, 'garage'), where('ownerId', '==', user.uid));
          const snapGarage = await getCountFromServer(qGarage);
          setHasCar(snapGarage.data().count > 0);

          const qPost = query(collection(db, 'posts'), where('authorId', '==', user.uid));
          const snapPost = await getCountFromServer(qPost);
          setHasPost(snapPost.data().count > 0);
        }
      } catch (e) {
        console.error("Error loading giveaways:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const currentMilestoneIndex = milestones.findIndex(m => totalUsers < m.target);
  const activeMilestoneIndex = currentMilestoneIndex === -1 ? milestones.length - 1 : currentMilestoneIndex;
  const activeMilestone = milestones[activeMilestoneIndex];

  const handleShare = async () => {
    if (!user) return;
    const shareUrl = `${getBaseUrl()}/?ref=${user.uid}`;
    
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: 'Join me on RevItUp',
          text: "I'm on RevItUp! Join me and let's unlock the community milestone giveaways.",
          url: shareUrl,
          dialogTitle: 'Share with buddies',
        });
      } catch (err) {
        console.error("Error sharing via Capacitor:", err);
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on RevItUp',
          text: "I'm on RevItUp! Join me and let's unlock the community milestone giveaways.",
          url: shareUrl
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      const shareText = `I'm on RevItUp! Join me and let's unlock the community milestone giveaways.\n\n${shareUrl}`;
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onBack}
      />
      
      {/* Drawer */}
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative bg-zinc-950 w-full h-[90vh] rounded-t-3xl border-t border-zinc-800 flex flex-col overflow-hidden text-white font-sans shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-black sticky top-0 z-10">
          <button onClick={onBack} className="p-2 -ml-2 text-white hover:bg-zinc-900 rounded-full transition-colors active:scale-95">
            <X size={24} />
          </button>
          <h1 className="text-xl font-black italic tracking-tight uppercase flex items-center gap-2">
            <Gift size={20} className="text-amber-500" /> Milestones
          </h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <ErrorBoundary>
            <div className="space-y-6">
          
          <div className="text-center space-y-2 py-4">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">Community Rev</h2>
            <p className="text-zinc-400 text-sm max-w-xs mx-auto">
              Unlock premium giveaways when the community reaches active user milestones!
            </p>
          </div>

          {/* Live Community Progress Tracker */}
          <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Users size={64} />
            </div>
            <div className="relative z-10">
              <div className="flex items-end gap-2 mb-4">
                <div className="text-4xl font-black text-white tracking-tighter">
                  {totalUsers.toLocaleString()}
                </div>
                <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest pb-1">
                  / {activeMilestone.target.toLocaleString()} Users
                </div>
              </div>

              {(() => {
                const prevTarget = activeMilestoneIndex === 0 ? 0 : milestones[activeMilestoneIndex - 1].target;
                const progress = Math.min(100, Math.max(0, ((totalUsers - prevTarget) / (activeMilestone.target - prevTarget)) * 100));
                
                return (
                  <div className="h-3 bg-black rounded-full overflow-hidden border border-white/10 shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `\${progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 rounded-full relative"
                    >
                      <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ animation: 'shimmer 2s infinite linear', backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                    </motion.div>
                  </div>
                )
              })()}
              
              <div className="text-xs font-bold text-amber-500 uppercase tracking-widest mt-3 flex justify-between">
                <span>Active Target</span>
                <span>{activeMilestone.prize}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {milestones.map((m, idx) => {
              const isPassed = totalUsers >= m.target;
              const isCurrent = idx === currentMilestoneIndex;
              const isLocked = !isPassed && !isCurrent;
              
              return (
                <div 
                  key={m.target} 
                  className={`relative overflow-hidden rounded-2xl border \${
                    isCurrent 
                      ? 'bg-zinc-900 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20' 
                      : isPassed 
                        ? 'bg-zinc-900/50 border-green-500/30' 
                        : 'bg-black border-zinc-800 opacity-60'
                  }`}
                >
                  <div className="p-5 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full \${
                          isCurrent ? 'bg-amber-500/20 text-amber-500' : isPassed ? 'bg-green-500/20 text-green-500' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {isPassed ? 'Unlocked' : isCurrent ? 'Active Goal' : 'Locked'}
                        </span>
                        <h3 className="text-lg font-black italic uppercase mt-3">{m.prize}</h3>
                        <p className="text-sm font-bold text-zinc-400 mt-1">{m.target.toLocaleString()} Users Target</p>
                        
                        {m.winnerUsername && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-500 text-xs font-bold">
                            <Trophy size={12} /> Winner: {m.winnerUsername}
                          </div>
                        )}
                      </div>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center \${
                          isCurrent ? 'bg-amber-500/10 text-amber-500' : isPassed ? 'bg-green-500/10 text-green-500' : 'bg-zinc-900 text-zinc-600'
                      }`}>
                        {isPassed ? <CheckCircle2 size={24} /> : <Gift size={24} />}
                      </div>
                    </div>

                    {(m.image || m.carMake || m.carModel) && (
                      <div className={`mt-4 rounded-xl overflow-hidden border \${isCurrent ? 'border-amber-500/20' : 'border-zinc-800'} bg-black`}>
                        {m.image && (
                          <div className="relative">
                            <img src={m.image} alt={m.prize} className={`w-full h-40 object-cover \${isLocked ? 'grayscale opacity-50' : ''}`} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end p-4">
                              {/* Car Details if available over image */}
                            </div>
                          </div>
                        )}
                        
                        {(m.carMake || m.carModel) && (
                          <div className="p-4 grid grid-cols-2 gap-3 text-xs bg-zinc-900">
                            {m.carMake && (
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Make</span>
                                <span className="text-zinc-200 font-medium text-sm">{m.carMake}</span>
                              </div>
                            )}
                            {m.carModel && (
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Model</span>
                                <span className="text-zinc-200 font-medium text-sm">{m.carModel}</span>
                              </div>
                            )}
                            {m.carYear && (
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Year</span>
                                <span className="text-zinc-200 font-medium text-sm">{m.carYear}</span>
                              </div>
                            )}
                            {m.carPower && (
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Power</span>
                                <span className="text-zinc-200 font-medium text-sm">{m.carPower}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Glowing Effect for Active */}
                  {isCurrent && (
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={20} className="text-amber-500" />
              <h3 className="font-black text-xl italic uppercase">Entry Status</h3>
            </div>
            <p className="text-zinc-400 text-xs mb-4">Complete these steps to unlock your raffle ticket.</p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {user?.emailVerified || user ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                <span className={`text-sm font-bold uppercase tracking-wide \${user?.emailVerified || user ? 'text-white' : 'text-zinc-500'}`}>Account Verified</span>
              </div>
              <div className="flex items-center gap-3">
                {hasCar ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                <span className={`text-sm font-bold uppercase tracking-wide \${hasCar ? 'text-white' : 'text-zinc-500'}`}>Add 1+ Car to Garage</span>
              </div>
              <div className="flex items-center gap-3">
                {hasPost ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                <span className={`text-sm font-bold uppercase tracking-wide \${hasPost ? 'text-white' : 'text-zinc-500'}`}>Post a Build Update</span>
              </div>
            </div>
            
            <div className={`mt-4 pt-4 border-t border-zinc-800 text-center font-black italic uppercase tracking-widest \${(user?.emailVerified || user) && hasCar && hasPost ? 'text-green-500' : 'text-zinc-500'}`}>
              {(user?.emailVerified || user) && hasCar && hasPost ? 'TICKET UNLOCKED' : 'TICKET LOCKED'}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-amber-500">
              <Trophy size={24} />
            </div>
            <div>
              <h3 className="font-black text-xl italic uppercase">Your Entry Boosts</h3>
              <p className="text-zinc-400 text-xs mt-1">Boost your chances to win the active raffle</p>
            </div>
            
            <div className="py-4 border-y border-zinc-800">
              <div className="text-4xl font-black text-amber-500">{myReferrals}</div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Confirmed Referrals</div>
            </div>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              For every friend that joins RevItUp using your link, you get an extra entry into the unlocked prize draws!
            </p>
            <button
              onClick={handleShare}
              className="w-full bg-white text-black py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              {copied ? 'Link Copied!' : 'Invite Friends to Boost'}
            </button>
          </div>

          <div className="text-[9px] text-zinc-500 space-y-2 pt-6 pb-2 px-2 text-center uppercase tracking-wider leading-relaxed border-t border-zinc-900 mt-6">
            <p>
              <strong className="text-zinc-400">Disclaimer:</strong> Apple Inc. and Google LLC are NOT sponsors of, nor are they involved in any way with, this giveaway or sweepstakes.
            </p>
            <p>
              No purchase necessary to enter or win. This is a free prize draw complying with UK Gambling Commission guidelines. 
              Winners are selected at random from eligible unlocked tickets once a community milestone is reached.
            </p>
            <p>
              Prize values are as stated in the milestone targets. See full <button onClick={() => setShowTC(true)} className="underline font-bold text-amber-500">Terms & Conditions</button> for official rules and eligibility.
            </p>
          </div>
            </div>
          </ErrorBoundary>
        </div>

        {/* T&C Modal */}
        <AnimatePresence>
          {showTC && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowTC(false)} />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
              >
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                  <h2 className="text-lg font-black italic uppercase">Terms & Conditions</h2>
                  <button onClick={() => setShowTC(false)} className="p-1 hover:bg-zinc-800 rounded-full">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto text-xs text-zinc-400 space-y-4">
                  <p>
                    <strong className="text-white block mb-1">1. Eligibility</strong>
                    The RevItUp Giveaway is open to all registered users of the RevItUp application. No purchase is necessary. 
                    Users must have a verified account, at least 1 car in their garage, and 1 build update posted to qualify for an entry ticket.
                  </p>
                  <p>
                    <strong className="text-white block mb-1">2. Non-Affiliation</strong>
                    Apple Inc. and Google LLC are NOT sponsors of, nor are they involved in any way with, this giveaway or sweepstakes.
                  </p>
                  <p>
                    <strong className="text-white block mb-1">3. How to Enter</strong>
                    Users automatically receive an entry upon meeting the eligibility requirements. Additional entries ("referral bonuses") 
                    can be earned by referring new users who successfully register using the referring user's unique link.
                  </p>
                  <p>
                    <strong className="text-white block mb-1">4. Winner Selection</strong>
                    Winners will be selected randomly from all eligible unlocked tickets once the specified community milestone targets are met. 
                    The draw will be conducted transparently and winners will be contacted via the email associated with their RevItUp account.
                  </p>
                  <p>
                    <strong className="text-white block mb-1">5. General Conditions</strong>
                    RevItUp reserves the right to cancel, suspend, and/or modify the Giveaway if any fraud, technical failures, or any other factor 
                    beyond reasonable control impairs the integrity or proper functioning of the Giveaway.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
