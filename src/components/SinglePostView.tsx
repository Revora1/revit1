import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Post } from '../types';
import { PostCard } from './PostCard';
import { ChevronLeft, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { copyToClipboard, getBaseUrl, shareContent } from '../lib/utils';

export function SinglePostView({ postId, onBack, autoOpenComments }: { postId: string, onBack: () => void, autoOpenComments?: boolean }) {
  const { blockedUserIds } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareToast, setShowShareToast] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'posts', postId));
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() } as Post);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'posts');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  const handleSharePost = async () => {
    if (!post) return;
    const shareUrl = `${getBaseUrl()}${window.location.pathname}?p=${post.id}`;
    const success = await shareContent({
      title: 'RevItUp Post',
      text: '',
      url: shareUrl,
    });
    if (success && !Capacitor.isNativePlatform() && !navigator.share) {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!post || blockedUserIds.includes(post.authorId)) {
    return (
      <div className="h-full bg-black flex flex-col items-center justify-center text-zinc-500 space-y-4">
        <p>Post not found or unavailable.</p>
        <button onClick={onBack} className="text-white px-4 py-2 bg-zinc-800 rounded-full font-medium">Go Back</button>
      </div>
    );
  }

  return (
    <div className="h-full bg-black relative snap-y snap-mandatory overflow-y-scroll scrollbar-hide">
       {/* Back Button Overlay */}
       <div className="absolute top-[calc(env(safe-area-inset-top,0px)+1rem)] left-4 z-50">
         <button 
           onClick={onBack}
           className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10"
         >
           <ChevronLeft size={24} />
         </button>
       </div>

       {/* Share Button Overlay */}
       <div className="absolute top-[calc(env(safe-area-inset-top,0px)+1rem)] right-4 z-50">
         <button 
           onClick={handleSharePost}
           className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10"
         >
           <Share2 size={20} />
         </button>
       </div>

       <div className="h-full w-full snap-start snap-always relative">
         <PostCard post={post} isActive={true} initialShowComments={autoOpenComments} />
       </div>

       {/* Toast notification */}
       <AnimatePresence>
         {showShareToast && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 20 }}
             className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-2"
           >
             <Share2 size={14} className="text-black" />
             Post Link Copied!
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
}
