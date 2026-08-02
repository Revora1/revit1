import React, { useEffect, useState, useRef } from 'react';
import { Home, Search, PlusSquare, Inbox, User, Trophy, Car as CarIcon, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type View = 'feed' | 'search' | 'upload' | 'inbox' | 'profile' | 'post' | 'dyno' | 'garage' | 'tuners' | 'groups' | 'group_detail';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  onViewChange: (view: View) => void;
}

export function Layout({ children, activeView, onViewChange }: LayoutProps) {
  const { user, profile } = useAuth();
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
            if (docData.actorId !== user.uid) {
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  const actorSnap = await getDoc(doc(db, 'users', docData.actorId));
                  const actorName = actorSnap.exists() ? actorSnap.data().username : 'Someone';
                  
                  let title = 'New Alert';
                  let body = 'You have a new update in your social garage!';
                  
                  if (docData.type === 'message') {
                    title = 'New Message';
                    body = `${actorName} sent you a message.`;
                  } else if (docData.type === 'comment') {
                    title = 'New Comment';
                    body = `${actorName} commented: "${docData.text || ''}"`;
                  } else if (docData.type === 'like') {
                    title = 'Post Liked';
                    body = `${actorName} liked your build update.`;
                  } else if (docData.type === 'follow') {
                    title = 'New Follower';
                    body = `${actorName} is now following your garage.`;
                  }

                  const notif = new Notification(title, {
                    body: body
                  });

                  notif.onclick = async () => {
                    window.focus();
                    if (docData.type === 'message') {
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
                      } else {
                        window.dispatchEvent(new CustomEvent('navigate-inbox'));
                      }
                    } else if (docData.type === 'follow') {
                      window.dispatchEvent(new CustomEvent('navigate-profile', { detail: { userId: docData.actorId } }));
                    } else if (docData.postId) {
                      window.dispatchEvent(new CustomEvent('navigate-single-post', { detail: { postId: docData.postId } }));
                    } else {
                      window.dispatchEvent(new CustomEvent('navigate-inbox'));
                    }
                  };
                } catch (e) {
                  const title = docData.type === 'message' ? 'New Message' : 'New Notification';
                  const body = docData.type === 'message' ? 'You received a new message.' : 'Someone interacted with your profile.';
                  const notif = new Notification(title, { body });
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
    { id: 'feed', icon: Home, label: 'Home' } as const,
    { id: 'search', icon: Search, label: 'Search' } as const,
    { id: 'upload', icon: PlusSquare, label: 'Post' } as const,
    { id: 'inbox', icon: Inbox, label: 'Activities' } as const,
    { id: 'profile', icon: User, label: 'Profile' } as const,
  ];

  const selfScrollingViews: View[] = ['feed', 'upload', 'inbox', 'groups', 'group_detail'];
  const isSelfScrolling = selfScrollingViews.includes(activeView);

  return (
    <>
      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 relative w-full max-w-full overflow-x-hidden font-sans",
          isSelfScrolling 
            ? "overflow-hidden h-full pb-0" 
            : "overflow-y-auto pb-[calc(52px+env(safe-area-inset-bottom,0px))] h-full"
        )}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="mobile-navbar absolute bottom-0 left-0 right-0 select-none border-t border-zinc-900/60 flex items-center justify-around bg-black/95 backdrop-blur-md z-50 px-4 sm:px-8 pl-[calc(16px+env(safe-area-inset-left,0px))] pr-[calc(16px+env(safe-area-inset-right,0px))]">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => onViewChange(id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors relative w-12 sm:w-16",
              activeView === id ? "text-white" : "text-zinc-500"
            )}
          >
            <div className="relative">
              <Icon size={20} className="sm:w-6 sm:h-6" />
              {id === 'inbox' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-white text-black text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium leading-none">{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
