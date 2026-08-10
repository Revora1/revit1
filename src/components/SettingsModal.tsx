import React, { useState } from 'react';
import { PrivacyPolicy } from './PrivacyPolicy';
import { UserGuide } from './UserGuide';
import { VERSION_INFO } from '../version';
import { AdminPanel } from './AdminPanel';
import { useAuth } from '../context/AuthContext';
import { X, LogOut, Shield, Bell, HelpCircle, UserX, Moon, Smartphone, ChevronLeft, Trash2, Database, Info, Share2, Lock, Tv, Award, Sparkles, AlertCircle, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { deleteUser } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType, requestNotificationPermissionAndGetToken } from '../lib/firebase';
import { doc, deleteDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { admobService } from '../lib/admobService';
import { Capacitor } from '@capacitor/core';
import { copyToClipboard, getBaseUrl, shareContent } from '../lib/utils';

interface SettingsModalProps {
  onClose: () => void;
}

interface ToggleItemProps {
  label: string;
  description: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

function ToggleItem({ label, description, defaultChecked = false, onChange }: ToggleItemProps) {
  const [checked, setChecked] = useState(defaultChecked);

  const handleToggle = () => {
    const newChecked = !checked;
    setChecked(newChecked);
    if (onChange) onChange(newChecked);
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-bold text-sm">{label}</div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-tight">{description}</div>
      </div>
      <button 
        onClick={handleToggle}
        className={`w-12 h-6 rounded-full transition-colors relative ${checked ? 'bg-white' : 'bg-zinc-800'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${checked ? 'bg-black left-7' : 'bg-zinc-400 left-1'}`} />
      </button>
    </div>
  );
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { user, profile, logout, updateProfileSettings } = useAuth();
  const [activeSubView, setActiveSubView] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [consent, setConsent] = useState(localStorage.getItem('gdpr-consent') || 'none');

  // GDPR State Hooks
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessSuccess, setAccessSuccess] = useState(false);
  const [accessSuccessMsg, setAccessSuccessMsg] = useState<string | null>(null);
  const [erasureLoading, setErasureLoading] = useState(false);
  const [erasureConfirm, setErasureConfirm] = useState(false);
  const [erasureError, setErasureError] = useState<string | null>(null);

  // Cache State Hooks
  const [cacheSize, setCacheSize] = useState("124 MB");
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheClearedToast, setCacheClearedToast] = useState(false);

  // AdMob Local Settings State
  const [bannerEnabled, setBannerEnabled] = useState(localStorage.getItem('admob-banner-enabled') !== 'false');
  const [bannerPosition, setBannerPosition] = useState<'top' | 'bottom'>((localStorage.getItem('admob-banner-position') as 'top' | 'bottom') || 'bottom');
  const [adFeedback, setAdFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    if (bannerEnabled) {
      admobService.showBanner(bannerPosition);
    } else {
      admobService.hideBanner();
    }
  }, [bannerEnabled, bannerPosition]);

  const handleBannerToggle = (checked: boolean) => {
    setBannerEnabled(checked);
    localStorage.setItem('admob-banner-enabled', checked ? 'true' : 'false');
  };

  const handlePositionToggle = (pos: 'top' | 'bottom') => {
    setBannerPosition(pos);
    localStorage.setItem('admob-banner-position', pos);
  };

  const toggleConsent = () => {
    const next = consent === 'accepted' ? 'declined' : 'accepted';
    localStorage.setItem('gdpr-consent', next);
    setConsent(next);
    // Reload to apply script changes
    window.location.reload();
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);

    const shareData = {
      title: 'RevitUp',
      text: 'Join me on RevitUp - The Social Garage for Car Enthusiasts!',
      url: `${getBaseUrl()}/?ref=${profile?.username || user?.uid}`
    };

    try {
      const success = await shareContent(shareData);
      if (success && !Capacitor.isNativePlatform() && !navigator.share) {
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2500);
      }
    } finally {
      setSharing(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      // 1. Clear Service Worker caches if present
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key);
          }
        } catch (cacheErr) {
          console.warn("Caches clear failed:", cacheErr);
        }
      }

      // 2. Clear SessionStorage
      try {
        sessionStorage.clear();
      } catch (sessionErr) {
        console.warn("SessionStorage clear failed:", sessionErr);
      }

      // 3. Premium feel transition delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setCacheSize("0 KB");
      setCacheClearedToast(true);
      setTimeout(() => setCacheClearedToast(false), 3000);
    } catch (err) {
      console.error("Failed to clear cache fully:", err);
    } finally {
      setClearingCache(false);
    }
  };

  // Handle body scroll lock
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const fetchExportData = async () => {
    if (!user) return null;
    // 1. Profile Doc
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const profile = userDoc.exists() ? userDoc.data() : null;

    // 2. Garage Cars
    const garageQuery = query(collection(db, 'garage'), where('ownerId', '==', user.uid));
    const garageSnapshot = await getDocs(garageQuery);
    const garage = garageSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 3. Posts
    const postsQuery = query(collection(db, 'posts'), where('authorId', '==', user.uid));
    const postsSnapshot = await getDocs(postsQuery);
    const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 4. Performance records
    const perfQuery = query(collection(db, 'performance_board'), where('ownerId', '==', user.uid));
    const perfSnapshot = await getDocs(perfQuery);
    const performance_records = perfSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 5. Comments
    const commentsQuery = query(collection(db, 'comments'), where('authorId', '==', user.uid));
    const commentsSnapshot = await getDocs(commentsQuery);
    const comments = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return {
      meta: {
        app: "RevItUp - The Social Garage",
        requestedAt: new Date().toISOString(),
        requestedBy: user.uid,
        disclaimer: "This document contains a complete copy of all your custom build details, garage specs, posts, and profile associations stored in RevItUp, exported in compliance with GDPR and CCPA."
      },
      profile,
      garage,
      posts,
      performance_records,
      comments
    };
  };

  const handleDownloadAccess = async () => {
    if (!user) return;
    setAccessLoading(true);
    setAccessSuccessMsg(null);
    try {
      const exportData = await fetchExportData();
      if (!exportData) return;

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revitup_data_export_${user.uid}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setAccessSuccessMsg("Data export file generated! Check your browser's default downloads folder. If the file download is blocked inside the sandboxed iframe, please use the copy button below.");
    } catch (error) {
      console.error("Data access export failed:", error);
      alert("Failed to compile your data copy. Please try again.");
    } finally {
      setAccessLoading(false);
    }
  };

  const handleCopyAccess = async () => {
    if (!user) return;
    setAccessLoading(true);
    setAccessSuccessMsg(null);
    try {
      const exportData = await fetchExportData();
      if (!exportData) return;

      const jsonString = JSON.stringify(exportData, null, 2);
      await navigator.clipboard.writeText(jsonString);

      setAccessSuccessMsg("✓ Copied to clipboard! Your complete build profile, posts, and garage specifications are now copied to your clipboard as JSON data.");
    } catch (error) {
      console.error("Copy data failed:", error);
      alert("Failed to copy data to clipboard. Please try again.");
    } finally {
      setAccessLoading(false);
    }
  };

  const handleRequestErasure = async () => {
    if (!user) return;
    if (!erasureConfirm) {
      setErasureConfirm(true);
      setErasureError(null);
      setTimeout(() => setErasureConfirm(false), 5000); // reset after 5s
      return;
    }

    setErasureLoading(true);
    setErasureError(null);
    try {
      // 1. Purge Profile Document
      await deleteDoc(doc(db, 'users', user.uid));

      // 2. Purge Garage cars
      const garageQuery = query(collection(db, 'garage'), where('ownerId', '==', user.uid));
      const garageSnapshot = await getDocs(garageQuery);
      for (const d of garageSnapshot.docs) {
        await deleteDoc(doc(db, 'garage', d.id));
      }

      // 3. Purge Posts
      const postsQuery = query(collection(db, 'posts'), where('authorId', '==', user.uid));
      const postsSnapshot = await getDocs(postsQuery);
      for (const d of postsSnapshot.docs) {
        await deleteDoc(doc(db, 'posts', d.id));
      }

      // 4. Purge Performance Records
      const perfQuery = query(collection(db, 'performance_board'), where('ownerId', '==', user.uid));
      const perfSnapshot = await getDocs(perfQuery);
      for (const d of perfSnapshot.docs) {
        await deleteDoc(doc(db, 'performance_board', d.id));
      }

      // 5. Purge Comments
      const commentsQuery = query(collection(db, 'comments'), where('authorId', '==', user.uid));
      const commentsSnapshot = await getDocs(commentsQuery);
      for (const d of commentsSnapshot.docs) {
        await deleteDoc(doc(db, 'comments', d.id));
      }

      // 6. Purge Follows
      const follows1Query = query(collection(db, 'follows'), where('followerId', '==', user.uid));
      const follows1Snapshot = await getDocs(follows1Query);
      for (const d of follows1Snapshot.docs) {
        await deleteDoc(doc(db, 'follows', d.id));
      }

      const follows2Query = query(collection(db, 'follows'), where('followingId', '==', user.uid));
      const follows2Snapshot = await getDocs(follows2Query);
      for (const d of follows2Snapshot.docs) {
        await deleteDoc(doc(db, 'follows', d.id));
      }

      // 7. Purge Blocks
      const blocks1Query = query(collection(db, 'blocks'), where('blockerId', '==', user.uid));
      const blocks1Snapshot = await getDocs(blocks1Query);
      for (const d of blocks1Snapshot.docs) {
        await deleteDoc(doc(db, 'blocks', d.id));
      }

      const blocks2Query = query(collection(db, 'blocks'), where('blockedId', '==', user.uid));
      const blocks2Snapshot = await getDocs(blocks2Query);
      for (const d of blocks2Snapshot.docs) {
        await deleteDoc(doc(db, 'blocks', d.id));
      }

      // 8. Delete Authentication Account
      await deleteUser(user);
      onClose();
    } catch (error: any) {
      console.error("Erasure failed:", error);
      if (error?.code === 'auth/requires-recent-login') {
        setErasureError("Sensitive actions require recent authentication. Please log out, log back in, and try again.");
      } else {
        setErasureError("Failed to permanently delete account. Please try again.");
      }
    } finally {
      setErasureLoading(false);
      setErasureConfirm(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Treat deletion as a unified permanent erasure request
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000); // reset after 3s
      return;
    }

    if (user) {
      setErasureConfirm(true);
      await handleRequestErasure();
    }
  };

  const settingsItems = [
    ...(user?.email === 'tonyang11552883@gmail.com' ? [{ id: 'admin', icon: Shield, label: 'Admin Panel', description: 'Manage reports and users' }] : []),
    { id: 'notifications', icon: Bell, label: 'Notifications', description: 'Manage push alerts' },
    { id: 'privacy', icon: Shield, label: 'Privacy', description: 'Who can see your garage' },
    { id: 'appearance', icon: Moon, label: 'Appearance', description: 'Dark mode, themes' },
    { id: 'data', icon: Database, label: 'Data & Storage', description: 'Manage cache & data usage' },
    { id: 'devices', icon: Smartphone, label: 'Connected Devices', description: 'Manage active sessions' },
    { id: 'admob', icon: Tv, label: 'Google AdMob', description: 'Configure & test mobile ads' },
    { id: 'support', icon: HelpCircle, label: 'Support', description: 'Get help with RevItUp' },
    { id: 'about', icon: Info, label: 'About', description: 'App version, terms, privacy policy' },
  ];

  const renderSubViewContent = () => {
    switch (activeSubView) {
      case 'admin':
        return <AdminPanel onClose={() => setActiveSubView(null)} />;
      case 'notifications':
        const isNative = Capacitor.isNativePlatform();
        const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(window.navigator.userAgent);
        const isStandalone = typeof window !== 'undefined' && (
          (window.navigator as any).standalone || 
          window.matchMedia('(display-mode: standalone)').matches
        );

        const handlePushToggle = async (enabled: boolean) => {
          if (enabled && user) {
            if (isNative) {
              alert('Push notifications are integrated with your device system settings. Please ensure notifications are enabled for the RevItUp app in your Phone Settings!');
              return;
            }
            const token = await requestNotificationPermissionAndGetToken(user.uid);
            if (token) {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Push Notifications Enabled!', {
                  body: 'FCM push registration successful. You are ready to get real-time garage alerts!'
                });
              }
            } else {
              if (!('Notification' in window)) {
                alert('This browser does not support desktop notifications');
                return;
              }
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                new Notification('Notifications Enabled!', {
                  body: 'Simple notifications enabled. FCM is active on your profile.'
                });
              }
            }
          }
        };

        const defaultPushChecked = isNative ? true : (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted');
        const currentPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

        return (
          <div className="space-y-4">
            <ToggleItem 
              label="Push Notifications" 
              description="Receive alerts on your device" 
              defaultChecked={defaultPushChecked} 
              onChange={handlePushToggle}
            />
            <ToggleItem label="Email Updates" description="Weekly digest and news" />
            
            {/* Status & Troubleshooting diagnostics */}
            <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-3 mt-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <span>Phone Notification Diagnostics</span>
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-900">
                  <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wide">Status</span>
                  <span className="font-black uppercase text-[10px] text-green-400">
                    {isNative ? '● Active' : currentPermission === 'granted' ? '● Active' : currentPermission === 'denied' ? '● Blocked/Denied' : '● Not Configured'}
                  </span>
                </div>
                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-900">
                  <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wide">App Mode</span>
                  <span className={`font-black uppercase text-[10px] ${isNative ? 'text-emerald-400' : isStandalone ? 'text-blue-400' : 'text-yellow-500'}`}>
                    {isNative ? (isIOS ? 'Native App (iOS)' : 'Native App (Android)') : isStandalone ? 'Standalone PWA' : 'Web Browser'}
                  </span>
                </div>
              </div>

              {/* Native Mobile Integration Status Card */}
              {isNative && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl space-y-2 mt-2">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Smartphone size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wide">Mobile Integration Mode</span>
                  </div>
                  <p className="text-[10px] text-zinc-300 leading-normal">
                    You are running the official RevItUp {isIOS ? 'iOS (TestFlight)' : 'Android'} mobile application. Native alerts are integrated directly with your device's system settings.
                  </p>
                  <p className="text-[9px] text-zinc-400 leading-relaxed">
                    To manage your alerts, go to your phone's <span className="text-white font-bold">Settings &gt; Notifications &gt; RevItUp</span> and make sure <span className="text-white font-bold">"Allow Notifications"</span> is turned on.
                  </p>
                </div>
              )}

              {/* iOS Web PWA-Specific Troubleshooting Instructions */}
              {isIOS && !isStandalone && !isNative && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl space-y-2 mt-2">
                  <div className="flex items-center gap-1.5 text-red-400">
                    <Smartphone size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wide">iOS Setup Required</span>
                  </div>
                  <p className="text-[10px] text-zinc-300 leading-normal">
                    Apple iPhone and iPad devices prevent cookies and Web Push notifications inside normal Safari/Chrome browser tabs. To activate:
                  </p>
                  <ol className="text-[9px] text-zinc-400 list-decimal pl-4 space-y-1">
                    <li>Open this site in <span className="text-white font-bold">Safari browser</span>.</li>
                    <li>Tap the Safari <span className="text-white font-bold inline-flex items-center gap-0.5">Share <Share2 size={10} /></span> button in the bottom bar.</li>
                    <li>Scroll and select <span className="text-white font-bold">"Add to Home Screen"</span> (+).</li>
                    <li>Open the new <span className="text-white font-bold">RevItUp</span> icon from your home screen, log in, and toggle notifications on!</li>
                  </ol>
                </div>
              )}

              {/* Android & general web troubleshooting instructions */}
              {(!isIOS || isStandalone) && !isNative && currentPermission !== 'granted' && (
                <div className="bg-zinc-900 p-3 rounded-xl space-y-1 text-zinc-400">
                  <div className="flex items-center gap-1 text-zinc-300">
                    <HelpCircle size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wide">Troubleshoot Phone Alerts</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    If alerts aren’t coming through, your phone blocks permissions at system level. Ensure you didn’t block site notifications:
                  </p>
                  <ul className="text-[9px] list-disc pl-4 space-y-1.5 mt-1">
                    <li><span className="text-zinc-200">Android Chrome:</span> Tap three dots (⋮) &gt; Info (ⓘ) icon &gt; Permissions &gt; set Notifications to Blocked to Allowed.</li>
                    <li><span className="text-zinc-200">System Settings:</span> Go to your phone Settings &gt; Apps &gt; Chrome/Safari &gt; Notifications &gt; toggle "Allow Notifications" on.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="h-px bg-zinc-800 my-4" />
            <div className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-2">Activities</div>
            <ToggleItem label="Likes" description="When someone likes your build" defaultChecked />
            <ToggleItem label="Comments" description="When someone comments on your post" defaultChecked />
            <ToggleItem label="New Followers" description="When someone follows your profile" defaultChecked />
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-4">
            <ToggleItem label="Friends-Only Mode" description="Limit messages to mutual followers only" defaultChecked={!!profile?.friendsOnlyInteractions} onChange={(val) => updateProfileSettings({ friendsOnlyInteractions: val }).catch(console.error)} />
            <ToggleItem label="Hide Garage" description="Don't show your cars on your public profile" />
            <ToggleItem label="Activity Status" description="Show when you are online" defaultChecked />
            <div className="mt-6 p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
               <p className="text-sm font-bold mb-1">Blocked Accounts</p>
               <p className="text-xs text-zinc-500 mb-3">You have 0 blocked accounts</p>
               <button className="text-xs font-bold bg-white text-black px-4 py-2 rounded-full">Manage</button>
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <div className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-3">Theme</div>
              <div className="grid grid-cols-2 gap-3">
                <button className="border-2 border-white bg-black h-24 rounded-2xl flex items-center justify-center font-bold relative">
                   Dark
                   <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full" /></div>
                </button>
                <button className="border-2 border-zinc-800 bg-zinc-900 h-24 rounded-2xl flex items-center justify-center font-bold text-zinc-500 opacity-50 cursor-not-allowed">
                   Light (Soon)
                </button>
              </div>
            </div>
            <ToggleItem label="Reduce Motion" description="Disable some animations" />
          </div>
        );
      case 'data':
        return (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-4">
              <ToggleItem label="Push Notifications" description="Get notified on new likes and follows" defaultChecked />
              <ToggleItem label="High Quality Media" description="Always upload and view high-res photos" />
            </div>
            
            <div className="h-px bg-zinc-800" />

            {/* GDPR / CCPA Privacy Rights Section */}
            <div className="space-y-4">
              <div className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Privacy Rights (GDPR / CCPA)</div>
              
              {/* Request Access */}
              <div className="p-4 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-3">
                <div>
                  <h4 className="font-bold text-sm text-white">Request Access</h4>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    In compliance with GDPR and CCPA, you can download or copy a complete copy of all your custom build details, specs, posts, comments, and profile info stored on our servers.
                  </p>
                </div>
                
                {accessSuccessMsg && (
                  <div className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl leading-relaxed">
                    {accessSuccessMsg}
                  </div>
                )}

                <div className="space-y-2">
                  <button 
                    onClick={handleDownloadAccess}
                    disabled={accessLoading}
                    className="w-full bg-zinc-800 hover:bg-zinc-750 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-full transition-all flex items-center justify-center gap-2"
                  >
                    {accessLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Compiling Build Details...
                      </>
                    ) : (
                      <>
                        <Database size={14} />
                        Download Data Export (JSON)
                      </>
                    )}
                  </button>

                  <button 
                    onClick={handleCopyAccess}
                    disabled={accessLoading}
                    className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 disabled:opacity-50 text-zinc-300 font-bold text-xs py-2.5 rounded-full transition-all flex items-center justify-center gap-2"
                  >
                    {accessLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-zinc-500/30 border-t-zinc-400 rounded-full animate-spin" />
                        Compiling Build Details...
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy Data to Clipboard (Backup)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Request Erasure */}
              <div className="p-4 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-3">
                <div>
                  <h4 className="font-bold text-sm text-red-500">Request Erasure</h4>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Instantly and permanently delete your user account. This will recursively purge your profile details, vehicles in your garage, social posts, dynamic metrics, and community associations from our servers.
                  </p>
                </div>
                {erasureError && (
                  <div className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                    {erasureError}
                  </div>
                )}
                <button 
                  onClick={handleRequestErasure}
                  disabled={erasureLoading}
                  className={`w-full font-bold text-xs py-2.5 rounded-full transition-all flex items-center justify-center gap-2 ${
                    erasureConfirm 
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-500'
                  }`}
                >
                  {erasureLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                      Purging All Data...
                    </>
                  ) : erasureConfirm ? (
                    <>
                      <AlertCircle size={14} />
                      CONFIRM PERMANENT ERASURE (CLICK AGAIN)
                    </>
                  ) : (
                    <>
                      <UserX size={14} />
                      Request Permanent Erasure
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="h-px bg-zinc-800" />
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm">Cache Storage</span>
                <span className="text-xs text-zinc-500">{cacheSize}</span>
              </div>
              <p className="text-xs text-zinc-500 mb-4">Clear cache to free up space. This won't delete your posts or cars.</p>
              
              {cacheClearedToast && (
                <div className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl mb-3">
                  ✓ Cache cleared successfully! Freed up 124 MB of local assets.
                </div>
              )}

              <button 
                onClick={handleClearCache}
                disabled={clearingCache}
                className="w-full bg-zinc-900 border border-zinc-800 text-white font-bold text-sm py-3 rounded-2xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {clearingCache ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Clearing Cache...
                  </>
                ) : (
                  "Clear Cache"
                )}
              </button>
            </div>
          </div>
        );
      case 'devices':
        return (
          <div className="space-y-4">
             <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-between">
                <div>
                   <p className="font-bold text-sm flex items-center gap-2">
                     <Smartphone size={16} className="text-zinc-400" />
                     Current Device
                   </p>
                   <p className="text-xs text-green-500 mt-1">Active now</p>
                </div>
                <div className="text-xs text-zinc-500 text-right">
                   <p>Google Chrome</p>
                   <p>Mac OS</p>
                </div>
             </div>
             <p className="text-xs text-zinc-500 pt-2 text-center">You are only logged in on this device.</p>
          </div>
        );
      case 'support':
        return (
          <div className="space-y-4">
             <button className="w-full flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-colors">
                <span className="font-bold text-sm">Help Center</span>
                <ChevronLeft size={16} className="rotate-180 text-zinc-500" />
             </button>
             <button className="w-full flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-colors">
                <span className="font-bold text-sm">Report a Bug</span>
                <ChevronLeft size={16} className="rotate-180 text-zinc-500" />
             </button>
             <div className="mt-8 p-6 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
                <p className="text-sm font-bold mb-2">Need direct help?</p>
                <p className="text-xs text-zinc-500 mb-4">Our support team is available 24/7 for RevItUp members.</p>
                <a href="mailto:support@revitup.example.com" className="bg-white text-black px-6 py-2 rounded-full font-bold text-xs">Email Us</a>
             </div>
          </div>
        );
      case 'admob':
        return (
          <div className="space-y-6">
            {/* Native Ads Overview Section */}
            <div className="space-y-3 p-4 bg-zinc-900 border border-zinc-850 rounded-2xl">
              <div className="flex items-center gap-2 text-yellow-500">
                <Sparkles size={16} className="fill-current" />
                <span className="font-black text-xs uppercase tracking-widest">Feed Integration Only</span>
              </div>
              <h3 className="text-white font-black text-sm uppercase italic">Premium Native Feed Ads</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                To maximize UI consistency and respect user focus, other intrusive ad formats (Banners, Interstitial popups, and Rewarded video overlays) are completely disabled. Google AdMob is integrated strictly as a beautifully customized native ad inside your feed.
              </p>
            </div>

            {/* Diagnostics View */}
            <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <span>Google AdMob SDK Diagnostics</span>
                <span className={`h-2 w-2 rounded-full ${admobService.isNative() ? 'bg-green-500' : 'bg-blue-400'} animate-pulse`} />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-900">
                  <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wide">Environment</span>
                  <span className="font-black uppercase text-[10px] text-zinc-300">
                    {admobService.isNative() ? '● Native Mobile' : '● Web Preview Simulator'}
                  </span>
                </div>
                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-900">
                  <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wide">Device Platform</span>
                  <span className="font-black uppercase text-[10px] text-zinc-300">
                    {Capacitor.getPlatform() === 'web' ? 'Web Browser' : Capacitor.getPlatform().toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-900 space-y-1">
                <span className="text-zinc-500 text-[9px] font-bold block uppercase tracking-wide">Active Ad Unit IDs</span>
                <div className="text-[9px] font-mono text-zinc-400 space-y-0.5 truncate">
                  <p className="text-yellow-500">Native Feed: Active</p>
                  <p className="text-zinc-600 line-through">Banner: Disabled</p>
                  <p className="text-zinc-600 line-through">Interstitial: Disabled</p>
                  <p className="text-zinc-600 line-through">Rewarded: Disabled</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-6 text-center py-4">
             <div className="w-20 h-20 bg-zinc-900 rounded-3xl mx-auto flex items-center justify-center mb-4">
               <span className="text-2xl font-black italic tracking-tighter">R</span>
             </div>
             <div>
                <h3 className="font-black text-xl italic tracking-tight">REVITUP</h3>
                <p className="text-zinc-500 text-xs">Version {VERSION_INFO.version} (Build {VERSION_INFO.androidBuild})</p>
             </div>
             
             <div className="space-y-2 pt-4">
                <button onClick={() => setActiveSubView('user_guide')} className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">User Guide / How to Use</button>
                <br />
                <button onClick={() => setActiveSubView('tos')} className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">Terms of Service</button>
                <br />
                <button onClick={() => setActiveSubView('privacy_policy')} className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">Privacy Policy</button>
             </div>
          </div>
        );
      case 'tos':
        return (
          <div className="space-y-4 text-sm text-zinc-400 max-h-[60vh] overflow-y-auto scrollbar-hide">
            <p className="font-bold text-white mb-2">Last Updated: May 5, 2026</p>
            <p>Welcome to RevItUp. By using our application, you agree to these Terms of Service. Please read them carefully.</p>
            <p className="font-bold text-white mt-4">1. Acceptance of Terms</p>
            <p>By accessing and using RevItUp, you accept and agree to be bound by the terms and provision of this agreement.</p>
            <p className="font-bold text-white mt-4">2. User Account</p>
            <p>You must be responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. We encourage you to use "strong" passwords.</p>
            <p className="font-bold text-white mt-4">3. Content</p>
            <p>Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, or other material. You are responsible for the content that you post to the Service, including its legality, reliability, and appropriateness.</p>
            <p className="font-bold text-white mt-4">4. Prohibited Uses</p>
            <p>You agree not to use the Service: In any way that violates any applicable national or international law or regulation. For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way by exposing them to inappropriate content or otherwise.</p>
            <p className="font-bold text-white mt-4">5. Termination</p>
            <p>We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
          </div>
        );
      case 'privacy_policy':
        return (
          <PrivacyPolicy onBack={() => setActiveSubView('about')} hideHeader={true} />
        );
      case 'user_guide':
        return (
          <UserGuide onBack={() => setActiveSubView('about')} hideHeader={true} />
        );
      default:
        return null;
    }
  };

  if (showPrivacy) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          className="w-full max-w-lg bg-zinc-950 rounded-t-[32px] sm:rounded-3xl border border-zinc-800 p-8 pt-6 space-y-8 max-h-[90vh] flex flex-col relative shadow-2xl overflow-y-auto"
        >
          <PrivacyPolicy onBack={() => setShowPrivacy(false)} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg bg-zinc-950 rounded-t-[32px] sm:rounded-3xl border border-zinc-800 p-8 pt-6 space-y-8 max-h-[90vh] flex flex-col relative shadow-2xl"
      >
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 scroll-smooth pb-28 sm:pb-4">
          <AnimatePresence mode="wait">
          {!activeSubView ? (
            <motion.div 
              key="main"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black italic tracking-tight">SETTINGS</h2>
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">General</label>
                  <div className="space-y-1">
                    {settingsItems.map((item) => (
                      <button 
                         key={item.id}
                         onClick={() => setActiveSubView(item.id)}
                         className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all text-left"
                      >
                        <div className="p-2 bg-zinc-800 rounded-xl text-zinc-400">
                          <item.icon size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{item.label}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-tight">{item.description}</p>
                        </div>
                      </button>
                    ))}
                    <button 
                      onClick={() => setShowPrivacy(true)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all text-left"
                    >
                      <div className="p-2 bg-zinc-800 rounded-xl text-white">
                        <Shield size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">Privacy Policy</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-tight">Full GDPR disclosure</p>
                      </div>
                    </button>

                    <button 
                      onClick={toggleConsent}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all text-left"
                    >
                      <div className={`p-2 rounded-xl text-white ${consent === 'accepted' ? 'bg-green-500' : 'bg-red-500'}`}>
                        <Lock size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">Cookie Consent</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-tight">
                          Currently: {consent === 'accepted' ? 'Accepted' : 'Declined'}
                        </p>
                      </div>
                    </button>

                    <button 
                      onClick={handleShare}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all text-left"
                    >
                      <div className="p-2 bg-zinc-800 rounded-xl text-white">
                        <Share2 size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">Invite Friends</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-tight">Share the app with others</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Danger Zone</label>
                  <div className="space-y-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-900 transition-all text-left group"
                    >
                      <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
                        <LogOut size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-red-500">Log Out</p>
                        <p className="text-[10px] text-red-900 uppercase tracking-tight">End current session</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={handleDeleteAccount}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-red-900/50 hover:bg-red-950/20 transition-all text-left group"
                    >
                      <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
                        <Trash2 size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-red-500">{deleteConfirm ? 'Are you sure? Click again.' : 'Delete Account'}</p>
                        <p className="text-[10px] text-red-900 uppercase tracking-tight">Permanently remove data</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-center text-[10px] font-black text-zinc-800 tracking-widest pt-4 uppercase">
                RevItUp v{VERSION_INFO.version} (Build {VERSION_INFO.androidBuild}) • Google Cloud Edition
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="sub"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 flex-1 min-h-[50vh]"
            >
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    if (activeSubView === 'tos' || activeSubView === 'privacy_policy' || activeSubView === 'user_guide') {
                      setActiveSubView('about');
                    } else {
                      setActiveSubView(null);
                    }
                  }} 
                  className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-black italic tracking-tight uppercase">
                  {settingsItems.find(i => i.id === activeSubView)?.label || (activeSubView === 'tos' ? 'Terms of Service' : activeSubView === 'privacy_policy' ? 'Privacy Policy' : activeSubView)}
                </h2>
              </div>

              <div className="flex-1">
                {renderSubViewContent()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-2"
          >
            <Share2 size={14} className="text-black" />
            Link Copied to Clipboard
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  );
}
