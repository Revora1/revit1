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

import { CookieConsent } from './components/CookieConsent';

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
  const [activeView, setActiveView] = useState<View>('feed');
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetUsername, setTargetUsername] = useState<string | null>(null);
  const [targetPostId, setTargetPostId] = useState<string | null>(null);
  const [autoOpenComments, setAutoOpenComments] = useState(false);
  const [targetChatInfo, setTargetChatInfo] = useState<{ chatId: string, otherUser: any, ts: number } | null>(null);

  React.useEffect(() => {
    const handleProfileNav = (e: any) => {
      const { userId, username } = e.detail;
      setTargetUserId(userId || null);
      setTargetUsername(username || null);
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
      setActiveView('inbox');
    };
    const handleInboxNav = () => {
      setActiveView('inbox');
    };
    const handleDynoNav = () => {
      setActiveView('dyno');
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

  const handleViewChange = (view: View) => {
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
        {activeView === 'upload' && <UploadView onComplete={() => setActiveView('feed')} />}
        {activeView === 'inbox' && <InboxView initialChat={targetChatInfo || undefined} />}
        {activeView === 'profile' && <Profile userId={targetUserId || undefined} username={targetUsername || undefined} />}
        {activeView === 'post' && targetPostId && <SinglePostView postId={targetPostId} onBack={() => setActiveView('inbox')} autoOpenComments={autoOpenComments} />}
      </Layout>
    );
  }

  return content;
}
