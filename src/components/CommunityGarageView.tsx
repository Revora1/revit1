import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, limit, getDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Car, UserProfile } from '../types';
import { Search, SlidersHorizontal, Grid, List, ChevronRight, Car as CarIcon, ArrowRight, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CarDetailsModal } from './CarDetailsModal';

export function CommunityGarageView() {
  const [cars, setCars] = useState<(Car & { owner?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const userCache = useRef<Record<string, UserProfile>>({});

  const goToBoard = () => {
    window.dispatchEvent(new CustomEvent('navigate-dyno'));
  };

  useEffect(() => {
    const q = query(
      collection(db, 'garage'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedCars = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Car));
      
      // Fetch owners for the cars
      const ownerIds = [...new Set(fetchedCars.map(c => c.ownerId))].filter(id => !userCache.current[id]);
      
      if (ownerIds.length > 0) {
        const ownerDocs = await Promise.all(ownerIds.map(id => getDoc(doc(db, 'users', id))));
        ownerDocs.forEach(snap => {
          if (snap.exists()) {
            userCache.current[snap.id] = snap.data() as UserProfile;
          }
        });
      }

      setCars(fetchedCars.map(car => ({
        ...car,
        owner: userCache.current[car.ownerId]
      })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'garage');
    });

    return unsubscribe;
  }, []);

  const filteredCars = cars.filter(car => 
    `${car.year} ${car.make} ${car.model}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.owner?.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const navigateToProfile = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('navigate-profile', { detail: { userId } }));
  };

  return (
    <div className="min-h-full bg-black flex flex-col pb-24">
      {/* Header */}
      <div className="p-6 space-y-6 flex-none">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">Community</h1>
            <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white/40 leading-none mt-1">Garage</h2>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button 
              onClick={goToBoard}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl active:scale-95 transition-all shadow-lg shadow-white/5"
            >
              <Trophy size={16} fill="black" />
              <span className="text-[10px] font-black uppercase tracking-widest">Board</span>
            </button>
            <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Grid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-white" size={18} />
          <input 
            type="text" 
            placeholder="FIND A SPECIFIC BUILD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-[10px] font-black tracking-widest uppercase focus:border-white outline-none transition-all placeholder:text-zinc-700"
          />
        </div>
      </div>

      {/* Grid View */}
      <div className="flex-1 px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
            <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Synchronizing builds...</span>
          </div>
        ) : filteredCars.length > 0 ? (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-4" : "space-y-4"}>
            {filteredCars.map((car, idx) => (
              <motion.div
                key={car.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedCar(car)}
                className={`group relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-[24px] cursor-pointer hover:border-white/20 transition-all ${viewMode === 'list' ? 'flex items-center gap-4 p-3' : 'flex flex-col'}`}
              >
                {/* Media */}
                <div className={`${viewMode === 'grid' ? 'aspect-square w-full' : 'w-24 h-24 flex-none'} relative overflow-hidden rounded-[20px]`}>
                  {car.coverImage ? (
                    <img 
                      src={car.coverImage} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      alt="" 
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600">
                      <CarIcon size={32} strokeWidth={1} />
                    </div>
                  )}
                  {car.stage && viewMode === 'grid' && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[8px] font-black tracking-widest uppercase text-white z-10">
                      {car.stage}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1 p-0' : 'space-y-3'}`}>
                  <div>
                    <h3 className="text-sm font-black italic tracking-tight leading-tight uppercase truncate">
                      {car.year} {car.make} {car.model}
                    </h3>
                    {car.owner && (
                      <button 
                         onClick={(e) => navigateToProfile(e, car.ownerId)}
                         className="flex items-center gap-1.5 mt-1 hover:text-zinc-400 transition-colors"
                      >
                        <div className="w-4 h-4 rounded-full overflow-hidden bg-zinc-800 flex-none">
                           {car.owner.profilePic && <img src={car.owner.profilePic} className="w-full h-full object-cover" alt="" />}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider truncate">
                          @{car.owner.username}
                        </span>
                      </button>
                    )}
                  </div>

                  {viewMode === 'grid' && (
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                       <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                         VIEW BUILD
                       </span>
                       <ArrowRight size={14} className="text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-700">
              <Search size={32} strokeWidth={1} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black italic uppercase">No builds found</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Try adjusting your search</p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedCar && (
          <CarDetailsModal 
            car={selectedCar} 
            isOwner={false} 
            onClose={() => setSelectedCar(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
