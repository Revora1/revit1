import React, { useEffect, useState, useRef } from 'react';
import { Home, Search, PlusSquare, Inbox, User, Trophy, Car as CarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type View = 'feed' | 'search' | 'upload' | 'inbox' | 'profile' | 'post' | 'dyno' | 'garage';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  onViewChange: (view: View) => void;
}

export function Layout({ children, activeView, onViewChange }: LayoutProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );
    const unSub = onSnapshot(q, (snap) => {
      let unread = 0;
      snap.docs.forEach(document => {
        if (document.data().read === false) unread++;
      });
      setUnreadCount(unread);

      if (!initialLoadRef.current) {
        snap.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const docData = change.doc.data();
            if (docData.type === 'message' && docData.actorId !== user.uid) {
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  const actorSnap = await getDoc(doc(db, 'users', docData.actorId));
                  const actorName = actorSnap.exists() ? actorSnap.data().username : 'Someone';
                  const notif = new Notification('New Message', {
                    body: `${actorName} sent you a message.`
                  });
                  notif.onclick = async () => {
                    window.focus();
                    const chatId1 = `${user.uid}_${docData.actorId}`;
                    const chatId2 = `${docData.actorId}_${user.uid}`;
                    let chatId = null;
                    const snap1 = await getDoc(doc(db, 'chats', chatId1));
                    if (snap1.exists()) {
                      chatId = chatId1;
                    } else {
                      const snap2 = await getDoc(doc(db, 'chats', chatId2));
                      if (snap2.exists()) {
                        chatId = chatId2;
                      }
                    }
                    if (chatId) {
                      const otherUser = actorSnap.exists() ? { id: actorSnap.id, ...actorSnap.data() } : null;
                      window.dispatchEvent(new CustomEvent('navigate-chat', { 
                       detail: { chatId, otherUser } 
                      }));
                    }
                  };
                } catch (e) {
                  const notif = new Notification('New Message', {
                    body: 'You received a new message.'
                  });
                  notif.onclick = () => {
                    window.focus();
                    window.dispatchEvent(new CustomEvent('navigate-inbox'));
                  };
                }
              }
            }
          }
        });
      } else {
        initialLoadRef.current = false;
      }
    });
    return unSub;
  }, [user]);

  const navItems = [
    { id: 'feed', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'garage', icon: CarIcon, label: 'Garage' },
    { id: 'upload', icon: PlusSquare, label: 'Post' },
    { id: 'inbox', icon: Inbox, label: 'Inbox' },
    { id: 'profile', icon: User, label: 'Profile' },
  ] as const;

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white font-sans overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="pb-[max(0px,env(safe-area-inset-bottom))] min-h-[64px] h-[calc(64px+env(safe-area-inset-bottom,0px))] border-t border-zinc-800 flex items-center justify-around px-4 bg-black/90 backdrop-blur-md z-50 relative">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => onViewChange(id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors relative w-16",
              activeView === id ? "text-white" : "text-zinc-500"
            )}
          >
            <div className="relative">
              <Icon size={24} />
              {id === 'inbox' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
