import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Car, UserProfile, Post } from '../types';
import { Car as CarIcon, ChevronRight, Heart, LayoutGrid, Radio, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CarDetailsModal } from './CarDetailsModal';
import { PostCard } from './PostCard';

import { useAuth } from '../context/AuthContext';

interface DuoGarageViewProps {
  userId1: string;
  userId2: string;
  user1: UserProfile;
  user2: UserProfile;
}

export function DuoGarageView({ userId1, userId2, user1, user2 }: DuoGarageViewProps) {
  const { user: currentUser } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'garage' | 'feed'>('garage');
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedPostIndex === null) return;
    const timer = setTimeout(() => {
      const element = document.getElementById(`duo-post-${selectedPostIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedPostIndex]);

  useEffect(() => {
    setLoading(true);
    
    const carsQuery = query(
      collection(db, 'garage'),
      where('ownerId', 'in', [userId1, userId2])
    );

    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', 'in', [userId1, userId2]),
      where('isDuo', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeCars = onSnapshot(carsQuery, (snapshot) => {
      const fetchedCars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Car));
      fetchedCars.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setCars(fetchedCars);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'garage');
    });

    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(fetchedPosts);
      setLoading(false);
    }, (error) => {
      // isDuo might not be on all posts, but indexing should handle it
      console.error("Duo posts error:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeCars();
      unsubscribePosts();
    };
  }, [userId1, userId2]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="w-8 h-8 border-2 border-red-500 border-t-white rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Syncing Shared Content...</p>
    </div>
  );

  return (
    <div className="px-6 space-y-4 pb-24">
      {/* Duo Header */}
      <div className="flex items-center justify-center gap-6 py-4">
        <div className="flex flex-col items-center gap-2">
           <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-900 shadow-xl">
             {user1.profilePic ? <img src={user1.profilePic} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-zinc-800" />}
           </div>
           <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 truncate w-20 text-center">@{user1.username}</span>
        </div>
        
        <div className="flex flex-col items-center">
           <Heart size={24} className="text-red-500 animate-pulse" fill="currentColor" />
           <div className="h-4 w-px bg-zinc-800 my-1" />
        </div>

        <div className="flex flex-col items-center gap-2">
           <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-900 shadow-xl">
             {user2.profilePic ? <img src={user2.profilePic} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-zinc-800" />}
           </div>
           <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 truncate w-20 text-center">@{user2.username}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-zinc-950 rounded-2xl border border-zinc-900 mb-2">
        <button
          onClick={() => setActiveTab('garage')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'garage' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
          <CarIcon size={14} />
          Shared Garage
        </button>
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'feed' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
          <Radio size={14} />
          Duo Updates
        </button>
      </div>

      {activeTab === 'garage' ? (
        <div className="grid grid-cols-1 gap-4">
          {cars.map((car) => {
            const isUser1 = car.ownerId === userId1;
            const owner = isUser1 ? user1 : user2;

            return (
              <motion.div
                key={car.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedCar(car)}
                className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-[32px] p-4 cursor-pointer hover:border-red-500/30 transition-all flex items-center gap-4"
              >
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-zinc-800 flex-none border border-zinc-800 group-hover:border-white/10 transition-colors">
                  {car.coverImage ? (
                    <img src={car.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      <CarIcon size={32} strokeWidth={1} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                     <h3 className="text-lg font-black italic tracking-tight leading-tight uppercase truncate">
                       {car.year} {car.make} {car.model}
                     </h3>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-4 h-4 rounded-full overflow-hidden bg-zinc-800">
                        {owner.profilePic && <img src={owner.profilePic} className="w-full h-full object-cover" alt="" />}
                     </div>
                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">
                       Added by {car.ownerId === currentUser?.uid ? 'Me' : owner.username}
                     </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-zinc-950 rounded-lg border border-zinc-800 text-[8px] font-black tracking-widest uppercase">
                      {car.stage}
                    </span>
                  </div>
                </div>

                <ChevronRight size={20} className="text-zinc-700 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
              </motion.div>
            );
          })}

          {cars.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-zinc-900 rounded-3xl">
              <p className="text-zinc-600 font-black italic uppercase">Joint Garage is Empty</p>
              <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest mt-1">Start adding your builds together</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 pb-12">
           {posts.map((post, idx) => (
             <div 
               key={post.id} 
               onClick={() => setSelectedPostIndex(idx)}
               className="aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 relative group cursor-pointer"
             >
                <img src={post.mediaUrls[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                   <p className="text-[10px] font-bold line-clamp-2">{post.caption}</p>
                </div>
                {post.mediaUrls.length > 1 && (
                  <div className="absolute top-2 right-2">
                    <LayoutGrid size={12} className="text-white drop-shadow-lg" />
                  </div>
                )}
             </div>
           ))}
           {posts.length === 0 && (
             <div className="col-span-2 text-center py-12 border-2 border-dashed border-zinc-900 rounded-3xl">
               <p className="text-zinc-600 font-black italic uppercase">No Duo Updates</p>
               <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest mt-1">Mark posts as Duo during upload to see them here</p>
             </div>
           )}
        </div>
      )}

      {/* Full Screen Post Overlays */}
      <AnimatePresence>
        {selectedPostIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
             <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center bg-transparent">
               <button 
                 onClick={() => setSelectedPostIndex(null)}
                 className="p-3 bg-zinc-900/50 backdrop-blur-xl rounded-full text-white border border-white/10"
               >
                 <X size={24} />
               </button>
               <div className="px-4 py-2 bg-zinc-900/50 backdrop-blur-xl rounded-full text-white border border-white/10 text-[10px] font-black uppercase tracking-widest">
                 Duo Feed
               </div>
             </div>

             <div 
               ref={containerRef}
               className="flex-1 overflow-y-auto snap-y snap-mandatory scroll-smooth h-full w-full"
             >
               {posts.map((post, idx) => (
                 <div 
                   key={post.id} 
                   id={`duo-post-${idx}`}
                   className="h-full w-full snap-start snap-always"
                 >
                   <PostCard post={post} isActive={true} />
                 </div>
               ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCar && (
          <CarDetailsModal
            car={selectedCar}
            isOwner={selectedCar.ownerId === currentUser?.uid}
            onClose={() => setSelectedCar(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
