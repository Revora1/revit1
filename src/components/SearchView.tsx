import React, { useState, useEffect, useRef } from 'react';
import { 
  Search as SearchIcon, TrendingUp, Hash, User, SlidersHorizontal, 
  Car as CarIcon, Zap, Award, ChevronRight, X, RotateCcw,
  Sparkles, Layers, Sliders, Flame, Gauge
} from 'lucide-react';
import { collection, query, where, getDocs, limit, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, Car, PerformanceRecord, CarStage } from '../types';
import { CarDetailsModal } from './CarDetailsModal';
import { motion, AnimatePresence } from 'motion/react';

type SearchTab = 'accounts' | 'builds';

interface SearchFilters {
  make: string;
  model: string;
  modType: string;
  minHp: string;
  maxHp: string;
  minTq: string;
  maxTq: string;
}

export function SearchView() {
  const [activeTab, setActiveTab] = useState<SearchTab>('accounts');
  
  // Accounts Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Builds Search State
  const [buildSearchTerm, setBuildSearchTerm] = useState('');
  const [cars, setCars] = useState<(Car & { ownerProfile?: UserProfile; verifiedHp?: number; verifiedTq?: number })[]>([]);
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [carsLoading, setCarsLoading] = useState(true);
  
  // Adv Filters Panel Toggle
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    make: '',
    model: '',
    modType: 'all',
    minHp: '',
    maxHp: '',
    minTq: '',
    maxTq: '',
  });

  // Modal State
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  
  const userCache = useRef<Record<string, UserProfile>>({});
  const trending = ['#Clio182', '#M3Build', '#JDM', '#EuroTuner', '#DriftMissile'];

  // ------------------------------------------
  // Fetch lists for accounts search
  // ------------------------------------------
  useEffect(() => {
    if (activeTab !== 'accounts') return;
    
    const searchUsers = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const qLower = query(
          usersRef,
          where('usernameLower', '>=', searchTerm.toLowerCase()),
          where('usernameLower', '<=', searchTerm.toLowerCase() + '\uf8ff'),
          limit(10)
        );
        const snap = await getDocs(qLower);
        let users = snap.docs.map(doc => doc.data() as UserProfile);

        if (users.length === 0) {
          const qNormal = query(
            usersRef,
            where('username', '>=', searchTerm),
            where('username', '<=', searchTerm + '\uf8ff'),
            limit(10)
          );
          const snapNormal = await getDocs(qNormal);
          users = snapNormal.docs.map(doc => doc.data() as UserProfile);
        }
        setResults(users);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, activeTab]);

  // ------------------------------------------
  // Fetch lists for Builds, Cars and Joined specs
  // ------------------------------------------
  useEffect(() => {
    setCarsLoading(true);
    
    // Watch performance data
    const unsubscribeRecords = onSnapshot(collection(db, 'performance_board'), (snap) => {
      const recs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PerformanceRecord));
      setRecords(recs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'performance_board');
    });

    // Watch garage cars data
    const unsubscribeGarage = onSnapshot(collection(db, 'garage'), async (snapshot) => {
      const fetchedCars = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Car));
      
      // Fetch profile data for car owners sequentially or using cache
      const uniqueOwnerIds = [...new Set(fetchedCars.map(c => c.ownerId))].filter(id => !userCache.current[id]);
      
      if (uniqueOwnerIds.length > 0) {
        const ownerDocs = await Promise.all(
          uniqueOwnerIds.map(id => getDoc(doc(db, 'users', id)))
        );
        ownerDocs.forEach(snapElem => {
          if (snapElem.exists()) {
            userCache.current[snapElem.id] = snapElem.data() as UserProfile;
          }
        });
      }

      const joined = fetchedCars.map(car => {
        // Link owner profile
        const ownerProfile = userCache.current[car.ownerId];
        
        // Find maximum dyno verify record for horsepower or torque
        const carRecords = records.filter(r => r.carId === car.id);
        const maxHp = carRecords.length > 0 ? Math.max(...carRecords.map(r => r.horsepower || 0)) : undefined;
        const maxTq = carRecords.length > 0 ? Math.max(...carRecords.map(r => r.torque || 0)) : undefined;

        return {
          ...car,
          ownerProfile,
          verifiedHp: maxHp && maxHp > 0 ? maxHp : undefined,
          verifiedTq: maxTq && maxTq > 0 ? maxTq : undefined
        };
      });

      setCars(joined);
      setCarsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'garage');
      setCarsLoading(false);
    });

    return () => {
      unsubscribeGarage();
      unsubscribeRecords();
    };
  }, [records.length]);

  const onUserClick = (uid: string) => {
    window.dispatchEvent(new CustomEvent('navigate-profile', { detail: { userId: uid } }));
  };

  const handleResetFilters = () => {
    setFilters({
      make: '',
      model: '',
      modType: 'all',
      minHp: '',
      maxHp: '',
      minTq: '',
      maxTq: '',
    });
  };

  // ------------------------------------------
  // Apply filtering rules client side
  // ------------------------------------------
  const filteredCars = cars.filter(car => {
    // Search keyword query
    if (buildSearchTerm.trim()) {
      const q = buildSearchTerm.toLowerCase();
      const matchName = `${car.year} ${car.make} ${car.model}`.toLowerCase().includes(q);
      const matchEngine = car.engine?.toLowerCase().includes(q);
      const matchMods = car.mods?.toLowerCase().includes(q);
      const matchTimeline = car.buildTimeline?.some(
        entry => entry.title.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q)
      );
      const matchOwnerName = car.ownerProfile?.username.toLowerCase().includes(q);

      if (!matchName && !matchEngine && !matchMods && !matchTimeline && !matchOwnerName) {
        return false;
      }
    }

    // Car Make Filter
    if (filters.make.trim()) {
      if (!car.make.toLowerCase().includes(filters.make.toLowerCase().trim())) {
        return false;
      }
    }

    // Car Model Filter
    if (filters.model.trim()) {
      if (!car.model.toLowerCase().includes(filters.model.toLowerCase().trim())) {
        return false;
      }
    }

    // Modification type category
    if (filters.modType !== 'all') {
      const matchesType = car.buildTimeline?.some(entry => entry.type === filters.modType);
      if (!matchesType) return false;
    }

    // HP range filtering
    if (filters.minHp.trim()) {
      const hp = car.verifiedHp || 0;
      if (hp < Number(filters.minHp)) return false;
    }
    if (filters.maxHp.trim()) {
      const hp = car.verifiedHp || 0;
      if (hp > Number(filters.maxHp)) return false;
    }

    // Torque range filtering
    if (filters.minTq.trim()) {
      const tq = car.verifiedTq || 0;
      if (tq < Number(filters.minTq)) return false;
    }
    if (filters.maxTq.trim()) {
      const tq = car.verifiedTq || 0;
      if (tq > Number(filters.maxTq)) return false;
    }

    return true;
  });

  const activeFiltersCount = [
    filters.make.trim(),
    filters.model.trim(),
    filters.modType !== 'all' ? 'active' : '',
    filters.minHp.trim(),
    filters.maxHp.trim(),
    filters.minTq.trim(),
    filters.maxTq.trim()
  ].filter(Boolean).length;

  return (
    <div className="p-6 space-y-6 bg-black min-h-full pb-20 scrollbar-hide">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Discover</h1>
          <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mt-1">Search the global community build registry</p>
        </div>

        {/* Segmented Tab Controls */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-2xl max-w-xs select-none">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'accounts' 
                ? 'bg-zinc-800 text-white shadow-lg' 
                : 'text-zinc-500 hover:text-zinc-350'
            }`}
          >
            <User size={14} />
            Users
          </button>
          <button
            onClick={() => setActiveTab('builds')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'builds' 
                ? 'bg-zinc-800 text-white shadow-lg' 
                : 'text-zinc-500 hover:text-zinc-350'
            }`}
          >
            <Layers size={14} />
            Builds & Specs
          </button>
        </div>
      </div>

      {/* ------------------------------------------ */}
      {/* ACCOUNTS GRAPHIC SEARCH */}
      {/* ------------------------------------------ */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <div className="relative group">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={20} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search builders & profiles..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold focus:border-white outline-none transition-colors"
            />
          </div>

          {searchTerm.trim() ? (
            <div className="space-y-4">
              <h2 className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Search Results</h2>
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : results.length > 0 ? (
                <div className="grid gap-3">
                  {results.map(u => (
                    <button 
                      key={u.uid}
                      onClick={() => onUserClick(u.uid)}
                      className="flex items-center gap-3 p-3 bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-white transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                        {u.profilePic ? (
                          <img src={u.profilePic} alt={u.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 font-black uppercase bg-zinc-950">
                            {u.username[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm tracking-tight group-hover:text-white transition-colors">@{u.username}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{u.followersCount} Followers</p>
                      </div>
                      <ChevronRight size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-zinc-950/40 rounded-3xl border border-zinc-800">
                  <p className="text-sm font-black italic">NO BUILDERS FOUND "{searchTerm.toUpperCase()}"</p>
                  <p className="text-xs text-zinc-500 mt-1">Try check for double spaces or typos</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Discover Dashboard Defaults */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-zinc-500">
                  <TrendingUp size={16} />
                  <span className="text-[10px] font-black tracking-widest uppercase">Popular Builder Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trending.map(tag => (
                    <button 
                      key={tag} 
                      onClick={() => setSearchTerm(tag.replace('#', ''))}
                      className="px-4 py-2 bg-zinc-900 rounded-full text-xs font-black border border-zinc-805 hover:border-white transition-all text-zinc-400 hover:text-white uppercase tracking-wider"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Hash size={16} />
                  <span className="text-[10px] font-black tracking-widest uppercase">Popular build types</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['TRACK READY', 'STANCE', 'MUSCLE', 'JDM CLASSIC'].map(cat => (
                    <div 
                      key={cat} 
                      className="h-24 bg-zinc-900 rounded-2xl p-4 flex flex-col justify-end border border-zinc-800 relative overflow-hidden group select-none"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent z-10" />
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-[10px] font-black italic tracking-tight z-20 group-hover:translate-x-1.5 transition-transform uppercase">{cat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------ */}
      {/* BUILDS & SPECS ADVANCED FILTER SEARCH */}
      {/* ------------------------------------------ */}
      {activeTab === 'builds' && (
        <div className="space-y-6">
          {/* Main Search Input & Filter Toggle */}
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={18} />
              <input 
                type="text" 
                value={buildSearchTerm}
                onChange={(e) => setBuildSearchTerm(e.target.value)}
                placeholder="Find parts, setups or builders..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-semibold focus:border-white outline-none transition-colors"
              />
              {buildSearchTerm && (
                <button 
                  onClick={() => setBuildSearchTerm('')} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest select-none bg-zinc-900 ${
                showFilters || activeFiltersCount > 0 
                  ? 'border-white text-white bg-zinc-800' 
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-650'
              }`}
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center bg-white text-black text-[9px] font-extrabold w-5 h-5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Advanced Filter Drawer */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden bg-zinc-950 p-5 rounded-3xl border border-white/5 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Sliders size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Adjust Spec Parameters</span>
                  </div>
                  {activeFiltersCount > 0 && (
                    <button 
                      onClick={handleResetFilters}
                      className="flex items-center gap-1 text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors"
                    >
                      <RotateCcw size={10} /> Reset Form
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Make Input */}
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-zinc-500 mb-1">Make / Brand</label>
                    <input 
                      type="text"
                      placeholder="e.g. BMW, Honda, Renault"
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white uppercase tracking-wide placeholder-zinc-600 focus:outline-none focus:border-white/10"
                      value={filters.make}
                      onChange={e => setFilters({...filters, make: e.target.value})}
                    />
                  </div>

                  {/* Model Input */}
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-zinc-500 mb-1">Model Series</label>
                    <input 
                      type="text"
                      placeholder="e.g. M3, Civic, Clio"
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white uppercase tracking-wide placeholder-zinc-600 focus:outline-none focus:border-white/10"
                      value={filters.model}
                      onChange={e => setFilters({...filters, model: e.target.value})}
                    />
                  </div>
                </div>

                {/* Modification Type / Build Logs Category */}
                <div className="space-y-1.5">
                  <label className="block text-[8px] font-black uppercase tracking-wider text-zinc-500">Upgrade & Log Category</label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide">
                    {[
                      { value: 'all', label: 'All Log Types' },
                      { value: 'modification', label: 'Modifications' },
                      { value: 'repair', label: 'Repairs' },
                      { value: 'maintenance', label: 'Maintenance' },
                      { value: 'dyno', label: 'Dyno Logs' },
                      { value: 'track_day', label: 'Track Events' },
                      { value: 'performance_verification', label: 'Verified Stats' }
                    ].map(opt => {
                      const isSelected = filters.modType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setFilters({...filters, modType: opt.value})}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                            isSelected 
                              ? 'bg-white text-black border-white' 
                              : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/10'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dyno Horsepower & Torque Ranges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Horsepower Range Inputs */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                      <Flame size={12} className="text-yellow-500" />
                      <label className="block text-[8px] font-black uppercase tracking-wider">Horsepower Range (WHP)</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-[10px] text-zinc-650 font-bold">MIN</span>
                        <input
                          type="number"
                          placeholder="0"
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-9 pr-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/10"
                          value={filters.minHp}
                          onChange={e => setFilters({...filters, minHp: e.target.value})}
                        />
                      </div>
                      <span className="text-zinc-600 font-bold">-</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-[10px] text-zinc-650 font-bold">MAX</span>
                        <input
                          type="number"
                          placeholder="2000"
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-10 pr-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/10"
                          value={filters.maxHp}
                          onChange={e => setFilters({...filters, maxHp: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Torque Range Inputs */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                      <Gauge size={12} className="text-blue-500" />
                      <label className="block text-[8px] font-black uppercase tracking-wider">Torque Range (LB-FT)</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-[10px] text-zinc-650 font-bold">MIN</span>
                        <input
                          type="number"
                          placeholder="0"
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-9 pr-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/10"
                          value={filters.minTq}
                          onChange={e => setFilters({...filters, minTq: e.target.value})}
                        />
                      </div>
                      <span className="text-zinc-600 font-bold">-</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-[10px] text-zinc-650 font-bold">MAX</span>
                        <input
                          type="number"
                          placeholder="2000"
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-10 pr-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/10"
                          value={filters.maxTq}
                          onChange={e => setFilters({...filters, maxTq: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Grid / List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Found {filteredCars.length} Match{filteredCars.length !== 1 ? 'es' : ''}
              </span>
            </div>

            {carsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-[9px] font-black uppercase text-zinc-600 tracking-wider">Compiling Build Matrix...</span>
              </div>
            ) : filteredCars.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {filteredCars.map((car, idx) => (
                  <motion.div
                    key={car.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => setSelectedCar(car)}
                    className="group bg-zinc-900 border border-zinc-800 rounded-3xl p-3 flex flex-col justify-between cursor-pointer hover:border-white/25 transition-all relative overflow-hidden select-none"
                  >
                    {/* Media container */}
                    <div className="aspect-square w-full relative overflow-hidden rounded-2xl bg-zinc-950 flex-none mb-3">
                      {car.coverImage ? (
                        <img 
                          src={car.coverImage} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          alt={car.make} 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-750">
                          <CarIcon size={36} strokeWidth={1} />
                        </div>
                      )}
                      
                      {car.stage && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[8px] font-black tracking-widest uppercase text-white z-10">
                          {car.stage}
                        </div>
                      )}

                      {/* Display Performance bubble if verified */}
                      {(car.verifiedHp || car.verifiedTq) && (
                        <div className="absolute bottom-2 left-2 flex gap-1 z-10">
                          {car.verifiedHp && (
                            <div className="flex items-center gap-0.5 px-2 py-0.5 bg-yellow-400 text-black rounded-lg text-[8px] font-black uppercase tracking-wider shadow">
                              <Zap size={8} fill="black" /> {car.verifiedHp} WHP
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Meta Specifications */}
                    <div className="space-y-1.5 px-1 pb-1">
                      <h3 className="text-xs font-black italic tracking-tight uppercase leading-tight text-white truncate group-hover:text-white/85 transition-colors">
                        {car.year} {car.make} {car.model}
                      </h3>
                      
                      {/* Engine summary */}
                      {car.engine && (
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-bold text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded uppercase tracking-wider truncate">
                            {car.engine}
                          </span>
                        </div>
                      )}

                      {/* Owner Tag line */}
                      {car.ownerProfile && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-4 h-4 rounded-full overflow-hidden bg-zinc-805 flex-none image-scale-normal">
                            {car.ownerProfile.profilePic ? (
                              <img src={car.ownerProfile.profilePic} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[7px] font-black text-zinc-400">
                                {car.ownerProfile.username[0]}
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-zinc-500 group-hover:text-zinc-400 transition-colors uppercase tracking-tight truncate">
                            @{car.ownerProfile.username}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-zinc-950/40 rounded-3xl border border-zinc-800">
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-700">
                  <SearchIcon size={24} strokeWidth={1} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black italic uppercase">No builds match these filters</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tune or widen your filter sliders</p>
                  <button 
                    onClick={handleResetFilters}
                    className="mt-3 inline-flex items-center gap-1 text-[9px] font-bold bg-white text-black px-3 py-1.5 rounded-lg uppercase tracking-widest antialiased hover:bg-zinc-200 transition-all"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Build Details Expansion Modal */}
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

