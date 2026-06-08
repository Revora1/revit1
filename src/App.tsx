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

import { CookieConsent } from './components/CookieConsent';
import { messaging } from './lib/firebase';
import { onMessage } from 'firebase/messaging';

export default function App() {
  return (
    <AuthProvider>
      <InnerAppContent />
      <CookieConsent />
    </AuthProvider>
  );
}

function InnerAppContent() {
  const { user, loading } = useAuth();
  
  // Parse shared post from URL query params
  const sharedPostId = React.useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('p') || params.get('postId');
    } catch {
      return null;
    }
  }, []);

  const [activeView, setActiveView] = useState<View>(sharedPostId ? 'post' : 'feed');
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetUsername, setTargetUsername] = useState<string | null>(null);
  const [targetPostId, setTargetPostId] = useState<string | null>(sharedPostId);
  const [autoOpenComments, setAutoOpenComments] = useState(false);
  const [targetChatInfo, setTargetChatInfo] = useState<{ chatId: string, otherUser: any, ts: number } | null>(null);
  const [initialProfileTab, setInitialProfileTab] = useState<'garage' | 'posts' | 'duo'>('garage');
  const [inboxTargetTab, setInboxTargetTab] = useState<'notifications' | 'messages' | 'garage' | 'leaderboards' | 'leaderboards-dyno' | null>(null);

  const prevViewRef = React.useRef<View>('feed');
  React.useEffect(() => {
    if (activeView !== 'post') {
      prevViewRef.current = activeView;
    }
  }, [activeView]);

  React.useEffect(() => {
    if (sharedPostId) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('p');
        url.searchParams.delete('postId');
        window.history.replaceState({}, document.title, url.toString());
      } catch (e) {
        console.error("Failed to clean up sharing URL params:", e);
      }
    }
  }, [sharedPostId]);

  React.useEffect(() => {
    const handleProfileNav = (e: any) => {
      const { userId, username, initialTab } = e.detail;
      setTargetUserId(userId || null);
      setTargetUsername(username || null);
      setInitialProfileTab(initialTab || 'garage');
      setActiveView('profile');
    };
    const handlePostNav = (e: any) => {
      const { postId, openComments } = e.detail;
      setTargetPostId(postId);
      setAutoOpenComments(!!openComments);
      setActiveView('post');
    };
    const handleChatNav = (e: any) => {
      const { chatId, otherUser } = e.detail;
      setTargetChatInfo({ chatId, otherUser, ts: Date.now() });
      setInboxTargetTab('messages');
      setActiveView('inbox');
    };
    const handleInboxNav = (e?: any) => {
      const tab = e?.detail?.tab || 'notifications';
      setInboxTargetTab(tab);
      setActiveView('inbox');
    };
    const handleDynoNav = () => {
      setInboxTargetTab('leaderboards-dyno');
      setActiveView('inbox');
    };
    window.addEventListener('navigate-profile', handleProfileNav);
    window.addEventListener('navigate-post', handlePostNav);
    window.addEventListener('navigate-chat', handleChatNav);
    window.addEventListener('navigate-inbox', handleInboxNav);
    window.addEventListener('navigate-dyno', handleDynoNav);
    return () => {
      window.removeEventListener('navigate-profile', handleProfileNav);
      window.removeEventListener('navigate-post', handlePostNav);
      window.removeEventListener('navigate-chat', handleChatNav);
      window.removeEventListener('navigate-inbox', handleInboxNav);
      window.removeEventListener('navigate-dyno', handleDynoNav);
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

  return content;
}
