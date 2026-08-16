import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, Users, Edit, Trash2 } from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Chat, UserProfile } from '../types';
import { ChatView } from './ChatView';
import { NewChatModal } from './NewChatModal';
import { AnimatePresence, motion } from 'motion/react';

export function MessagesView({ hideHeader, initialChatId, initialOtherUser, navKey }: { hideHeader?: boolean, initialChatId?: string, initialOtherUser?: UserProfile, navKey?: number }) {
  const { user } = useAuth();
  const [chats, setChats] = useState<(Chat & { otherUser?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId || null);
  const [activeOtherUser, setActiveOtherUser] = useState<UserProfile | null>(initialOtherUser || null);
  const [showNewChat, setShowNewChat] = useState(false);
  const userCache = useRef<Record<string, UserProfile>>({});

  useEffect(() => {
     setActiveChatId(initialChatId || null);
     setActiveOtherUser(initialOtherUser || null);
  }, [initialChatId, initialOtherUser, navKey]);

  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participantIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let fetchedChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Chat[];
      
      const otherUserIds = fetchedChats
        .map(chat => chat.participantIds.find(id => id !== user.uid))
        .filter((id): id is string => !!id && !userCache.current[id]);

      // Fetch missing users in parallel
      if (otherUserIds.length > 0) {
        const userDocs = await Promise.all(
          otherUserIds.map(id => getDoc(doc(db, 'users', id)))
        );
        userDocs.forEach(uSnap => {
          if (uSnap.exists()) {
            userCache.current[uSnap.id] = uSnap.data() as UserProfile;
          }
        });
      }

      // Merge chats with cached user profiles
      const chatsWithUsers = fetchedChats.map(chat => {
        const otherUserId = chat.participantIds.find(id => id !== user.uid);
        return {
          ...chat,
          otherUser: otherUserId ? userCache.current[otherUserId] : undefined
        };
      });

      // Sort chats by lastMessageAt descending
      chatsWithUsers.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

      setChats(chatsWithUsers);
      setLoading(false);
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return unsubscribe;
  }, [user]);

  return (
    <>
      <div className="bg-black h-full flex flex-col pb-20 overflow-y-auto">
        {!hideHeader && (
          <div className="p-6 pb-2 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] border-b border-zinc-900 sticky top-0 bg-black/80 backdrop-blur z-10">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-black italic tracking-tighter">MESSAGES</h1>
              <button onClick={() => setShowNewChat(true)} className="p-2 text-white bg-zinc-900 hover:bg-zinc-800 transition-colors rounded-full"><Edit size={20}/></button>
            </div>
          </div>
        )}
        
        {hideHeader && (
          <div className="px-6 py-4 flex justify-end">
             <button onClick={() => setShowNewChat(true)} className="p-2 text-white bg-zinc-900 hover:bg-zinc-800 transition-colors rounded-full shadow-lg active:scale-95"><Edit size={20}/></button>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
             <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 px-8 mt-10">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-700">
              <Users size={40} />
            </div>
            <div>
              <h2 className="font-bold text-lg">No conversations yet</h2>
              <p className="text-sm text-zinc-500 mt-1">Start a chat with other enthusiasts.</p>
            </div>
            <button onClick={() => setShowNewChat(true)} className="bg-white text-black px-8 py-3 rounded-full font-bold text-sm active:scale-95 transition-transform mt-4">
              NEW MESSAGE
            </button>
          </div>
        ) : (
          <div className="flex-1 divide-y divide-zinc-900 overflow-hidden">
             <AnimatePresence initial={false}>
               {chats.map(chat => (
                  <motion.div 
                    key={chat.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative bg-red-600 group"
                  >
                    <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-end px-6">
                      <Trash2 className="text-white" size={24} />
                    </div>
                    <motion.button 
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={{ left: 0.8, right: 0 }}
                      onDragEnd={(e, info) => {
                         if (info.offset.x < -80) {
                            const q = query(collection(db, 'messages'), where('chatId', '==', chat.id));
                            getDocs(q).then(snap => {
                              const batch = writeBatch(db);
                              snap.forEach(d => batch.delete(d.ref));
                              batch.delete(doc(db, 'chats', chat.id));
                              batch.commit().catch(err => {
                                handleFirestoreError(err, OperationType.DELETE, 'chats');
                              });
                            });
                         }
                      }}
                      whileDrag={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                      onClick={() => {
                         setActiveChatId(chat.id);
                         setActiveOtherUser(chat.otherUser || null);
                      }}
                      className="w-full p-4 flex items-center gap-4 bg-black hover:bg-zinc-900/50 transition-colors text-left relative z-10"
                    >
                      <div className="w-14 h-14 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-zinc-700 pointer-events-none">
                        {chat.otherUser?.profilePic ? (
                          <img src={chat.otherUser.profilePic} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="font-bold text-lg text-zinc-500">{chat.otherUser?.username?.[0]?.toUpperCase() || '?'}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pointer-events-none">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h3 className="font-bold text-white truncate pr-2">{chat.otherUser?.username || 'Unknown'}</h3>
                          {chat.lastMessageAt && (
                            <span className="text-xs text-zinc-500 flex-shrink-0">
                              {new Date(chat.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm truncate ${chat.lastSenderId !== user?.uid && chat.lastMessage ? 'text-zinc-300 font-medium' : 'text-zinc-500'}`}>
                          {chat.lastSenderId === user?.uid ? 'You: ' : ''}{chat.lastMessage || 'Started a conversation'}
                        </p>
                      </div>
                    </motion.button>
                  </motion.div>
               ))}
             </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeChatId && (
          <ChatView 
            chatId={activeChatId} 
            otherUser={activeOtherUser} 
            onBack={() => setActiveChatId(null)} 
          />
        )}
      </AnimatePresence>

      <NewChatModal 
        isOpen={showNewChat} 
        onClose={() => setShowNewChat(false)} 
        onChatSelected={(chatId, otherU) => {
          setActiveChatId(chatId);
          setActiveOtherUser(otherU);
        }}
      />
    </>
  );
}
