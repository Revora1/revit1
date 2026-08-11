import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout, View } from './components/Layout';
import { AuthView } from './components/AuthView';
import { Feed } from './components/Feed';
import { Profile } from './components/Profile';
import { UploadView } from './components/UploadView';
import { SearchView } from './components/SearchView';
import { InboxView } from './components/InboxView';
import { SinglePostView } from './components/SinglePostView';
import { DynoBoard } from './components/DynoBoard';
import { GiveawaysView } from './components/GiveawaysView';
import { CommunityGarageView } from './components/CommunityGarageView';
import { TopTuners } from './components/TopTuners';
import { SettingsModal } from './components/SettingsModal';
import { AnimatePresence } from 'motion/react';
import { GroupsView } from './components/GroupsView';
import { GroupDetailView } from './components/GroupDetailView';
import { MarketplaceView } from './components/MarketplaceView';

import { CookieConsent } from './components/CookieConsent';
import { db, messaging } from './lib/firebase';
import { onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { UserGuide } from './components/UserGuide';
import { SupportView } from './components/SupportView';
import { admobService } from './lib/admobService';
import { AdMobOverlays } from './components/AdMobOverlays';
import { AppTrackingTransparency } from '@capgo/capacitor-app-tracking-transparency';
import { Capacitor } from '@capacitor/core';
import { ATTPrompt } from './components/ATTPrompt';
import { PushNotifications } from '@capacitor/push-notifications';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Apple, X } from 'lucide-react';

export default function App() {
  const [isPrivacyRoute, setIsPrivacyRoute] = useState(false);
  const [isGuideRoute, setIsGuideRoute] = useState(false);
  const [isSupportRoute, setIsSupportRoute] = useState(false);
  const [showATTPrompt, setShowATTPrompt] = useState(false);
  const [showAppBanner, setShowAppBanner] = useState(true);

  const isWeb = Capacitor.getPlatform() === 'web';

  React.useEffect(() => {
    // Request ATT if on iOS
    const requestATT = async () => {
      if (Capacitor.getPlatform() === 'ios') {
        try {
          const status = await AppTrackingTransparency.getStatus();
          if (status.status === 'notDetermined') {
            setShowATTPrompt(true);
          }
        } catch (e) {
          console.log("Failed to request ATT permission:", e);
        }
      }
    };
    requestATT();

    // Initialize AdMob on app startup
    admobService.initialize();

    // Lock screen orientation to portrait if supported
    const lockOrientation = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          await ScreenOrientation.lock({ orientation: 'portrait' });
        } else if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
          await (window.screen.orientation as any).lock('portrait');
        }
      } catch (e) {
        // Silent catch: fails in AI Studio iframe sandbox, but works on native
      }
    };
    lockOrientation();
  }, []);

  React.useEffect(() => {
    try {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
      if (path === '/privacy-policy') {
        setIsPrivacyRoute(true);
      } else if (path === '/guide' || path === '/how-to-use' || path === '/help') {
        setIsGuideRoute(true);
      } else if (path === '/support') {
        setIsSupportRoute(true);
      }
    } catch (e) {
      console.error("Failed to parse pathname:", e);
    }
  }, []);

  if (isPrivacyRoute) {
    return (
      <div className="h-screen w-full overflow-y-auto bg-black text-white">
        <PrivacyPolicy onBack={() => {
          window.location.href = '/';
        }} />
      </div>
    );
  }

  if (isGuideRoute) {
    return (
      <div className="h-screen w-full overflow-y-auto bg-black text-white">
        <UserGuide onBack={() => {
          window.location.href = '/';
        }} />
      </div>
    );
  }

  if (isSupportRoute) {
    return (
      <div className="h-screen w-full overflow-y-auto bg-black text-white">
        <SupportView onBack={() => {
          window.location.href = '/';
        }} />
      </div>
    );
  }

  return (
    <AuthProvider>
      <div className="flex flex-col h-screen w-full overflow-hidden">
        {isWeb && showAppBanner && (
          <div className="bg-zinc-900 border-b border-zinc-800 z-[200] p-3 flex items-center justify-between shadow-xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-black p-2 rounded-xl">
                 <Apple size={20} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold leading-none mb-0.5">RevitUp for iOS</span>
                <span className="text-sm font-black text-white tracking-tight leading-none">Get the Mobile App</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href="https://apps.apple.com/gb/app/revitup/id6791627706" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-transform"
              >
                GET
              </a>
              <button onClick={() => setShowAppBanner(false)} className="text-zinc-500 p-1 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-hidden relative">
          <InnerAppContent />
        </div>
      </div>
      <CookieConsent />
      <AdMobOverlays />
      {showATTPrompt && <ATTPrompt onComplete={() => setShowATTPrompt(false)} />}
    </AuthProvider>
  );
}

function InnerAppContent() {
  const { user, profile, loading, error, logout } = useAuth();
  
  React.useEffect(() => {
    if (user && Capacitor.getPlatform() !== 'web') {
      const registerPush = async () => {
        try {
          let permStatus = await PushNotifications.checkPermissions();
          
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }
          
          if (permStatus.receive === 'granted') {
            await PushNotifications.register();
          }
        } catch (e) {
          console.error("Push registration failed", e);
        }
      };
      
      registerPush();

      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token: ' + token.value);
        if (user) {
          try {
            await updateDoc(doc(db, 'users', user.uid), { fcmToken: token.value });
          } catch (e) {
            console.error("Error saving FCM token:", e);
          }
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.log('Error on registration: ' + JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
      });
      
      return () => {
        PushNotifications.removeAllListeners();
      };
    }
  }, [user]);

  // Parse URL parameters simultaneously
  const { initialView, initialPostId, initialUsername, refCode } = React.useMemo<{
    initialView: View;
    initialPostId: string | null;
    initialUsername: string | null;
    refCode: string | null;
  }>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('p') || params.get('postId');
      const ref = params.get('ref');
      
      let view: View = 'feed';
      let username = null;

      if (p) {
        view = 'post';
      } else if (ref) {
        view = 'profile';
        username = ref;
      }

      return {
        initialView: view,
        initialPostId: p,
        initialUsername: username,
        refCode: ref
      };
    } catch {
      return { initialView: 'feed', initialPostId: null, initialUsername: null, refCode: null };
    }
  }, []);

  // Handle URL side-effects
  React.useEffect(() => {
    try {
      if (refCode) {
        sessionStorage.setItem('referralCode', refCode);
      }
      
      // Clean URL after parsing deep links
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {}
  }, [refCode]);

  const [activeView, setActiveView] = useState<View>(initialView);
  const [showSettings, setShowSettings] = useState(false);
  const [showGiveaways, setShowGiveaways] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetUsername, setTargetUsername] = useState<string | null>(initialUsername);
  const [targetPostId, setTargetPostId] = useState<string | null>(initialPostId);
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [autoOpenComments, setAutoOpenComments] = useState(false);
  const [targetChatInfo, setTargetChatInfo] = useState<{ chatId: string, otherUser: any, ts: number } | null>(null);
  const [initialProfileTab, setInitialProfileTab] = useState<'garage' | 'posts' | 'duo'>('garage');
  const [inboxTargetTab, setInboxTargetTab] = useState<'notifications' | 'messages' | 'garage' | 'leaderboards' | 'leaderboards-dyno' | null>(null);

  const [navigationHistory, setNavigationHistory] = useState<{
    view: View;
    targetUserId: string | null;
    targetUsername: string | null;
    targetPostId: string | null;
    initialProfileTab: 'garage' | 'posts' | 'duo';
    inboxTargetTab: 'notifications' | 'messages' | 'garage' | 'leaderboards' | 'leaderboards-dyno' | null;
  }[]>([]);

  const stateRef = React.useRef({
    view: activeView,
    targetUserId,
    targetUsername,
    targetPostId,
    initialProfileTab,
    inboxTargetTab
  });

  React.useEffect(() => {
    stateRef.current = {
      view: activeView,
      targetUserId,
      targetUsername,
      targetPostId,
      initialProfileTab,
      inboxTargetTab
    };
  }, [activeView, targetUserId, targetUsername, targetPostId, targetGroupId, initialProfileTab, inboxTargetTab]);

  
  React.useEffect(() => {
    (window as any).openGroupsView = () => setActiveView('groups');
    (window as any).openMarketplace = () => setActiveView('marketplace');
    (window as any).openGroupDetail = (groupId: string) => {
      setTargetGroupId(groupId);
      setActiveView('group_detail');
    };
  }, []);

  const prevViewRef = React.useRef<View>('feed');
  React.useEffect(() => {
    if (activeView !== 'post') {
      prevViewRef.current = activeView;
    }
  }, [activeView]);



  React.useEffect(() => {
    const handleProfileNav = (e: any) => {
      const { userId, username, initialTab } = e.detail;
      setNavigationHistory(prev => [
        ...prev,
        { ...stateRef.current }
      ]);
      setTargetUserId(userId || null);
      setTargetUsername(username || null);
      setInitialProfileTab(initialTab || 'garage');
      setActiveView('profile');
    };
    const handlePostNav = (e: any) => {
      const { postId, openComments } = e.detail;
      setNavigationHistory(prev => [
        ...prev,
        { ...stateRef.current }
      ]);
      setTargetPostId(postId);
      setAutoOpenComments(!!openComments);
      setActiveView('post');
    };
    const handleChatNav = (e: any) => {
      const { chatId, otherUser } = e.detail;
      setNavigationHistory(prev => [
        ...prev,
        { ...stateRef.current }
      ]);
      setTargetChatInfo({ chatId, otherUser, ts: Date.now() });
      console.log("NAVIGATE CHAT FIRED!"); setInboxTargetTab('messages');
      setActiveView('inbox');
    };
    const handleInboxNav = (e?: any) => {
      const tab = e?.detail?.tab || 'notifications';
      setNavigationHistory(prev => [
        ...prev,
        { ...stateRef.current }
      ]);
      setInboxTargetTab(tab);
      setActiveView('inbox');
    };
    const handleGiveawayNav = () => {
      setShowGiveaways(true);
    };

    const handleDynoNav = () => {
      setNavigationHistory(prev => [
        ...prev,
        { ...stateRef.current }
      ]);
      setInboxTargetTab('leaderboards-dyno');
      setActiveView('inbox');
    };
    const handleNavigateBack = () => {
      setNavigationHistory(prev => {
        if (prev.length === 0) {
          // If no history, default back to feed
          setActiveView('feed');
          setTargetUserId(null);
          setTargetUsername(null);
          setTargetPostId(null);
          setInboxTargetTab(null);
          return [];
        }
        const newHistory = [...prev];
        const lastState = newHistory.pop()!;
        
        setActiveView(lastState.view);
        setTargetUserId(lastState.targetUserId);
        setTargetUsername(lastState.targetUsername);
        setTargetPostId(lastState.targetPostId);
        setInitialProfileTab(lastState.initialProfileTab);
        setInboxTargetTab(lastState.inboxTargetTab);

        return newHistory;
      });
    };
    const handleOpenSettings = () => {
      setShowSettings(true);
    };
    window.addEventListener('navigate-profile', handleProfileNav);
    window.addEventListener('navigate-post', handlePostNav);
    window.addEventListener('navigate-chat', handleChatNav);
    window.addEventListener('navigate-inbox', handleInboxNav);
    window.addEventListener('navigate-dyno', handleDynoNav);
    window.addEventListener('navigate-giveaway', handleGiveawayNav);
    window.addEventListener('navigate-back', handleNavigateBack);
    window.addEventListener('open-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('navigate-profile', handleProfileNav);
      window.removeEventListener('navigate-post', handlePostNav);
      window.removeEventListener('navigate-chat', handleChatNav);
      window.removeEventListener('navigate-inbox', handleInboxNav);
      window.removeEventListener('navigate-dyno', handleDynoNav);
      window.removeEventListener('navigate-giveaway', handleGiveawayNav);
      window.removeEventListener('navigate-back', handleNavigateBack);
      window.removeEventListener('open-settings', handleOpenSettings);
    };
  }, []);

  React.useEffect(() => {
    if (!messaging) return;
    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('FCM Foreground message received:', payload);
        const title = payload.notification?.title || payload.data?.title || 'RevItUp';
        const body = payload.notification?.body || payload.data?.body || 'New update in your social garage!';
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body: body,
            icon: '/screenshot.png'
          });
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Could not register onMessage listener:", e);
    }
  }, []);

  const handleViewChange = (view: View) => {
    if (view === 'garage') {
      setInboxTargetTab('garage');
      setActiveView('inbox');
      return;
    }
    if (view === 'tuners') {
      setInboxTargetTab('leaderboards');
      setActiveView('inbox');
      return;
    }
    if (view === 'dyno') {
      setInboxTargetTab('leaderboards-dyno');
      setActiveView('inbox');
      return;
    }

    setActiveView(view);
    setTargetUserId(null);
    setTargetUsername(null);

    if (view !== 'post') {
      setTargetPostId(null);
      setAutoOpenComments(false);
    }
    if (view !== 'inbox') {
      setTargetChatInfo(null);
      setInboxTargetTab(null);
    }
  };

  let content;
  if (loading) {
    content = (
      <div className="h-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  } else if (user && !profile) {
    content = (
      <div className="h-full bg-black flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">PROFILE LOADING ISSUE</h2>
          <p className="text-zinc-400 max-w-sm text-sm">
            {error || "We encountered a problem sync-loading your profile. Please check your internet connection or try again."}
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-white text-black rounded-lg font-bold hover:bg-zinc-200 transition-colors cursor-pointer text-xs uppercase tracking-wider"
          >
            RETRY
          </button>
          <button
            onClick={logout}
            className="px-6 py-2.5 bg-zinc-900 text-white rounded-lg font-bold border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer text-xs uppercase tracking-wider"
          >
            SIGN OUT
          </button>
        </div>
      </div>
    );
  } else if (!user) {
    content = <AuthView />;
  } else {
    content = (
      <Layout activeView={activeView} onViewChange={handleViewChange}>
        {activeView === 'feed' && <Feed />}
        {activeView === 'search' && <SearchView />}
        {activeView === 'dyno' && <DynoBoard />}
        {activeView === 'garage' && <CommunityGarageView />}
        {activeView === 'tuners' && <TopTuners />}
        {activeView === 'upload' && <UploadView onComplete={() => setActiveView('feed')} />}
        {activeView === 'inbox' && <InboxView initialTab={inboxTargetTab || undefined} initialChat={targetChatInfo || undefined} canGoBack={navigationHistory.length > 0} />}
        {activeView === 'profile' && (
          <Profile 
            userId={targetUserId || undefined} 
            username={targetUsername || undefined} 
            initialTab={initialProfileTab} 
            canGoBack={navigationHistory.length > 0}
          />
        )}
        {activeView === 'post' && targetPostId && <SinglePostView postId={targetPostId} onBack={() => setActiveView(prevViewRef.current)} autoOpenComments={autoOpenComments} />}
        {activeView === 'groups' && <GroupsView onBack={() => setActiveView('search')} onSelectGroup={(groupId) => { setTargetGroupId(groupId); setActiveView('group_detail'); }} />}
        {activeView === 'marketplace' && <MarketplaceView onBack={() => setActiveView('search')} />}
        {activeView === 'group_detail' && targetGroupId && <GroupDetailView groupId={targetGroupId} onBack={() => setActiveView('groups')} onNavigateProfile={(uid) => { setTargetUserId(uid); setActiveView('profile'); }} />}
        {activeView === 'giveaway' && <GiveawaysView onBack={() => setActiveView(prevViewRef.current || 'feed')} />}

      </Layout>
    );
  }

  return (
    <>
      {content}
      <AnimatePresence>
        {showGiveaways && <GiveawaysView onBack={() => setShowGiveaways(false)} />}
      </AnimatePresence>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <div id="modal-root" className="absolute inset-0 pointer-events-none z-[100] [&>*]:pointer-events-auto" />
    </>
  );
}
