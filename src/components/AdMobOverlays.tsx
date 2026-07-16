import React, { useState, useEffect } from 'react';
import { X, Play, Award, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

export function AdMobOverlays() {
  const { user } = useAuth();
  
  // Interstitial State
  const [interstitialActive, setInterstitialActive] = useState(false);
  const [interstitialDismissCallback, setInterstitialDismissCallback] = useState<(() => void) | null>(null);
  
  // Rewarded State
  const [rewardedActive, setRewardedActive] = useState(false);
  const [rewardedTimer, setRewardedTimer] = useState(8);
  const [rewardedEarned, setRewardedEarned] = useState(false);
  const [rewardCallback, setRewardCallback] = useState<(() => void) | null>(null);
  const [rewardedDismissCallback, setRewardedDismissCallback] = useState<(() => void) | null>(null);

  // Banner State
  const [bannerConfig, setBannerConfig] = useState<{ visible: boolean; position: 'top' | 'bottom' }>({
    visible: false,
    position: 'bottom'
  });

  useEffect(() => {
    // 1. Listen for Interstitial triggers
    const handleInterstitialTrigger = (e: any) => {
      const { onDismiss } = e.detail || {};
      setInterstitialDismissCallback(() => onDismiss || null);
      setInterstitialActive(true);
    };

    // 2. Listen for Rewarded triggers
    const handleRewardedTrigger = (e: any) => {
      const { onRewarded, onDismiss } = e.detail || {};
      setRewardCallback(() => onRewarded || null);
      setRewardedDismissCallback(() => onDismiss || null);
      setRewardedTimer(8);
      setRewardedEarned(false);
      setRewardedActive(true);
    };

    // 3. Listen for Banner state changes
    const handleBannerState = (e: any) => {
      const { visible, position } = e.detail || {};
      setBannerConfig({
        visible: !!visible,
        position: position || 'bottom'
      });
    };

    window.addEventListener('web-admob-interstitial-trigger', handleInterstitialTrigger);
    window.addEventListener('web-admob-rewarded-trigger', handleRewardedTrigger);
    window.addEventListener('web-admob-banner-state', handleBannerState);

    return () => {
      window.removeEventListener('web-admob-interstitial-trigger', handleInterstitialTrigger);
      window.removeEventListener('web-admob-rewarded-trigger', handleRewardedTrigger);
      window.removeEventListener('web-admob-banner-state', handleBannerState);
    };
  }, []);

  // Timer countdown for Rewarded Video
  useEffect(() => {
    if (!rewardedActive) return;
    if (rewardedTimer <= 0) {
      if (!rewardedEarned) {
        setRewardedEarned(true);
        // Trigger the reward callback
        if (rewardCallback) rewardCallback();
        
        // Award real reputation bonus in Firestore if logged in
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          updateDoc(userRef, {
            reputationBonus: increment(50)
          }).then(() => {
            console.log('[AdMob Firestore] Rewarded +50 reputation bonus to user!');
          }).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
          });
        }
      }
      return;
    }

    const interval = setInterval(() => {
      setRewardedTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [rewardedActive, rewardedTimer, rewardedEarned, rewardCallback, user]);

  const handleCloseInterstitial = () => {
    setInterstitialActive(false);
    if (interstitialDismissCallback) {
      interstitialDismissCallback();
    }
  };

  const handleCloseRewarded = () => {
    if (!rewardedEarned) return; // Prevent early exit
    setRewardedActive(false);
    if (rewardedDismissCallback) {
      rewardedDismissCallback();
    }
  };

  return (
    <>
      {/* 1. Full-screen Mock Interstitial Ad */}
      <AnimatePresence>
        {interstitialActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col justify-between p-6 select-none font-sans"
          >
            {/* Ad Header */}
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-widest text-zinc-400">
                Google Test Interstitial Ad
              </span>
              <button 
                onClick={handleCloseInterstitial}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full text-white transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Ad Body Content */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center max-w-sm mx-auto">
              <div className="relative aspect-[16/9] w-full bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800" 
                  alt="Porsche 911" 
                  className="w-full h-full object-cover grayscale brightness-90 group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-left space-y-1">
                  <span className="text-[9px] font-black tracking-widest text-white/60 bg-white/10 px-2 py-0.5 rounded uppercase">Sponsored</span>
                  <h4 className="text-lg font-black tracking-tight italic uppercase text-white">REVMOTORS 911 R</h4>
                  <p className="text-xs text-zinc-400 font-medium">Precision-crafted track day weapon. Unleash raw German engineering.</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-white leading-none">
                  RevItUp Premium Builds
                </h3>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed font-bold uppercase tracking-wider">
                  Check out the world's most elite private social garage networks. Compare specs & lap times instantly.
                </p>
              </div>

              <button 
                onClick={handleCloseInterstitial}
                className="w-full py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl active:scale-95 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              >
                VISIT SPONSOR SITE
              </button>
            </div>

            {/* Ad Footer */}
            <div className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
              AdMob Test Advertisement • Safe for Testing
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Full-screen Mock Rewarded Ad */}
      <AnimatePresence>
        {rewardedActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col justify-between p-6 select-none font-sans"
          >
            {/* Ad Header */}
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-widest text-zinc-400">
                Google Test Rewarded Video Ad
              </span>
              <button 
                onClick={handleCloseRewarded}
                disabled={!rewardedEarned}
                className={`p-1.5 border rounded-full transition-all active:scale-90 ${
                  rewardedEarned 
                    ? 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800' 
                    : 'bg-zinc-900/40 border-zinc-900 text-zinc-700 cursor-not-allowed'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Ad Video Simulator Body */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center max-w-sm mx-auto w-full">
              {/* Media Player Container */}
              <div className="relative aspect-[9/16] max-h-[50vh] w-full bg-zinc-900 border border-zinc-850 rounded-[32px] overflow-hidden shadow-2xl flex flex-col justify-end p-6">
                <img 
                  src="https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800" 
                  alt="Supercar drift" 
                  className="absolute inset-0 w-full h-full object-cover grayscale brightness-75 scale-105" 
                />
                
                {/* Simulated video playback progress bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-800 overflow-hidden">
                  <motion.div 
                    initial={{ width: '0%' }}
                    animate={{ width: `${((8 - rewardedTimer) / 8) * 100}%` }}
                    transition={{ ease: 'linear', duration: 1 }}
                    className="h-full bg-white shadow-[0_0_10px_#fff]"
                  />
                </div>

                {/* Live counter overlay */}
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1.5 border border-white/10">
                  <Play size={10} fill="currentColor" />
                  {rewardedTimer > 0 ? `Reward in ${rewardedTimer}s` : 'Reward Earned'}
                </div>

                <div className="relative space-y-4 text-left z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-widest bg-yellow-500 text-black px-2 py-0.5 rounded uppercase">SPONSORED BUILD</span>
                  </div>
                  <h4 className="text-2xl font-black tracking-tight italic uppercase text-white leading-none">REVMEDIA HIGH-PSI</h4>
                  <p className="text-xs text-zinc-300 font-bold uppercase tracking-wider">
                    Boost your build stats. Tap to subscribe to high-fidelity garage build logs.
                  </p>
                </div>
              </div>

              {/* Reward feedback panel */}
              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  {rewardedEarned ? (
                    <motion.div 
                      key="earned"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-green-500/10 border border-green-500/20 px-6 py-4 rounded-2xl flex items-center gap-3 justify-center text-green-400"
                    >
                      <CheckCircle2 size={24} className="animate-bounce" />
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest">Reward Successfully Unlocked!</p>
                        <p className="text-xs font-bold text-white uppercase italic">+50 REPUTATION / TUNER POINTS ADDED</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="watching"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-zinc-900 border border-zinc-850 px-6 py-4 rounded-2xl flex items-center gap-3 justify-center text-zinc-400"
                    >
                      <Award size={20} className="animate-pulse text-zinc-500" />
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Unlocking Reward...</p>
                        <p className="text-xs font-black text-zinc-300 uppercase">Do not close the video ad yet</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Ad Footer */}
            <div className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
              AdMob Test Reward Video • Safe for Testing
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. persistent Mock Web Banner Ad */}
      <AnimatePresence>
        {bannerConfig.visible && (
          <motion.div
            initial={{ opacity: 0, y: bannerConfig.position === 'top' ? -50 : 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: bannerConfig.position === 'top' ? -50 : 50 }}
            className={`fixed left-0 right-0 z-40 bg-zinc-950 border-zinc-900 shadow-2xl p-2 select-none font-sans flex items-center justify-center transition-all ${
              bannerConfig.position === 'top' 
                ? 'top-0 border-b pt-[calc(env(safe-area-inset-top,0px)+8px)]' 
                : 'bottom-[calc(52px+env(safe-area-inset-bottom,0px))] border-t pb-2'
            }`}
          >
            <div className="w-full max-w-sm h-12 bg-zinc-900 border border-zinc-800 rounded-xl px-4 flex items-center justify-between overflow-hidden relative">
              {/* Corner placeholder indicator */}
              <span className="absolute top-0.5 left-1 text-[8px] font-black text-zinc-600 uppercase tracking-widest">Ad</span>
              
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-black italic">R</div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-tight text-white leading-none">REVITUP PRO</p>
                  <p className="text-[8px] text-zinc-500 uppercase tracking-wider font-bold">Unleash peak boost on our test dynos</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.open(window.location.origin, '_blank')}
                  className="px-2.5 py-1.5 bg-white text-black text-[8px] font-black uppercase tracking-widest rounded-md"
                >
                  GET
                </button>
                <button 
                  onClick={() => setBannerConfig(prev => ({ ...prev, visible: false }))}
                  className="p-1 text-zinc-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
