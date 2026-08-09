import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Post } from '../types';
import { PostCard } from './PostCard';
import { AdminVideoCard } from './AdminVideoCard';
import { StoriesBar } from './StoriesBar';
import { StoryViewer } from './StoryViewer';
import { StoryCreator } from './StoryCreator';
import { AdSlot } from './AdSlot';
import { ADSENSE_CLIENT_ID } from '../constants';
import { trackOutboundClick } from '../lib/analytics';
import { MessageSquare, RefreshCw, Star, ExternalLink, ShieldAlert, Sparkles, Check, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { admobService } from '../lib/admobService';

export function Feed() {
  const { blockedUserIds } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [adminVideos, setAdminVideos] = useState<any[]>([]);
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

    const adminQuery = query(collection(db, 'admin_videos'), orderBy('createdAt', 'desc'));
    const unsubAdmin = onSnapshot(adminQuery, (snapshot) => {
      setAdminVideos(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    });

    return () => {
      unsubPinned();
      unsubRecent();
      unsubAdmin();
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
  
  let adminVideoIndex = 0;

  filteredPosts.forEach((post, index) => {
    feedItems.push({ type: 'post', data: post, id: post.id });
    
    // Inject admin video every 3 posts if available
    if ((index + 1) % 3 === 0 && adminVideos.length > 0) {
      const adminVideo = adminVideos[adminVideoIndex % adminVideos.length];
      feedItems.push({ type: 'admin_video', data: adminVideo, id: `admin-video-${adminVideo.id}-${index}` });
      adminVideoIndex++;
    }

    if ((index + 1) % 4 === 0) {
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
          } else if (item.type === 'admin_video') {
            return (
              <AdminVideoCard
                key={item.id}
                video={item.data as any}
                isActive={index === activeIndex}
              />
            );
          } else {
            // Cycle through different premium sponsors based on index
            const creatives = [
              {
                sponsor: 'Brembo Brakes',
                handle: 'bremboracing',
                avatar: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=120&h=120',
                headline: 'CARBON-CERAMIC ROTORS',
                description: 'Engineered for absolute thermal stability. Stop from 100-0 MPH in world-record distance.',
                image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800',
                cta: 'UPGRADE CALIPERS',
                rating: '4.9',
                installs: '8.4M'
              },
              {
                sponsor: 'Michelin Tires',
                handle: 'michelinmotorsport',
                avatar: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=120&h=120',
                headline: 'PILOT SPORT CUP 2 R',
                description: 'Extreme dry grip designed for hypercars. Shave seconds off your personal best lap times.',
                image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800',
                cta: 'FIND YOUR SIZE',
                rating: '4.8',
                installs: '14.2M'
              },
              {
                sponsor: 'Mobil 1 Racing',
                handle: 'mobil1motorsport',
                avatar: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=120&h=120',
                headline: 'SYNTHETIC 0W-40 FLUIDS',
                description: 'Advanced fluid friction protection under high boost. Keep your built motor safe.',
                image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800',
                cta: 'BOOST LUBRICITY',
                rating: '4.9',
                installs: '22.1M'
              }
            ];

            const adIndex = Math.floor(index / 2) % creatives.length;
            const creative = creatives[adIndex];

            return (
              <AdMobNativeFeedCard key={item.id} creative={creative} />
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

interface AdMobNativeFeedCardProps {
  creative: {
    sponsor: string;
    handle: string;
    avatar: string;
    headline: string;
    description: string;
    image: string;
    cta: string;
    rating: string;
    installs: string;
  };
}

export function AdMobNativeFeedCard({ creative }: AdMobNativeFeedCardProps) {
  const [clicked, setClicked] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleCtaClick = () => {
    if (clicked || installing) return;
    setInstalling(true);
    setProgress(0);
    
    // Simulate interactive ad install progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setInstalling(false);
          setClicked(true);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    // Track analytics event
    trackOutboundClick();
  };

  return (
    <div className="h-full w-full snap-start snap-always relative bg-zinc-950 flex flex-col justify-between pt-[calc(env(safe-area-inset-top,24px)+52px)] pb-24 px-4 font-sans overflow-hidden">
      {/* Background glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-zinc-900/40 pointer-events-none" />

      {/* Top Header Row */}
      <div className="relative z-10 flex items-center justify-between w-full px-2 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-zinc-900 flex-shrink-0">
            <img src={creative.avatar} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white text-xs font-black uppercase tracking-tight">{creative.sponsor}</span>
              <span className="bg-yellow-500 text-black text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Sparkles size={6} className="fill-current" /> SPONSORED
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">@{creative.handle} • Verified Partner</p>
          </div>
        </div>
      </div>

      {/* Main Creative Container */}
      <div className="relative z-10 w-full max-w-sm mx-auto flex-1 flex flex-col justify-center my-4">
        {/* Elegant SPONSORED Logo Header */}
        <div className="flex items-center justify-center gap-2 mb-3 bg-yellow-500 text-black py-1 px-4 rounded-full self-center shadow-[0_4px_12px_rgba(234,179,8,0.25)] border border-yellow-400 animate-pulse">
          <Sparkles size={10} className="fill-black" />
          <span className="text-[9px] font-black tracking-[0.2em] uppercase font-sans">SPONSORED</span>
          <Sparkles size={10} className="fill-black" />
        </div>
        <div className="w-full aspect-[4/5] bg-zinc-900/80 border border-zinc-850 rounded-[32px] overflow-hidden flex flex-col justify-between shadow-2xl relative backdrop-blur-md group">
          
          {/* Ad Image & Gradient Overlay */}
          <div className="absolute inset-0 w-full h-full">
            <img 
              src={creative.image} 
              className="w-full h-full object-cover scale-102 group-hover:scale-105 transition-transform duration-700 brightness-90 contrast-[1.05]" 
              alt="" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
          </div>

          {/* Top Info Tag */}
          <div className="relative z-10 p-4 flex justify-between items-start">
            <span className="bg-black/45 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider text-zinc-300">
              {creative.installs} Tuners Upgraded
            </span>
            <div className="flex items-center gap-1 bg-black/45 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md text-[9px] font-black text-yellow-500">
              <Star size={9} fill="currentColor" /> {creative.rating}
            </div>
          </div>

          {/* Bottom Info Content */}
          <div className="relative z-10 p-6 space-y-3 bg-gradient-to-t from-black via-black/90 to-transparent pt-12">
            <h3 className="text-xl font-black italic text-white tracking-tighter uppercase leading-none">
              {creative.headline}
            </h3>
            <p className="text-xs text-zinc-300 font-medium leading-relaxed">
              {creative.description}
            </p>
          </div>
        </div>
      </div>

      {/* Action Button & Diagnostics Bottom Row */}
      <div className="relative z-10 w-full max-w-sm mx-auto space-y-4 px-2">
        {/* Interactive CTA */}
        <button 
          onClick={handleCtaClick}
          disabled={installing || clicked}
          className="w-full relative overflow-hidden h-14 bg-white text-black font-black uppercase italic tracking-widest text-xs rounded-2xl flex items-center justify-center transition-all active:scale-98 shadow-[0_12px_32px_rgba(255,255,255,0.15)] hover:bg-zinc-100"
        >
          {installing && (
            <div 
              className="absolute left-0 top-0 bottom-0 bg-red-500/20 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          )}

          <div className="relative z-10 flex items-center gap-2">
            {installing ? (
              <span>STAGING BUILD... {progress}%</span>
            ) : clicked ? (
              <span className="text-green-600 flex items-center gap-1.5 uppercase font-black">
                <Check size={14} className="stroke-[3]" /> INSTALLED SUCCESSFULLY
              </span>
            ) : (
              <>
                <span>{creative.cta}</span>
                <ExternalLink size={12} />
              </>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
