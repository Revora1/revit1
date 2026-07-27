import { AgeAssuranceView } from "./components/AgeAssuranceView";
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
import { CommunityGarageView } from './components/CommunityGarageView';
import { TopTuners } from './components/TopTuners';
import { SettingsModal } from './components/SettingsModal';

import { CookieConsent } from './components/CookieConsent';
import { messaging } from './lib/firebase';
import { onMessage } from 'firebase/messaging';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { UserGuide } from './components/UserGuide';
import { SupportView } from './components/SupportView';
import { admobService } from './lib/admobService';
import { AdMobOverlays } from './components/AdMobOverlays';
import { AppTrackingTransparency } from '@capgo/capacitor-app-tracking-transparency';
import { Capacitor } from '@capacitor/core';
import { ATTPrompt } from './components/ATTPrompt';

export default function App() {
  const [isPrivacyRoute, setIsPrivacyRoute] = useState(false);
  const [isGuideRoute, setIsGuideRoute] = useState(false);
  const [isSupportRoute, setIsSupportRoute] = useState(false);
  const [showATTPrompt, setShowATTPrompt] = useState(false);

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
    try {
      if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
        (window.screen.orientation as any).lock('portrait').catch((err: any) => {
          console.log("Orientation lock request failed:", err);
        });
      }
    } catch (e) {
      console.log("Orientation lock API not available:", e);
    }
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
      <InnerAppContent />
      <CookieConsent />
      <AdMobOverlays />
      {showATTPrompt && <ATTPrompt onComplete={() => setShowATTPrompt(false)} />}
    </AuthProvider>
  );
}

function InnerAppContent() {
  const { user, profile, loading, error, logout } = useAuth();
  
  const isKid = React.useMemo(() => {
    if (!profile?.birthdate) return false;
    const dob = new Date(profile.birthdate);
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970) < 16;
  }, [profile?.birthdate]);

  // Parse shared post from URL query params
  const sharedPostId = React.useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('p') || params.get('postId');
    } catch {
      return null;
    }
  }, []);

  // Parse shared user from URL query params
  const sharedUsername = React.useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('u') || params.get('username');
    } catch {
      return null;
    }
  }, []);

  const [activeView, setActiveView] = useState<View>(
    sharedPostId ? 'post' : sharedUsername ? 'profile' : 'feed'
  );
  const [showSettings, setShowSettings] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetUsername, setTargetUsername] = useState<string | null>(sharedUsername);
  const [targetPostId, setTargetPostId] = useState<string | null>(sharedPostId);
  const [autoOpenComments, setAutoOpenComments] = useState(false);
  const [targetChatInfo, setTargetChatInfo] = useState<{ chatId: string, otherUser: any, ts: number } | null>(null);
  const [initialProfileTab, setInitialProfileTab] = useState<'garage' | 'posts' | 'duo'>('garage');
  const [inboxTargetTab, setInboxTargetTab] = useState<'notifications' | 'messages' | 'garage' | 'leaderboards' | 'leaderboards-dyno' | null>(null);

  React.useEffect(() => {
    if (isKid && activeView === 'feed') {
      setActiveView('search');
    }
  }, [isKid, activeView]);
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
  }, [activeView, targetUserId, targetUsername, targetPostId, initialProfileTab, inboxTargetTab]);

  const prevViewRef = React.useRef<View>('feed');
  React.useEffect(() => {
    if (activeView !== 'post') {
      prevViewRef.current = activeView;
    }
  }, [activeView]);

  React.useEffect(() => {
    if (sharedPostId || sharedUsername) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('p');
        url.searchParams.delete('postId');
        url.searchParams.delete('u');
        url.searchParams.delete('username');
        window.history.replaceState({}, document.title, url.toString());
      } catch (e) {
        console.error("Failed to clean up sharing URL params:", e);
      }
    }
  }, [sharedPostId, sharedUsername]);

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
      setInboxTargetTab('messages');
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
          // If no history, default back to feed or search
          setActiveView(isKid ? 'search' : 'feed');
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
    window.addEventListener('navigate-back', handleNavigateBack);
    window.addEventListener('open-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('navigate-profile', handleProfileNav);
      window.removeEventListener('navigate-post', handlePostNav);
      window.removeEventListener('navigate-chat', handleChatNav);
      window.removeEventListener('navigate-inbox', handleInboxNav);
      window.removeEventListener('navigate-dyno', handleDynoNav);
      window.removeEventListener('navigate-back', handleNavigateBack);
      window.removeEventListener('open-settings', handleOpenSettings);
    };
  }, [isKid]);

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
    if (view !== 'profile') {
      setTargetUserId(null);
      setTargetUsername(null);
    }
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
  } else if (profile && !profile.birthdate) {
    content = <AgeAssuranceView />;
  } else {
    content = (
      <Layout activeView={activeView} onViewChange={handleViewChange}>
        {activeView === 'feed' && <Feed />}
        {activeView === 'search' && <SearchView />}
        {activeView === 'dyno' && <DynoBoard />}
        {activeView === 'garage' && <CommunityGarageView />}
        {activeView === 'tuners' && <TopTuners />}
        {activeView === 'upload' && <UploadView onComplete={() => setActiveView('feed')} />}
        {activeView === 'inbox' && <InboxView initialTab={inboxTargetTab || undefined} initialChat={targetChatInfo || undefined} />}
        {activeView === 'profile' && (
          <Profile 
            userId={targetUserId || undefined} 
            username={targetUsername || undefined} 
            initialTab={initialProfileTab} 
          />
        )}
        {activeView === 'post' && targetPostId && <SinglePostView postId={targetPostId} onBack={() => setActiveView(prevViewRef.current)} autoOpenComments={autoOpenComments} />}
      </Layout>
    );
  }

  return (
    <>
      {content}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
