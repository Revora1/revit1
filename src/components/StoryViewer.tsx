import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, setDoc, getDoc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Story, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, ChevronLeft, ChevronRight, Trash2, Heart, Eye, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StoryViewerProps {
  userId: string;
  onClose: () => void;
  onNextUser?: () => void;
  onPrevUser?: () => void;
}

export function StoryViewer({ userId, onClose, onNextUser, onPrevUser }: StoryViewerProps) {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewerProfiles, setViewerProfiles] = useState<UserProfile[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // Time remaining
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(true);
    const fetchStories = async () => {
      try {
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const yesterday = Date.now() - ONE_DAY_MS;

        const storiesRef = collection(db, 'stories');
        const q = query(
          storiesRef,
          where('authorId', '==', userId)
        );

        const snap = await getDocs(q);
        const fetched = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Story))
          .filter(s => s.createdAt >= yesterday)
          .sort((a, b) => a.createdAt - b.createdAt);
          
        setStories(fetched);

        const userSnap = await getDoc(doc(db, 'users', userId));
        if (userSnap.exists()) {
           setAuthor(userSnap.data() as UserProfile);
        }
      } catch (e) {
         handleFirestoreError(e, OperationType.LIST, 'stories');
      } finally {
         setLoading(false);
      }
    };
    fetchStories();
  }, [userId]);

  // Reset progress when index changes
  useEffect(() => {
    setProgress(0);
    setShowViewers(false);
  }, [currentIndex]);

  // Auto advance
  useEffect(() => {
    if (loading || stories.length === 0 || isPaused || showViewers) return;

    const duration = 5000; // 5 seconds per story
    const interval = 50; // update every 50ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) return 100;
        return p + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, loading, stories.length, isPaused, showViewers]);

  // View Tracking
  useEffect(() => {
    if (!user || loading || stories.length === 0 || userId === user.uid) return;
    
    const currentStory = stories[currentIndex];
    if (currentStory.views?.includes(user.uid)) return;

    const trackView = async () => {
      try {
        await updateDoc(doc(db, 'stories', currentStory.id), {
          views: arrayUnion(user.uid)
        });
        // Update local state
        setStories(prev => prev.map((s, idx) => 
          idx === currentIndex ? { ...s, views: [...(s.views || []), user.uid] } : s
        ));
      } catch (e) {
        console.error("Error tracking view", e);
      }
    };
    trackView();
  }, [currentIndex, user?.uid, loading, userId]);

  // Handle auto-advance when progress reaches 100
  useEffect(() => {
    if (progress >= 100) {
      handleNext();
    }
  }, [progress]);

  // Handle closing when no stories are available
  useEffect(() => {
    if (!loading && stories.length === 0) {
      onClose();
    }
  }, [loading, stories.length]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      if (onNextUser) onNextUser();
      else onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      if (onPrevUser) onPrevUser();
      else onClose();
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
       setProgress(0);
       handlePrev();
    } else {
       setProgress(0);
       handleNext();
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user) return;
    const story = stories[currentIndex];
    try {
      const reactions = { ...(story.reactions || {}) };
      if (reactions[user.uid] === emoji) {
        delete reactions[user.uid];
      } else {
        reactions[user.uid] = emoji;
      }

      await updateDoc(doc(db, 'stories', story.id), { reactions });
      setStories(prev => prev.map((s, idx) => idx === currentIndex ? { ...s, reactions } : s));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'stories');
    }
  };

  const fetchViewers = async () => {
    if (loadingViewers) return;
    setLoadingViewers(true);
    const story = stories[currentIndex];
    const uids = story.views || [];
    
    try {
      const profiles: UserProfile[] = [];
      // Firestore `in` query limit is 10, so we fetch individually or in batches if needed
      // for simple demo, limit to first 10
      for (const uid of uids.slice(0, 10)) {
        const s = await getDoc(doc(db, 'users', uid));
        if (s.exists()) profiles.push(s.data() as UserProfile);
      }
      setViewerProfiles(profiles);
      setShowViewers(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingViewers(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
     e.stopPropagation();
     if (!user) return;
     const story = stories[currentIndex];
     try {
       await deleteDoc(doc(db, 'stories', story.id));
       const newStories = [...stories];
       newStories.splice(currentIndex, 1);
       setStories(newStories);
       if (newStories.length === 0) {
          onClose();
       } else if (currentIndex >= newStories.length) {
          setCurrentIndex(newStories.length - 1);
       }
     } catch (err) {
       handleFirestoreError(err, OperationType.DELETE, 'stories');
     }
  };

  if (loading) {
    return (
       <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
         <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
       </div>
    );
  }

  if (stories.length === 0) {
    return null; // Will just auto-close effectively handled by parent
  }

  const currentStory = stories[currentIndex];
  const hasReacted = user && currentStory.reactions?.[user.uid];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="fixed inset-0 bg-black z-[100] flex flex-col"
    >
      <div className="absolute top-0 left-0 right-0 z-50 pt-[max(12px,env(safe-area-inset-top))] px-4 pb-12 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex flex-col gap-4 pointer-events-none">
        
        {/* Progress bars */}
        <div className="flex gap-1.5 w-full">
           {stories.map((s, idx) => (
             <div key={s.id} className="h-1 rounded-full bg-white/20 flex-1 overflow-hidden">
               <div 
                 className="h-full bg-white transition-all duration-75 ease-linear"
                 style={{ 
                   width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
                 }} 
               />
             </div>
           ))}
        </div>

        {/* User header */}
        <div className="flex items-center justify-between pointer-events-auto mt-1">
          <button 
            className="flex items-center gap-3"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('navigate-profile', { detail: { userId } }));
            }}
          >
            <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-zinc-800 shadow-md">
               {author?.profilePic && <img src={author.profilePic} className="w-full h-full object-cover" />}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm tracking-tight drop-shadow-sm">{author?.username}</span>
              <span className="text-white/60 text-[10px] uppercase font-bold tracking-wider">
                 {Math.floor((Date.now() - currentStory.createdAt) / 3600000)}H AGO
              </span>
            </div>
          </button>
          <div className="flex items-center gap-2">
             {userId === user?.uid && (
               <button onClick={handleDelete} className="p-1 text-white/50 hover:text-red-400 transition-colors">
                  <Trash2 size={20} />
               </button>
             )}
             <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition-colors">
               <X size={24} />
             </button>
          </div>
        </div>
      </div>

      <div 
        className="flex-1 relative bg-black overflow-hidden flex items-center justify-center mt-12 mb-8" 
        onClick={handleNavClick}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <img src={currentStory.mediaUrl} className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" />

         {/* Reactions display Overlay */}
         <div className="absolute bottom-4 left-4 flex gap-2 pointer-events-none">
            {Object.entries(currentStory.reactions || {}).slice(0, 5).map(([uid, emo]) => (
              <motion.div 
                key={uid}
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-sm shadow-lg"
              >
                {emo}
              </motion.div>
            ))}
            {(Object.keys(currentStory.reactions || {}).length > 5) && (
              <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-[10px] text-white font-bold">
                +{Object.keys(currentStory.reactions || {}).length - 5}
              </div>
            )}
         </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 safe-bottom flex items-center gap-4">
        {userId !== user?.uid ? (
          <>
            <div className="flex-1 px-4 py-3 bg-zinc-900/50 backdrop-blur-md rounded-full border border-white/10 text-white/50 text-sm italic">
              Send a message...
            </div>
            <div className="flex gap-2">
              {['🔥', '🏎️', '💯', '❤️'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
                    currentStory.reactions?.[user?.uid || ''] === emoji 
                      ? 'bg-white scale-110' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="w-full flex items-center justify-between px-2">
            <button 
              onClick={fetchViewers}
              className="flex items-center gap-2 text-white/70 hover:text-white"
            >
              <Eye size={20} />
              <span className="text-sm font-bold uppercase tracking-widest italic">{currentStory.views?.length || 0} Views</span>
            </button>
            <div className="text-white/30 text-[10px] uppercase font-black tracking-[0.2em] italic">
               Owner Preview
            </div>
          </div>
        )}
      </div>

      {/* Viewers Sheet */}
      <AnimatePresence>
        {showViewers && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowViewers(false)}
              className="absolute inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl z-[70] p-6 pb-12 max-h-[70vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6" />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-black uppercase italic tracking-widest text-lg flex items-center gap-2">
                  <Users size={20} />
                  Viewers
                </h3>
                <span className="text-zinc-500 text-sm font-bold">{currentStory.views?.length || 0} Total</span>
              </div>
              
              <div className="space-y-4">
                {viewerProfiles.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-8">No views yet. Share it around!</p>
                ) : (
                  viewerProfiles.map(profile => (
                    <div key={profile.uid} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                        {profile.profilePic && <img src={profile.profilePic} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold text-sm">{profile.username}</p>
                        <p className="text-zinc-500 text-xs truncate">{profile.bio || 'Revving the community!'}</p>
                      </div>
                      <button className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase italic tracking-widest rounded-lg">
                        View Profile
                      </button>
                    </div>
                  ))
                )}
                {viewerProfiles.length < (currentStory.views?.length || 0) && (
                   <p className="text-zinc-600 text-[10px] text-center pt-4">...and {(currentStory.views?.length || 0) - viewerProfiles.length} more</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
