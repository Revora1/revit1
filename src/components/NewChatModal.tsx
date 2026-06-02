import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, User } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, Chat } from '../types';
import { useAuth } from '../context/AuthContext';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatSelected: (chatId: string, otherUser: UserProfile) => void;
}

export function NewChatModal({ isOpen, onClose, onChatSelected }: NewChatModalProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val: string) => {
    if (!val.trim() || !user) {
      setResults([]);
      return;
    }
    setLoading(true);

    try {
      const usersRef = collection(db, 'users');
      
      const qLower = query(
        usersRef,
        where('usernameLower', '>=', val.toLowerCase()),
        where('usernameLower', '<=', val.toLowerCase() + '\uf8ff')
      );

      const snapLower = await getDocs(qLower);
      const items: UserProfile[] = [];
      snapLower.forEach(doc => {
        if (doc.id !== user.uid) {
           items.push(doc.data() as UserProfile);
        }
      });

      if (items.length === 0) {
        // Fallback for case-sensitive search for unmigrated users
        const qNormal = query(
          usersRef,
          where('username', '>=', val),
          where('username', '<=', val + '\uf8ff')
        );
        const snapNormal = await getDocs(qNormal);
        snapNormal.forEach(doc => {
          if (doc.id !== user.uid && !items.find(i => i.uid === doc.id)) {
             items.push(doc.data() as UserProfile);
          }
        });
      }
      
      setResults(items);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectUser = async (otherUser: UserProfile) => {
    if (!user) return;
    // Check if chat already exists
    const chatId1 = `${user.uid}_${otherUser.uid}`;
    const chatId2 = `${otherUser.uid}_${user.uid}`;
    
    try {
      let chatId = chatId1;
      const chatSnap1 = await getDoc(doc(db, 'chats', chatId1));
      if (chatSnap1.exists()) {
        chatId = chatId1;
      } else {
        const chatSnap2 = await getDoc(doc(db, 'chats', chatId2));
        if (chatSnap2.exists()) {
          chatId = chatId2;
        } else {
          // create chat
          try {
            await setDoc(doc(db, 'chats', chatId1), {
              participantIds: [user.uid, otherUser.uid],
              lastMessage: '',
              lastMessageAt: Date.now(),
              createdAt: Date.now(),
              lastSenderId: ''
            });
            chatId = chatId1;
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'chats');
            return;
          }
        }
      }
      onChatSelected(chatId, otherUser);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'chats');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 top-[10%] bg-zinc-900 rounded-t-3xl z-[60] flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-lg">New Message</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <form onSubmit={(e) => e.preventDefault()} className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search usernames..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-zinc-700"
                />
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading && <div className="text-center text-zinc-500 py-4">Searching...</div>}
              {!loading && results.map(u => (
                <button
                  key={u.uid}
                  onClick={() => handleSelectUser(u)}
                  className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    {u.profilePic ? (
                      <img src={u.profilePic} alt={u.username} className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} className="text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold">{u.username}</h4>
                  </div>
                </button>
              ))}
              {!loading && results.length === 0 && searchTerm && (
                <div className="text-center text-zinc-500 py-4">No users found.</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
