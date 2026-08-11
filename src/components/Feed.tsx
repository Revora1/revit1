import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Post } from '../types';
import { PostCard } from './PostCard';
import { StoriesBar } from './StoriesBar';
import { StoryViewer } from './StoryViewer';
import { StoryCreator } from './StoryCreator';
import { AdSlot } from './AdSlot';
import { NativeAd } from './NativeAd';
import { ADSENSE_CLIENT_ID } from '../constants';
import { trackOutboundClick } from '../lib/analytics';
import { MessageSquare, RefreshCw, Star, ExternalLink, ShieldAlert, Sparkles, Check, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { admobService } from '../lib/admobService';

export function Feed() {
  const { blockedUserIds } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedStoryUserId, setSelectedStoryUserId] = useState<string | null>(null);

  // Pull to refresh states
  const [refreshKey, setRefreshKey] = useState(0);
  const [pullOffset, setPullOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const pullStarted = useRef(false);

  useEffect(() => {
    setLoading(true);
    
    const pinnedQuery = query(
      collection(db, 'posts'),
      where('isPinned', '==', true)
    );
    
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    let pinnedPosts: Post[] = [];
    let recentPosts: Post[] = [];

    const mergePosts = () => {
      const recentWithoutPinned = recentPosts.filter(rp => !pinnedPosts.some(pp => pp.id === rp.id));
      const sortedPinned = [...pinnedPosts].sort((a, b) => b.createdAt - a.createdAt);
      setPosts([...sortedPinned, ...recentWithoutPinned]);
      setLoading(false);
    };

    const unsubPinned = onSnapshot(pinnedQuery, (snapshot) => {
      pinnedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      mergePosts();
    });

    const unsubRecent = onSnapshot(q, (snapshot) => {
      recentPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      mergePosts();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return () => {
      unsubPinned();
      unsubRecent();
    };
  }, [refreshKey]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [role="button"]')) {
      return;
    }
    if (containerRef.current && containerRef.current.scrollTop === 0 && !refreshing) {
      pullStartY.current = e.clientY;
      pullStarted.current = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pullStarted.current || refreshing) return;
    const currentY = e.clientY;
    const deltaY = currentY - pullStartY.current;
    
    if (deltaY > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      const dampened = Math.min(80, deltaY * 0.45);
      setPullOffset(dampened);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pullStarted.current) return;
    pullStarted.current = false;

    if (pullOffset >= 50) {
      setRefreshing(true);
      setPullOffset(50);
      
      setRefreshKey(prev => prev + 1);
      
      setTimeout(() => {
        setRefreshing(false);
        setPullOffset(0);
      }, 1200);
    } else {
      setPullOffset(0);
    }
  };

  const feedItems = [];
  const filteredPosts = posts.filter(post => !blockedUserIds.includes(post.authorId));
  filteredPosts.forEach((post, index) => {
    feedItems.push({ type: 'post', data: post, id: post.id });
    if ((index + 1) % 3 === 0) {
      feedItems.push({ type: 'ad', id: `ad-${index}` });
    }
  });

  if (loading) {
    return (
      <div className="relative h-full bg-black flex flex-col overflow-hidden animate-pulse">
        {/* Fake Header & Stories Shimmer */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none pt-[env(safe-area-inset-top)] px-4 pb-4">
          <div className="flex items-center justify-between py-2 mb-3">
            <div className="h-6 w-24 bg-zinc-800 rounded-lg" />
            <div className="h-9 w-9 bg-zinc-800 rounded-full" />
          </div>
          
          {/* Stories Bar Skeletons */}
          <div className="flex gap-4 overflow-x-hidden pt-1">
            <div className="flex flex-col items-center gap-1.5 flex-none">
              <div className="w-14 h-14 rounded-full bg-zinc-850 border border-zinc-800" />
              <div className="h-2 w-10 bg-zinc-850 rounded" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-none">
                <div className="w-14 h-14 rounded-full bg-zinc-850" />
                <div className="h-2 w-12 bg-zinc-850 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Fake Large Media Post Placeholder */}
        <div className="flex-1 w-full bg-zinc-950 relative flex flex-col justify-end p-6 pb-28">
          {/* Glowing element */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 z-10" />
          <div className="absolute inset-0 bg-zinc-900 border-zinc-850" />

          {/* Lower Content Skeletons */}
          <div className="relative z-10 space-y-4 max-w-[80%]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-zinc-800" />
              <div className="space-y-1.5">
                <div className="h-3 w-28 bg-zinc-800 rounded" />
                <div className="h-2 w-16 bg-zinc-850 rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-56 bg-zinc-800 rounded" />
              <div className="h-3 w-40 bg-zinc-800 rounded" />
            </div>
          </div>

          {/* Sidebar Interaction Buttons Skeleton */}
          <div className="absolute right-4 bottom-28 z-10 flex flex-col items-center gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center" />
                <div className="h-2 w-5 bg-zinc-850 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="relative h-full">
         <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none pt-[env(safe-area-inset-top)]">
            <div className="pointer-events-auto">
               <StoriesBar onSelectUser={(id) => setSelectedStoryUserId(id)} />
            </div>
         </div>
         <div className="h-full flex items-center justify-center bg-black text-zinc-500">
           <p>No builds yet. Be the first to share!</p>
         </div>
         {selectedStoryUserId === 'create' && <StoryCreator onClose={() => setSelectedStoryUserId(null)} />}
         {selectedStoryUserId && selectedStoryUserId !== 'create' && (
            <StoryViewer userId={selectedStoryUserId} onClose={() => setSelectedStoryUserId(null)} />
         )}
      </div>
    );
  }

  return (
    <div className="relative h-full bg-black">
      {/* Pull down to refresh indicator */}
      {(pullOffset > 0 || refreshing) && (
        <div 
          className="absolute left-0 right-0 z-50 flex justify-center pointer-events-none"
          style={{ 
            top: 'env(safe-area-inset-top, 16px)',
            transform: `translateY(${Math.min(100, pullOffset * 0.9)}px)`,
            opacity: Math.min(1, pullOffset / 30)
          }}
        >
          <div className="bg-white/95 backdrop-blur-xl border border-zinc-200/80 px-4 py-1.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.15)] flex items-center gap-2">
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: pullOffset * 6 }}
              transition={refreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0 }}
            >
              <RefreshCw size={12} className={refreshing ? "text-amber-500 animate-spin" : "text-amber-500"} />
            </motion.div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-800 font-mono">
              {refreshing ? "STAGING GREEN LIGHT..." : pullOffset >= 50 ? "RELEASE TO SPIN" : "DRAG TO REFRESH"}
            </span>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none pt-[env(safe-area-inset-top)] px-4">
        <div className="flex items-center justify-between pointer-events-auto mb-2 py-2">
           <h1 className="text-2xl font-black italic tracking-tighter text-white">REVITUP</h1>
                      <div className="flex items-center gap-2">
             <button
               onClick={() => window.dispatchEvent(new CustomEvent('navigate-giveaway'))}
               className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full font-black italic uppercase text-[10px] tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95 transition-transform"
             >
               <Gift size={12} className="text-white" /> GIVEAWAY
             </button>
             <button
               onClick={() => window.dispatchEvent(new CustomEvent('navigate-inbox'))}
               className="p-2 bg-zinc-900/50 backdrop-blur-md rounded-full text-white border border-white/10 active:scale-95 transition-transform"
             >
               <MessageSquare size={20} />
             </button>
           </div>
        </div>
        <div className="pointer-events-auto">
           <StoriesBar key={`stories_${refreshKey}`} onSelectUser={(id) => setSelectedStoryUserId(id)} />
        </div>
      </div>
      <main 
        ref={containerRef}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="feed"
        className="h-full w-full max-w-full overflow-x-hidden overflow-y-scroll snap-y snap-mandatory touch-pan-y"
        style={{ 
          transform: `translateY(${pullOffset}px)`,
          transition: pullStarted.current ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          touchAction: 'pan-y'
        }}
      >
        {feedItems.map((item, index) => {
          if (item.type === 'post') {
            return (
              <PostCard 
                key={item.id} 
                post={item.data as Post} 
                isActive={index === activeIndex} 
              />
            );
          } else {
            return (
              <NativeAd key={item.id} />
            );
          }
        })}
      </main>

      {selectedStoryUserId === 'create' && (
        <StoryCreator onClose={() => setSelectedStoryUserId(null)} />
      )}
      
      {selectedStoryUserId && selectedStoryUserId !== 'create' && (
        <StoryViewer 
          userId={selectedStoryUserId} 
          onClose={() => setSelectedStoryUserId(null)} 
        />
      )}
    </div>
  );
}


