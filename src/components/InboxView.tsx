import React, { useState, useEffect } from 'react';
import { MessagesView } from './MessagesView';
import { NotificationsView } from './NotificationsView';
import { CommunityGarageView } from './CommunityGarageView';
import { TopTuners } from './TopTuners';
import { DynoBoard } from './DynoBoard';

export function InboxView({ 
  initialTab, 
  initialChat 
}: { 
  initialTab?: 'notifications' | 'messages' | 'garage' | 'leaderboards' | 'leaderboards-dyno', 
  initialChat?: { chatId: string, otherUser: any, ts?: number } 
}) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'messages' | 'garage' | 'leaderboards'>(
    initialTab === 'leaderboards-dyno' 
      ? 'leaderboards' 
      : (initialTab as any || (initialChat ? 'messages' : 'notifications'))
  );
  const [leaderboardSubTab, setLeaderboardSubTab] = useState<'rep' | 'dyno'>(
    initialTab === 'leaderboards-dyno' ? 'dyno' : 'rep'
  );

  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'leaderboards-dyno') {
        setActiveTab('leaderboards');
        setLeaderboardSubTab('dyno');
      } else {
        setActiveTab(initialTab as any);
      }
    } else if (initialChat) {
      setActiveTab('messages');
    }
  }, [initialTab, initialChat]);

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header with Tabs */}
      <div className="p-3 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur sticky top-0 z-30">
        <div className="flex justify-around bg-zinc-900 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${
              activeTab === 'notifications' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Alerts
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${
              activeTab === 'messages' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab('garage')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${
              activeTab === 'garage' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Garage
          </button>
          <button
            onClick={() => setActiveTab('leaderboards')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${
              activeTab === 'leaderboards' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Ranks
          </button>
        </div>

        {activeTab === 'leaderboards' && (
          <div className="flex bg-zinc-950 p-1 rounded-lg mt-2 border border-zinc-900 gap-1 select-none">
            <button
              onClick={() => setLeaderboardSubTab('rep')}
              className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-widest rounded-md transition-all ${
                leaderboardSubTab === 'rep' 
                  ? 'bg-zinc-900 text-white border border-zinc-800/50' 
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              Tuner Rep
            </button>
            <button
              onClick={() => setLeaderboardSubTab('dyno')}
              className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-widest rounded-md transition-all ${
                leaderboardSubTab === 'dyno' 
                  ? 'bg-zinc-900 text-white border border-zinc-800/50' 
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              Perf. Board
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden h-full">
        {activeTab === 'notifications' && (
          <NotificationsView hideHeader />
        )}
        {activeTab === 'messages' && (
          <MessagesView 
            hideHeader 
            initialChatId={initialChat?.chatId} 
            initialOtherUser={initialChat?.otherUser} 
            navKey={initialChat?.ts}
          />
        )}
        {activeTab === 'garage' && (
          <div className="h-full overflow-y-auto">
            <CommunityGarageView hideHeader />
          </div>
        )}
        {activeTab === 'leaderboards' && (
          <div className="h-full overflow-y-auto">
            {leaderboardSubTab === 'rep' ? (
              <TopTuners hideHeader />
            ) : (
              <DynoBoard hideHeader />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
