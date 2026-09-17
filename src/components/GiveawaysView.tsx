import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, getCountFromServer, setDoc, onSnapshot, query, where, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { Gift, Copy, CheckCircle2, ChevronLeft, Users, Trophy, ShieldCheck, X, Film, PlayCircle, Loader2, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { ErrorBoundary } from './ErrorBoundary';
import { Share } from '@capacitor/share';
import { getBaseUrl, shareContent, formatDrawDate, getDrawCountdown } from '../lib/utils';
import { GiveawayMilestone } from '../types';

interface GiveawaysViewProps {
  onBack: () => void;
}

export function GiveawaysView({ onBack }: GiveawaysViewProps) {
  const { user, profile } = useAuth();
  const [totalUsers, setTotalUsers] = useState(0);
  const [myReferrals, setMyReferrals] = useState(0);
  const [scrolledFeedCount, setScrolledFeedCount] = useState(0);
  const [isLifetimeQualified, setIsLifetimeQualified] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasCar, setHasCar] = useState(false);
  const [hasPost, setHasPost] = useState(false);
  const [showTC, setShowTC] = useState(false);
  const [enteredGiveaways, setEnteredGiveaways] = useState<number[]>([]);
  const [enteringGiveaway, setEnteringGiveaway] = useState<number | null>(null);
  const [selectedGiveaway, setSelectedGiveaway] = useState<GiveawayMilestone | null>(null);
  const [adLoading, setAdLoading] = useState(false);
  const [adRewardSuccess, setAdRewardSuccess] = useState(false);
  const [adBonusTickets, setAdBonusTickets] = useState(0);
  const [giveawayAdTicketsMap, setGiveawayAdTicketsMap] = useState<Record<string, number>>({});
  const [giveawayAdTimestampsMap, setGiveawayAdTimestampsMap] = useState<Record<string, number[]>>({});
  const [globalAdTimestamps, setGlobalAdTimestamps] = useState<number[]>([]);
  const [watchingTarget, setWatchingTarget] = useState<number | null>(null);
  const [nextDrawDate, setNextDrawDate] = useState<string>('');
  
  const [milestones, setMilestones] = useState<GiveawayMilestone[]>([
    { target: 10000, prize: '£500 CASH', drawDate: '' },
    { target: 100000, prize: '£1000 CASH', drawDate: '' },
    { target: 1000000, prize: 'A CAR', drawDate: '' },
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
          if (configData.nextDrawDate) {
            setNextDrawDate(configData.nextDrawDate);
          }
        }
        
        if (user) {
          let hasLifetime = false;
          let userReferrals = 0;
          let userScrolled = 0;
          const uDoc = await getDoc(doc(db, 'users', user.uid));
          if (uDoc.exists()) {
            const data = uDoc.data();
            userReferrals = data.referralsCount || 0;
            userScrolled = data.scrolledFeedCount || data.feedViewsCount || 0;
            setMyReferrals(userReferrals);
            setEnteredGiveaways(data.enteredGiveaways || []);
            setScrolledFeedCount(userScrolled);
            setAdBonusTickets(data.adBonusTickets || 0);
            setGiveawayAdTicketsMap(data.giveawayAdTickets || {});
            setGiveawayAdTimestampsMap(data.giveawayAdTimestamps || {});
            setGlobalAdTimestamps(data.rewardedAdTimestamps || []);
            if (data.giveawayQualified || (data.enteredGiveaways && data.enteredGiveaways.length > 0)) {
              hasLifetime = true;
              setIsLifetimeQualified(true);
            }
          }
          
          const qGarage = query(collection(db, 'garage'), where('ownerId', '==', user.uid));
          const snapGarage = await getCountFromServer(qGarage);
          const carExists = snapGarage.data().count > 0;
          setHasCar(carExists);

          const qPost = query(collection(db, 'posts'), where('authorId', '==', user.uid));
          const snapPost = await getCountFromServer(qPost);
          const postExists = snapPost.data().count > 0;
          setHasPost(postExists);

          // If requirements are completed for the first time, save lifetime qualification permanently
          if (!hasLifetime && carExists && postExists && userReferrals >= 10 && userScrolled >= 50) {
            setIsLifetimeQualified(true);
            updateDoc(doc(db, 'users', user.uid), { giveawayQualified: true }).catch(() => {});
          }
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
  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const activeTargetKey = String(activeMilestone.target);
  const adTickets = (giveawayAdTicketsMap[activeTargetKey] || 0) + (adBonusTickets || (profile as any)?.adBonusTickets || 0);
  const boostTickets = Math.min(15, (profile as any)?.boostTickets !== undefined ? (profile as any).boostTickets : myReferrals);
  const currentReqsMet = (user?.emailVerified || user) && hasCar && hasPost && myReferrals >= 10 && scrolledFeedCount >= 50;
  const isEligible = isLifetimeQualified || currentReqsMet;
  const baseTicketCount = isLifetimeQualified || isEligible ? 1 : 0;
  const totalMyTickets = baseTicketCount + boostTickets + adTickets;

  const activeRawHistory: number[] = giveawayAdTimestampsMap[activeTargetKey] || globalAdTimestamps || [];
  const activeRecentTimestamps = activeRawHistory.filter((ts: number) => typeof ts === 'number' && (now - ts) < TWENTY_FOUR_HOURS_MS);
  const activeAdsWatchedToday = Math.min(5, activeRecentTimestamps.length);
  const activeAdsLimitReached = activeAdsWatchedToday >= 5;

  const handleWatchRewardedAd = async (specificTarget?: number) => {
    if (!user) {
      alert("Please sign in to earn extra giveaway tickets.");
      return;
    }

    const targetToUse = specificTarget || activeMilestone.target;
    const targetKey = String(targetToUse);
    const rawHistory: number[] = giveawayAdTimestampsMap[targetKey] || globalAdTimestamps || [];
    const currentTime = Date.now();
    const recentTimestamps = rawHistory.filter((ts: number) => typeof ts === 'number' && (currentTime - ts) < TWENTY_FOUR_HOURS_MS);

    if (recentTimestamps.length >= 5) {
      const oldestTs = Math.min(...recentTimestamps);
      const msUntilReset = TWENTY_FOUR_HOURS_MS - (currentTime - oldestTs);
      const hours = Math.floor(msUntilReset / (1000 * 60 * 60));
      const minutes = Math.ceil((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));
      alert(`Daily limit reached (5/5). You can watch up to 5 rewarded ads per 24 hours for this giveaway. Next ad resets in approximately ${hours > 0 ? `${hours}h ` : ''}${minutes}m.`);
      return;
    }

    setWatchingTarget(targetToUse);
    setAdLoading(true);

    // Simulate watching video on web (or native rewarded if Capacitor AdMob available)
    setTimeout(async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const updatedTimestamps = [...recentTimestamps, currentTime];

        await setDoc(userRef, {
          [`giveawayAdTickets.${targetKey}`]: increment(2),
          [`giveawayAdTimestamps.${targetKey}`]: updatedTimestamps,
          rewardedAdTimestamps: updatedTimestamps,
          lastAdRewardAt: currentTime,
        }, { merge: true });

        setGiveawayAdTicketsMap(prev => ({
          ...prev,
          [targetKey]: (prev[targetKey] || 0) + 2,
        }));
        setGiveawayAdTimestampsMap(prev => ({
          ...prev,
          [targetKey]: updatedTimestamps,
        }));
        setGlobalAdTimestamps(updatedTimestamps);

        setAdRewardSuccess(true);
        setTimeout(() => setAdRewardSuccess(false), 5000);
      } catch (e) {
        console.error("Error rewarding ad tickets:", e);
      } finally {
        setAdLoading(false);
        setWatchingTarget(null);
      }
    }, 1500);
  };

  const handleEnterGiveaway = async (target: number) => {
    if (!user) return;
    if (!isEligible) return;

    try {
      setEnteringGiveaway(target);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        enteredGiveaways: arrayUnion(target),
        giveawayQualified: true
      });
      setIsLifetimeQualified(true);
      setEnteredGiveaways(prev => [...prev, target]);
    } catch (e) {
      console.error(e);
    } finally {
      setEnteringGiveaway(null);
    }
  };

  const handleShare = async () => {
    if (!user) return;
    const shareUsername = profile?.username || 'tuner';
    const shareUrl = `https://revitup.today/?ref=${encodeURIComponent(shareUsername)}`;
    
    const success = await shareContent({
      title: 'RevItUp',
      text: '',
      url: shareUrl,
    });
    if (success && !Capacitor.isNativePlatform() && !navigator.share) {
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
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 rounded-full relative"
                    >
                      <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ animation: 'shimmer 2s infinite linear', backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                    </motion.div>
                  </div>
                )
              })()}
              
              <div className="text-xs font-bold text-amber-500 uppercase tracking-widest mt-3 flex justify-between items-center">
                <span>Active Target</span>
                <span>{activeMilestone.prize}</span>
              </div>

              {/* Scheduled Draw Date for active milestone / global */}
              {(activeMilestone.drawDate || nextDrawDate) && (
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Calendar size={14} className="text-amber-500 flex-shrink-0" />
                    <span>Draw Date: <strong className="text-white font-bold">{formatDrawDate(activeMilestone.drawDate || nextDrawDate)}</strong></span>
                  </div>
                  {(() => {
                    const cd = getDrawCountdown(activeMilestone.drawDate || nextDrawDate);
                    if (!cd) return null;
                    return (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        cd.isPast 
                          ? 'bg-zinc-800 text-zinc-400' 
                          : cd.isSoon 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' 
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      }`}>
                        {cd.text}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Milestones List or Detail View */}
          {selectedGiveaway ? (
            <div className="space-y-4">
              <button 
                onClick={() => setSelectedGiveaway(null)}
                className="flex items-center text-zinc-400 mb-4 hover:text-white transition-colors"
              >
                <ChevronLeft size={20} /> Back to all milestones
              </button>
              
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-2xl font-black uppercase italic text-white mb-2">{selectedGiveaway.prize}</h2>
                <p className="text-amber-500 font-bold mb-4">{selectedGiveaway.target.toLocaleString()} Users Target</p>
                
                {selectedGiveaway.image && (
                   <img src={selectedGiveaway.image} alt={selectedGiveaway.prize} className="w-full h-64 object-cover rounded-xl mb-4" />
                )}

                {/* Enter Giveaway Button */}
                <button
                  onClick={() => handleEnterGiveaway(selectedGiveaway.target)}
                  disabled={enteringGiveaway === selectedGiveaway.target || enteredGiveaways.includes(selectedGiveaway.target)}
                  className={`w-full py-4 rounded-xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-transform ${
                    enteredGiveaways.includes(selectedGiveaway.target)
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-amber-500 text-black hover:bg-amber-400 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  }`}
                >
                  {enteredGiveaways.includes(selectedGiveaway.target) ? (
                    <>
                      <CheckCircle2 size={18} /> Entered
                    </>
                  ) : enteringGiveaway === selectedGiveaway.target ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Entering...
                    </>
                  ) : (
                    'Enter Giveaway'
                  )}
                </button>
                
                {/* Rewarded Ad for +2 Tickets */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 mt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-500 flex-shrink-0">
                      <Film size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base italic uppercase text-white">Want More Tickets?</h3>
                        <span className="bg-zinc-800 text-zinc-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">Optional</span>
                      </div>
                      <p className="text-zinc-400 text-xs mt-0.5">Watch a short video ad to claim +2 extra tickets for this draw</p>
                    </div>
                  </div>
                  {(() => {
                      const targetKey = String(selectedGiveaway.target);
                      // Use giveawayAdTimestamps instead of giveawayAdTimestampsMap
                      const adHistory = (giveawayAdTimestampsMap && giveawayAdTimestampsMap[targetKey]) || [];
                      const now = Date.now();
                      const recentAds = adHistory.filter((ts: number) => (now - ts) < (24 * 60 * 60 * 1000));
                      const isLimitReached = recentAds.length >= 5;
                      
                      let resetText = "";
                      if (isLimitReached) {
                          const oldestAd = Math.min(...recentAds);
                          const resetTime = oldestAd + (24 * 60 * 60 * 1000);
                          const remainingMs = resetTime - now;
                          const hours = Math.max(0, Math.floor(remainingMs / (60 * 60 * 1000)));
                          const mins = Math.max(0, Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000)));
                          resetText = `Next ad resets in approx ${hours}h ${mins}m`;
                      }

                      return (
                        <>
                          {isLimitReached ? (
                            <div className="bg-zinc-950 border border-red-500/30 rounded-xl p-4 text-center">
                              <p className="text-red-400 font-black text-sm uppercase">Daily limit reached (5/5)</p>
                              <p className="text-zinc-500 text-xs mt-1">{resetText}</p>
                            </div>
                          ) : (
                            <button
                                onClick={() => handleWatchRewardedAd(selectedGiveaway.target)}
                                disabled={adLoading}
                                className="w-full py-3.5 rounded-xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-black shadow-lg shadow-amber-500/10"
                            >
                                {adLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Loading Ad...</span>
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle size={18} />
                                        <span>Watch Ad For +2 Extra Tickets</span>
                                    </>
                                )}
                            </button>
                          )}
                        </>
                      );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {milestones.map((m, idx) => {
                const isPassed = totalUsers >= m.target;
                const isCurrent = idx === currentMilestoneIndex;
                
                return (
                  <div 
                    role="button"
                    tabIndex={0}
                    key={m.target} 
                    onClick={() => setSelectedGiveaway(m)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedGiveaway(m); }}
                    className={`relative overflow-hidden rounded-2xl border text-left w-full cursor-pointer ${
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
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                            isCurrent ? 'bg-amber-500/20 text-amber-500' : isPassed ? 'bg-green-500/20 text-green-500' : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            {isPassed ? 'Unlocked' : isCurrent ? 'Active Goal' : 'Locked'}
                          </span>
                          <h3 className="text-lg font-black italic uppercase mt-3">{m.prize}</h3>
                          <p className="text-sm font-bold text-zinc-400 mt-1">{m.target.toLocaleString()} Users Target</p>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isCurrent ? 'bg-amber-500/10 text-amber-500' : isPassed ? 'bg-green-500/10 text-green-500' : 'bg-zinc-900 text-zinc-600'
                        }`}>
                          {isPassed ? <CheckCircle2 size={24} /> : <Gift size={24} />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-amber-500" />
                <h3 className="font-black text-xl italic uppercase">Entry Status</h3>
              </div>
              {isLifetimeQualified && (
                <span className="px-2.5 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-[10px] font-black text-green-400 uppercase tracking-widest">
                  Lifetime Unlocked
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-xs mb-4">
              {isLifetimeQualified
                ? 'You have completed all entry requirements and are permanently qualified for all current & future giveaways!'
                : 'New user requirements: Complete these 1-time steps to unlock your raffle tickets forever.'}
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {isLifetimeQualified || user?.emailVerified || user ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                <span className={`text-sm font-bold uppercase tracking-wide ${isLifetimeQualified || user?.emailVerified || user ? 'text-white' : 'text-zinc-500'}`}>Account Verified</span>
              </div>
              <div className="flex items-center gap-3">
                {isLifetimeQualified || hasCar ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                <span className={`text-sm font-bold uppercase tracking-wide ${isLifetimeQualified || hasCar ? 'text-white' : 'text-zinc-500'}`}>Add 1+ Car to Garage</span>
              </div>
              <div className="flex items-center gap-3">
                {isLifetimeQualified || hasPost ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                <span className={`text-sm font-bold uppercase tracking-wide ${isLifetimeQualified || hasPost ? 'text-white' : 'text-zinc-500'}`}>Post a Build Update</span>
              </div>
              <div className="flex items-center gap-3">
                {isLifetimeQualified || myReferrals >= 10 ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                <span className={`text-sm font-bold uppercase tracking-wide ${isLifetimeQualified || myReferrals >= 10 ? 'text-white' : 'text-zinc-500'}`}>Invite 10 Friends</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isLifetimeQualified || scrolledFeedCount >= 50 ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                  <span className={`text-sm font-bold uppercase tracking-wide ${isLifetimeQualified || scrolledFeedCount >= 50 ? 'text-white' : 'text-zinc-500'}`}>Scroll 50 Feed Images</span>
                </div>
                <span className={`text-xs font-mono font-bold ${isLifetimeQualified || scrolledFeedCount >= 50 ? 'text-green-400' : 'text-zinc-400'}`}>
                  {isLifetimeQualified ? '50/50' : `${Math.min(50, scrolledFeedCount)}/50`}
                </span>
              </div>
            </div>
            
            <div className={`mt-4 pt-4 border-t border-zinc-800 text-center font-black italic uppercase tracking-widest ${isEligible ? 'text-green-500' : 'text-zinc-500'}`}>
              {isLifetimeQualified ? 'LIFETIME QUALIFIED (TICKETS UNLOCKED)' : isEligible ? 'TICKET UNLOCKED' : 'TICKET LOCKED'}
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
              <div className="text-4xl font-black text-amber-500">{boostTickets} / 15</div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Extra Boost Tickets (Max 15)</div>
            </div>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              When a new user signs up using your share link, you receive +1 extra boost ticket for the active giveaway draw (up to a maximum of 15 extra boost tickets). Existing users logging in do not count.
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
                    Users must have a verified account, at least 1 car in their garage, 1 build update posted, at least 10 referred new signups, and have scrolled through at least 50 feed images to qualify for an entry ticket.
                  </p>
                  <p>
                    <strong className="text-white block mb-1">2. Non-Affiliation</strong>
                    Apple Inc. and Google LLC are NOT sponsors of, nor are they involved in any way with, this giveaway or sweepstakes.
                  </p>
                  <p>
                    <strong className="text-white block mb-1">3. How to Enter, Boosts & Rewarded Ad Tickets</strong>
                    Users automatically receive an entry ticket upon meeting the eligibility requirements. Additional boost tickets (up to a maximum limit of 15 extra tickets per user) can be earned when a new user registers a new account on RevItUp using your unique share/referral link. Existing users who are already registered do not grant extra boost tickets. Users may also optionally choose to watch rewarded video ads to earn +2 extra raffle tickets per completed ad. Watching ads is completely voluntary and non-mandatory.
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
