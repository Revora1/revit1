import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Post } from '../types';
import { PostCard } from './PostCard';
import { StoriesBar } from './StoriesBar';
import { StoryViewer } from './StoryViewer';
import { StoryCreator } from './StoryCreator';
import { AdSlot } from './AdSlot';
import { ADSENSE_CLIENT_ID } from '../constants';
import { trackOutboundClick } from '../lib/analytics';
import { MessageSquare } from 'lucide-react';

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedStoryUserId, setSelectedStoryUserId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(fetchedPosts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return unsubscribe;
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const feedItems = [];
  posts.forEach((post, index) => {
    feedItems.push({ type: 'post', data: post, id: post.id });
    if ((index + 1) % 4 === 0) {
      feedItems.push({ type: 'ad', id: `ad-${index}` });
    }
  });

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
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none pt-[env(safe-area-inset-top)] px-4">
        <div className="flex items-center justify-between pointer-events-auto mb-2 py-2">
           <h1 className="text-2xl font-black italic tracking-tighter text-white">REVITUP</h1>
           <button 
             onClick={() => window.dispatchEvent(new CustomEvent('navigate-inbox'))}
             className="p-2 bg-zinc-900/50 backdrop-blur-md rounded-full text-white border border-white/10 active:scale-95 transition-transform"
           >
             <MessageSquare size={20} />
           </button>
        </div>
        <div className="pointer-events-auto">
           <StoriesBar onSelectUser={(id) => setSelectedStoryUserId(id)} />
        </div>
      </div>
      <main 
        ref={containerRef}
        onScroll={handleScroll}
        role="feed"
        className="h-full overflow-y-scroll snap-y snap-mandatory"
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
              <div key={item.id} className="h-full w-full snap-start snap-always relative bg-zinc-950 flex flex-col items-center justify-center group overflow-hidden">
                {/* Ad content */}
                <div className="absolute top-24 left-4 bg-zinc-800/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest text-zinc-400 border border-zinc-700/50 z-10 shadow-lg flex items-center gap-2 uppercase">
                   SPONSORED
                </div>
                <div className="w-[85%] max-w-[320px] aspect-[4/5] bg-zinc-900/80 rounded-[32px] flex flex-col items-center justify-center border border-zinc-800 relative shadow-2xl backdrop-blur-xl overflow-hidden mt-10">
                   <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-red-500/10 opacity-30"></div>
                   <div className="w-full flex-1 flex flex-col items-center justify-center p-4 text-center space-y-5 relative z-10">
                      {!ADSENSE_CLIENT_ID ? (
                        <div className="space-y-4">
                          <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] mb-2">
                              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                 <path d="M21.35 11.1H12.18V13.83H17.38C17.15 15.01 16.03 16.7 12.18 16.7C9.36 16.7 7.07 14.34 7.07 11.5C7.07 8.66 9.36 6.3 12.18 6.3C13.79 6.3 14.88 7.01 15.48 7.6L17.51 5.4C16.14 4.04 14.34 3.2 12.18 3.2C7.59 3.2 3.86 6.91 3.86 11.5C3.86 16.09 7.59 19.8 12.18 19.8C17.65 19.8 21.46 15.95 21.46 11.75C21.46 10.91 21.37 10.45 21.35 11.1Z" fill="#313131"/>
                              </svg>
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-white tracking-tight leading-tight uppercase italic mb-2">Connect AdSense</h3>
                            <p className="text-[10px] text-zinc-400 font-medium px-4 leading-relaxed">
                              Add your AdSense Client ID in <code className="text-red-500">src/constants.ts</code> to see real ads.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <AdSlot className="w-full h-full flex items-center justify-center" />
                      )}
                   </div>
                   <div className="w-full p-4 border-t border-white/5 bg-zinc-900/50 relative z-10 backdrop-blur-md">
                      <button 
                        onClick={trackOutboundClick}
                        className="w-full py-4 bg-white text-black font-black uppercase italic tracking-widest text-sm rounded-2xl hover:bg-zinc-200 transition-colors"
                      >
                        Learn More
                      </button>
                   </div>
                </div>
              </div>
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
