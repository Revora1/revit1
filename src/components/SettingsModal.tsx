import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, LogOut, Shield, Bell, HelpCircle, UserX, Moon, Smartphone, ChevronLeft, Trash2, Database, Info, Share2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { deleteUser } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType, requestNotificationPermissionAndGetToken } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

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

import { PrivacyPolicy } from './PrivacyPolicy';

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { user, logout } = useAuth();
  const [activeSubView, setActiveSubView] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [consent, setConsent] = useState(localStorage.getItem('gdpr-consent') || 'none');

  const toggleConsent = () => {
    const next = consent === 'accepted' ? 'declined' : 'accepted';
    localStorage.setItem('gdpr-consent', next);
    setConsent(next);
    // Reload to apply script changes
    window.location.reload();
  };

  if (showPrivacy) {
    return <PrivacyPolicy onBack={() => setShowPrivacy(false)} />;
  }

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);

    const shareData = {
      title: 'RevitUp',
      text: 'Join me on RevitUp - The Social Garage for Car Enthusiasts!',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      }
    } catch (error: any) {
      // Ignore AbortError (user cancelled)
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    } finally {
      setSharing(false);
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

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000); // reset after 3s
      return;
    }
    
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid));
        await deleteUser(user);
        onClose();
      } catch (error: any) {
        if (error?.code === 'auth/requires-recent-login') {
          console.error("Please log out and log back in again before deleting your account.");
        } else {
          console.error("Failed to delete account. Please try again.", error);
        }
      }
    }
  };

  const settingsItems = [
    { id: 'notifications', icon: Bell, label: 'Notifications', description: 'Manage push alerts' },
    { id: 'privacy', icon: Shield, label: 'Privacy', description: 'Who can see your garage' },
    { id: 'appearance', icon: Moon, label: 'Appearance', description: 'Dark mode, themes' },
    { id: 'data', icon: Database, label: 'Data & Storage', description: 'Manage cache & data usage' },
    { id: 'devices', icon: Smartphone, label: 'Connected Devices', description: 'Manage active sessions' },
    { id: 'support', icon: HelpCircle, label: 'Support', description: 'Get help with RevItUp' },
    { id: 'about', icon: Info, label: 'About', description: 'App version, terms, privacy policy' },
  ];

  const renderSubViewContent = () => {
    switch (activeSubView) {
      case 'notifications':
        const handlePushToggle = async (enabled: boolean) => {
          if (enabled && user) {
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

        const defaultPushChecked = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';

        const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(window.navigator.userAgent);
        const isStandalone = typeof window !== 'undefined' && (
          (window.navigator as any).standalone || 
          window.matchMedia('(display-mode: standalone)').matches
        );
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
                  <span className={`font-black uppercase text-[10px] ${currentPermission === 'granted' ? 'text-green-400' : 'text-zinc-400'}`}>
                    {currentPermission === 'granted' ? '● Active' : currentPermission === 'denied' ? '● Blocked/Denied' : '● Not Configured'}
                  </span>
                </div>
                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-900">
                  <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wide">App Mode</span>
                  <span className={`font-black uppercase text-[10px] ${isStandalone ? 'text-blue-400' : 'text-yellow-500'}`}>
                    {isStandalone ? 'Standalone PWA' : 'Web Browser'}
                  </span>
                </div>
              </div>

              {/* iOS Mobile-Specific Troubleshooting Instructions */}
              {isIOS && !isStandalone && (
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

              {/* Android & general troubleshooting instructions */}
              {(!isIOS || isStandalone) && currentPermission !== 'granted' && (
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
            <ToggleItem label="Private Profile" description="Only approved followers can see your builds" />
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
          <div className="space-y-6">
            <div className="space-y-4">
              <ToggleItem label="Push Notifications" description="Get notified on new likes and follows" defaultChecked />
              <ToggleItem label="High Quality Media" description="Always upload and view high-res photos" />
            </div>
            <div className="h-px bg-zinc-800" />
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm">Cache Storage</span>
                <span className="text-xs text-zinc-500">124 MB</span>
              </div>
              <p className="text-xs text-zinc-500 mb-4">Clear cache to free up space. This won't delete your posts or cars.</p>
              <button className="w-full bg-zinc-900 border border-zinc-800 text-white font-bold text-sm py-3 rounded-2xl hover:bg-zinc-800 transition-colors">
                 Clear Cache
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
      case 'about':
        return (
          <div className="space-y-6 text-center py-4">
             <div className="w-20 h-20 bg-zinc-900 rounded-3xl mx-auto flex items-center justify-center mb-4">
               <span className="text-2xl font-black italic tracking-tighter">R</span>
             </div>
             <div>
                <h3 className="font-black text-xl italic tracking-tight">REVITUP</h3>
                <p className="text-zinc-500 text-xs">Version 1.0.0 (Build 492)</p>
             </div>
             
             <div className="space-y-2 pt-4">
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
          <div className="space-y-4 text-sm text-zinc-400 max-h-[60vh] overflow-y-auto scrollbar-hide">
            <p className="font-bold text-white mb-2">Last Updated: May 5, 2026</p>
            <p>RevItUp ("us", "we", or "our") operates this application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>
            <p className="font-bold text-white mt-4">1. Information Collection and Use</p>
            <p>We collect several different types of information for various purposes to provide and improve our Service to you. Types of Data collected include Email address, First name and last name, Phone number, and Usage Data.</p>
            <p className="font-bold text-white mt-4">2. Use of Data</p>
            <p>RevItUp uses the collected data for various purposes: To provide and maintain the Service, to notify you about changes to our Service, to allow you to participate in interactive features of our Service when you choose to do so, to provide customer care and support, and to monitor the usage of the Service.</p>
            <p className="font-bold text-white mt-4">3. Transfer of Data</p>
            <p>Your information, including Personal Data, may be transferred to — and maintained on — computers located outside of your state, province, country or other governmental jurisdiction where the data protection laws may differ than those from your jurisdiction.</p>
            <p className="font-bold text-white mt-4">4. Security of Data</p>
            <p>The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg bg-zinc-950 rounded-t-[32px] sm:rounded-3xl border border-zinc-800 p-8 pt-6 space-y-8 max-h-[90vh] flex flex-col relative shadow-2xl"
      >
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 scroll-smooth">
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
                RevItUp v1.0.0 • Google Cloud Edition
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
                    if (activeSubView === 'tos' || activeSubView === 'privacy_policy') {
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
