import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FollowListModalProps {
  userId: string;
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
  onUserClick: (uid: string) => void;
}

export function FollowListModal({ userId, type, isOpen, onClose, onUserClick }: FollowListModalProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);

    const fetchUsers = async () => {
      try {
        const followsRef = collection(db, 'follows');
        let q;
        if (type === 'followers') {
          q = query(followsRef, where('followingId', '==', userId));
        } else {
          q = query(followsRef, where('followerId', '==', userId));
        }

        const followsSnap = await getDocs(q);
        const relatedUserIds = followsSnap.docs.map(document => {
          const data = document.data() as { followerId: string; followingId: string; };
          return type === 'followers' ? data.followerId : data.followingId;
        });

        if (relatedUserIds.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const userPromises = relatedUserIds.map(id => getDoc(doc(db, 'users', id)));
        const userSnaps = await Promise.all(userPromises);
        
        const fetchedUsers = userSnaps
          .filter(snap => snap.exists())
          .map(snap => snap.data() as UserProfile);

        setUsers(fetchedUsers);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'follows');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userId, type, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-zinc-950 rounded-t-3xl z-50 h-[80vh] flex flex-col border-t border-zinc-900"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-900">
              <h2 className="text-xl font-black italic tracking-tight uppercase">
                {type === 'followers' ? 'Followers' : 'Following'}
              </h2>
              <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-center text-zinc-500 py-8 font-medium">No {type} yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {users.map(u => (
                    <button 
                      key={u.uid} 
                      onClick={() => {
                        onClose();
                        onUserClick(u.uid);
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-full border border-zinc-700 overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                         {u.profilePic ? (
                           <img src={u.profilePic} className="w-full h-full object-cover" alt={u.username} />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center">
                             <User size={24} className="text-zinc-500" />
                           </div>
                         )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{u.username}</p>
                        {u.bio && <p className="text-xs text-zinc-400 truncate">{u.bio}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
