import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, limit, getDoc, doc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Car, UserProfile } from '../types';
import { Search, SlidersHorizontal, Grid, List, ChevronRight, Car as CarIcon, ArrowRight, Trophy, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CarDetailsModal } from './CarDetailsModal';

export function CommunityGarageView({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [cars, setCars] = useState<(Car & { owner?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const userCache = useRef<Record<string, UserProfile>>({});

  const [activeSegment, setActiveSegment] = useState<'single' | 'duo'>('single');
  const [couples, setCouples] = useState<{ user1: UserProfile; user2: UserProfile; cars: Car[] }[]>([]);
  const [loadingCouples, setLoadingCouples] = useState(false);

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

  useEffect(() => {
    if (activeSegment !== 'duo') return;
    
    const fetchCouples = async () => {
      setLoadingCouples(true);
      try {
        const q = query(collection(db, 'users'));
        const snap = await getDocs(q);
        const allUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        const usersWithPartner = allUsers.filter(u => u.partnerId);

        const seen = new Set<string>();
        const paired: { user1: UserProfile; user2: UserProfile; cars: Car[] }[] = [];

        for (const u of usersWithPartner) {
          if (seen.has(u.uid)) continue;
          const partner = allUsers.find(p => p.uid === u.partnerId);
          if (partner) {
            seen.add(u.uid);
            seen.add(partner.uid);

            const jointCars = cars.filter(c => c.ownerId === u.uid || c.ownerId === partner.uid);
            paired.push({
              user1: u,
              user2: partner,
              cars: jointCars
            });
          }
        }
        setCouples(paired);
      } catch (e) {
        console.error("Error loading couples:", e);
      } finally {
        setLoadingCouples(false);
      }
    };

    fetchCouples();
  }, [activeSegment, cars]);

  const filteredCouples = couples.filter(couple => 
    couple.user1.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    couple.user2.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    couple.cars.some(car => `${car.year} ${car.make} ${car.model}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const navigateToDuoGarage = (userId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-profile', { 
      detail: { userId, initialTab: 'duo' } 
    }));
  };

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
      <div className={`${hideHeader ? 'p-4 space-y-4' : 'p-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] space-y-6'} flex-none sticky top-0 bg-black/95 border-b border-zinc-900/60 backdrop-blur-md z-20`}>
        {!hideHeader ? (
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
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Community Builds</span>
            <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Grid size={14} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-white" size={18} />
          <input 
            type="text" 
            placeholder="FIND A SPECIFIC BUILD OR PARTNER..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-[10px] font-black tracking-widest uppercase focus:border-white outline-none transition-all placeholder:text-zinc-700"
          />
        </div>

        {/* Tab/Segment Controller */}
        <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-900">
          <button
            onClick={() => setActiveSegment('single')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSegment === 'single' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            Individual Builds
          </button>
          <button
            onClick={() => setActiveSegment('duo')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSegment === 'duo' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            Joint Duo Garages
          </button>
        </div>
      </div>

      {/* Grid View */}
      <div className="flex-1 px-4">
        {activeSegment === 'single' ? (
          loading ? (
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
          )
        ) : (
          loadingCouples ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
              <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Synchronizing joint garages...</span>
            </div>
          ) : filteredCouples.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
              {filteredCouples.map((couple, idx) => (
                <motion.div
                  key={`${couple.user1.uid}-${couple.user2.uid}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigateToDuoGarage(couple.user1.uid)}
                  className="group relative overflow-hidden bg-zinc-900 border border-zinc-850 rounded-[32px] p-5 cursor-pointer hover:border-red-500/20 transition-all flex flex-col gap-4 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="flex items-center relative h-12 w-20">
                          <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden z-10 bg-zinc-800 shadow-md">
                             {couple.user1.profilePic ? (
                               <img src={couple.user1.profilePic} className="w-full h-full object-cover" alt="" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                                 {couple.user1.username[0]}
                               </div>
                             )}
                          </div>
                          
                          <div className="absolute left-6 w-10 h-10 rounded-full border-2 border-black overflow-hidden z-20 bg-zinc-800 shadow-md">
                             {couple.user2.profilePic ? (
                               <img src={couple.user2.profilePic} className="w-full h-full object-cover" alt="" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                                 {couple.user2.username[0]}
                               </div>
                             )}
                          </div>
                          <div className="absolute left-4 top-6 bg-black border border-red-500/30 p-1 rounded-full z-30 shadow">
                            <Heart size={8} className="text-red-500 animate-pulse" fill="currentColor" />
                          </div>
                       </div>

                       <div className="space-y-0.5">
                         <h3 className="text-xs font-black italic uppercase tracking-wider text-white group-hover:text-red-500 transition-colors">
                           @{couple.user1.username} & @{couple.user2.username}
                         </h3>
                         <span className="text-[8px] bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest leading-none">
                            Shared Garage • {couple.cars.length} {couple.cars.length === 1 ? 'Build' : 'Builds'}
                         </span>
                       </div>
                    </div>

                    <ChevronRight size={18} className="text-zinc-750 group-hover:text-red-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                       {couple.cars.slice(0, 3).map((car) => (
                          <div key={car.id} className="relative aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-850">
                             {car.coverImage ? (
                               <img src={car.coverImage} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                 <CarIcon size={14} strokeWidth={1} />
                               </div>
                             )}
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 p-2 flex flex-col justify-end">
                                <span className="text-[8px] font-black tracking-tight leading-tight uppercase truncate text-white">{car.year} {car.model}</span>
                             </div>
                          </div>
                       ))}
                       {couple.cars.length === 0 && (
                          <div className="col-span-3 py-6 text-center text-zinc-750 border border-dashed border-zinc-800 rounded-xl">
                            <p className="text-[8px] font-black uppercase tracking-widest italic">Garage Empty</p>
                          </div>
                       )}
                    </div>
                  </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-700">
                <Heart size={32} strokeWidth={1} className="text-zinc-750" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black italic uppercase">No Duo Garages found</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Connect with a partner to unlock Duo Garages</p>
              </div>
            </div>
          )
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
