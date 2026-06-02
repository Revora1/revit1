import React, { useState, useEffect } from 'react';
import { MessagesView } from './MessagesView';
import { NotificationsView } from './NotificationsView';

export function InboxView({ initialChat }: { initialChat?: { chatId: string, otherUser: any, ts?: number } }) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'messages'>(initialChat ? 'messages' : 'notifications');

  useEffect(() => {
    if (initialChat) {
      setActiveTab('messages');
    }
  }, [initialChat]);

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header with Tabs */}
      <div className="p-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur sticky top-0 z-10">
        <div className="flex justify-center bg-zinc-900 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${
              activeTab === 'notifications' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Alerts
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${
              activeTab === 'messages' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Messages
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'notifications' ? (
          <NotificationsView hideHeader />
        ) : (
          <MessagesView 
            hideHeader 
            initialChatId={initialChat?.chatId} 
            initialOtherUser={initialChat?.otherUser} 
            navKey={initialChat?.ts}
          />
        )}
      </div>
    </div>
  );
}
