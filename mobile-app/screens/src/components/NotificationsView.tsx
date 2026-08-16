import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs, getDoc, doc, writeBatch, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Notification, UserProfile } from '../types';
import { Heart, MessageCircle, UserPlus, Bell, AtSign } from 'lucide-react';

export function NotificationsView({ hideHeader }: { hideHeader?: boolean }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actors, setActors] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let fetchedNotifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      fetchedNotifs.sort((a, b) => b.createdAt - a.createdAt);

      setNotifications(fetchedNotifs);

      // Fetch actors
      const newActors = { ...actors };
      const missingActors = new Set<string>();
      
      fetchedNotifs.forEach(notif => {
        if (!newActors[notif.actorId]) missingActors.add(notif.actorId);
      });

      if (missingActors.size > 0) {
         try {
           const usersRef = collection(db, 'users');
           const qUsers = query(usersRef, where('uid', 'in', Array.from(missingActors)));
           const usersSnap = await getDocs(qUsers);
           usersSnap.forEach(doc => {
             newActors[doc.id] = doc.data() as UserProfile;
           });
           setActors(newActors);
         } catch (error) {
           console.error('Error fetching actors for notifications:', error);
         }
      }

      setLoading(false);

      // Mark as read
      const unreadNotifs = fetchedNotifs.filter(n => !n.read);
      if (unreadNotifs.length > 0) {
        try {
          const batch = writeBatch(db);
          unreadNotifs.forEach(n => {
            batch.update(doc(db, 'notifications', n.id), { read: true });
          });
          await batch.commit();
        } catch (error) {
           console.error('Error marking notifications as read:', error);
        }
      }

    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return unsubscribe;
  // eslint-disable-next-react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div className="h-full bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full bg-black text-white overflow-y-auto pb-20">
      {!hideHeader && (
        <div className="p-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] border-b border-zinc-900 bg-zinc-950/50 backdrop-blur sticky top-0 z-10 flex items-center gap-3">
          <Bell size={24} />
          <h1 className="text-xl font-black italic tracking-tight">ALERTS</h1>
        </div>
      )}

      <div className="divide-y divide-zinc-900">
        {notifications.length === 0 ? (
           <div className="p-8 text-center text-zinc-500 font-medium flex flex-col items-center gap-2">
             <Bell size={32} className="opacity-20" />
             <p>No new notifications.</p>
           </div>
        ) : (
          notifications.map(notif => {
            const actor = actors[notif.actorId];
            const isRead = notif.read;

            let icon = null;
            let text = '';
            
            if (notif.type === 'like') {
              icon = <Heart size={16} fill="#ef4444" color="#ef4444" />;
              text = 'liked your post.';
            } else if (notif.type === 'comment') {
              icon = <MessageCircle size={16} className="text-blue-400" />;
              text = 'commented on your post.';
            } else if (notif.type === 'follow') {
              icon = <UserPlus size={16} className="text-emerald-400" />;
              text = 'started following you.';
            } else if (notif.type === 'message') {
              icon = <MessageCircle size={16} className="text-zinc-300" />;
              text = 'sent you a message.';
            } else if (notif.type === 'tag') {
              icon = <AtSign size={16} className="text-purple-400" />;
              text = notif.message || 'tagged you in a comment.';
            }

            const handleNotificationClick = async (e: React.MouseEvent) => {
              e.preventDefault();
              if (notif.type === 'message') {
                 // Try to resolve chat ID
                 const chatId1 = `${user?.uid}_${notif.actorId}`;
                 const chatId2 = `${notif.actorId}_${user?.uid}`;
                 
                 let chatId = null;
                 try {
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
                     window.dispatchEvent(new CustomEvent('navigate-chat', { 
                       detail: { chatId, otherUser: actor || { uid: notif.actorId } } 
                     }));
                   } else {
                     window.dispatchEvent(new CustomEvent('navigate-profile', { 
                       detail: { userId: notif.actorId } 
                     }));
                   }
                 } catch (e) {
                   console.error("Error routing to chat", e);
                 }
              } else if (notif.type === 'follow') {
                 // For follow, go to the actor's profile
                 window.dispatchEvent(new CustomEvent('navigate-profile', { 
                   detail: { userId: notif.actorId } 
                 }));
              } else if (notif.type === 'like' || notif.type === 'comment' || notif.type === 'tag') {
                 if (notif.postId) {
                   window.dispatchEvent(new CustomEvent('navigate-post', { 
                     detail: { 
                        postId: notif.postId,
                        openComments: notif.type === 'comment' || notif.type === 'tag'
                      } 
                   }));
                 } else {
                   window.dispatchEvent(new CustomEvent('navigate-profile', { 
                     detail: { userId: notif.actorId } 
                   }));
                 }
              }
            };

            return (
              <button 
                key={notif.id} 
                type="button"
                onClick={handleNotificationClick}
                className={`w-full flex items-center gap-4 p-4 text-left transition-colors border-l-4 ${!isRead ? 'bg-zinc-900/50 border-white' : 'border-transparent hover:bg-zinc-900/30'}`}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 relative border border-zinc-700">
                  {actor?.profilePic ? (
                    <img src={actor.profilePic} alt={actor.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-zinc-500">
                       {actor?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-zinc-800">
                    {icon}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-bold text-white mr-1 truncate">@{actor?.username || 'someone'}</span>
                    <span className="text-zinc-400">{text}</span>
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-widest">
                     {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
