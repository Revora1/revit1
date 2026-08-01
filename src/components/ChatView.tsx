import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Send, Search, Trash2 } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Chat, ChatMessage, UserProfile } from '../types';
import { sanitizeInput } from '../lib/utils';

interface ChatViewProps {
  chatId: string;
  otherUser: UserProfile | null;
  onBack: () => void;
}

export function ChatView({ chatId, otherUser, onBack }: ChatViewProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !chatId) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return unsubscribe;
  }, [chatId, user]);

  useEffect(() => {
    if (!user || !chatId || !otherUser) return;
    
    // Mark notifications as read once when entering chat
    const markReads = async () => {
      const notifsRef = collection(db, 'notifications');
      const unreadQ = query(
        notifsRef,
        where('userId', '==', user.uid),
        where('actorId', '==', otherUser.uid),
        where('type', '==', 'message'),
        where('read', '==', false)
      );
      const unreadSnap = await getDocs(unreadQ);
      unreadSnap.forEach(document => {
        updateDoc(doc(db, 'notifications', document.id), { read: true });
      });
    };
    markReads().catch(console.error);
  }, [chatId, user, otherUser?.uid]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !chatId) return;

    const text = sanitizeInput(inputText);
    setInputText('');

    try {
      const messageId = `${Date.now()}_${user.uid}`;
      await setDoc(doc(db, 'messages', messageId), {
        chatId,
        senderId: user.uid,
        text,
        createdAt: Date.now()
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageAt: Date.now(),
        lastSenderId: user.uid
      });

      if (otherUser) {
        const notifId = `${Date.now()}_${user.uid}_msg_${otherUser.uid}`;
        await setDoc(doc(db, 'notifications', notifId), {
          userId: otherUser.uid,
          actorId: user.uid,
          type: 'message',
          read: false,
          createdAt: Date.now()
        }).catch(console.error);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      <div className="flex-none flex items-center gap-4 p-4 border-b border-zinc-900 bg-black z-40 w-full pt-[calc(env(safe-area-inset-top,0px)+1rem)] shadow-md">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 flex items-center gap-3">
           <div className="w-10 h-10 rounded-full border border-zinc-700 overflow-hidden bg-zinc-800 flex-shrink-0 flex items-center justify-center">
             {otherUser?.profilePic ? (
               <img src={otherUser.profilePic} className="w-full h-full object-cover" alt={otherUser.username} />
             ) : (
               <div className="font-bold text-zinc-500">{otherUser?.username[0]?.toUpperCase() || '?'}</div>
             )}
           </div>
           <div>
             <h2 className="font-bold text-lg leading-tight">{otherUser?.username || 'Unknown'}</h2>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 overflow-x-hidden">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === user?.uid;
            const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
            
            return (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ duration: 0.2, delay: idx % 20 * 0.02 }}
                className="relative group w-full"
              >
                {isMe && (
                  <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-end -z-10 translate-x-2">
                    <Trash2 size={18} className="text-red-500 mr-2 opacity-80" />
                  </div>
                )}
                  <motion.div
                    drag={isMe ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 0.8, right: 0 }}
                    onDragEnd={(e, info) => {
                       if (isMe && info.offset.x < -60) {
                          deleteDoc(doc(db, 'messages', msg.id)).catch(err => {
                             handleFirestoreError(err, OperationType.DELETE, 'messages');
                          });
                       }
                    }}
                    className={`flex w-full items-end gap-x-2 ${isMe ? 'justify-end' : 'justify-start'} relative z-10`}
                  >
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1 bg-zinc-800 flex items-center justify-center border border-zinc-700">
                        {showAvatar && (
                          otherUser?.profilePic ? (
                            <img src={otherUser.profilePic} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="text-xs font-bold text-zinc-500">{otherUser?.username[0]?.toUpperCase() || '?'}</span>
                          )
                        )}
                      </div>
                    )}
                    <div className={`flex flex-col max-w-[75%] gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm ${
                        isMe 
                          ? 'bg-white text-black rounded-br-sm' 
                          : 'bg-zinc-900 border border-zinc-800 text-white rounded-bl-sm'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-zinc-950/80 backdrop-blur border-t border-zinc-900 pb-[calc(1rem+env(safe-area-inset-bottom,16px))]">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-zinc-900 rounded-full px-4 py-3 outline-none text-sm placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-700"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 bg-white text-black rounded-full hover:bg-zinc-200 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors"
          >
            <Send size={18} className="translate-x-0.5" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
