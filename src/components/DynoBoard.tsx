import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PerformanceRecord } from '../types';
import { Trophy, Zap, Gauge, Timer, ChevronRight, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type SortCategory = 'horsepower' | 'torque' | 'quarterMileTime';

export function DynoBoard({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<SortCategory>('horsepower');

  useEffect(() => {
    // Note: If you haven't created a composite index in Firebase yet, 
    // this query might require one if filtered by category then sorted.
    // However, since we are fetching all and sorting client-side for simplicity 
    // unless the dataset is huge, let's just fetch top 100 overall and filter/sort.
    // Actually, for a proper leaderboard, we should sort by the specific field.
    
    // We'll trust the user has existing records or will create them.
    const q = query(
      collection(db, 'performance_board'),
      orderBy(activeCategory, activeCategory === 'quarterMileTime' ? 'asc' : 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PerformanceRecord[];
      
      // Filter out records where the active category stat is missing
      const validRecords = fetched.filter(r => r[activeCategory] !== undefined);
      setRecords(validRecords);
      setLoading(false);
    }, (error) => {
      // If index is missing, handleFirestoreError will log the link to create it.
      handleFirestoreError(error, OperationType.LIST, 'performance_board');
      setLoading(false);
    });

    return unsubscribe;
  }, [activeCategory]);

  const categories = [
    { id: 'horsepower', label: 'HP', icon: Zap, color: 'text-yellow-400' },
    { id: 'torque', label: 'TQ', icon: Gauge, color: 'text-blue-400' },
    { id: 'quarterMileTime', label: '1/4', icon: Timer, color: 'text-red-500' },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className={`px-4 pb-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-20 ${hideHeader ? 'pt-2' : 'pt-12'}`}>
        {!hideHeader && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase italic">Perf. Board</h1>
              <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mt-1">Verified Builds & Dyno Stats</p>
            </div>
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              <Trophy className="text-yellow-500" size={24} />
            </div>
          </div>
        )}

        {/* Categories Tab Bar */}
        <div className="flex bg-zinc-900 p-1 rounded-2xl gap-1">
          {categories.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 ${
                activeCategory === id 
                ? 'bg-zinc-800 text-white shadow-lg' 
                : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={14} className={activeCategory === id ? color : ''} />
              <span className="text-xs font-black uppercase tracking-widest">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20 px-8">
            <Trophy className="mx-auto mb-4 text-zinc-800" size={48} />
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No verified records yet</p>
            <p className="text-xs text-zinc-600 mt-2">Submit your car's performance proof to rank up.</p>
          </div>
        ) : (
          <>
            {/* Podium Section */}
            <div className="grid grid-cols-1 gap-4 mb-8">
              {records.slice(0, 3).map((record, index) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  key={record.id}
                  className={`relative overflow-hidden rounded-[32px] p-0.5 ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 via-yellow-600 to-yellow-900 shadow-2xl shadow-yellow-500/20' :
                    index === 1 ? 'bg-gradient-to-br from-zinc-300 via-zinc-500 to-zinc-700 shadow-xl shadow-zinc-500/10' :
                    'bg-gradient-to-br from-orange-400 via-orange-600 to-orange-900 shadow-xl shadow-orange-500/10'
                  }`}
                >
                  <div className="bg-zinc-950 rounded-[30px] p-5 flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-zinc-800 bg-zinc-900">
                        <img src={record.proofUrl} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-2xl border-4 border-zinc-950 ${
                        index === 0 ? 'bg-yellow-500 text-black' : 
                        index === 1 ? 'bg-zinc-400 text-black' : 
                        'bg-orange-500 text-white'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy size={12} className={index === 0 ? 'text-yellow-500' : index === 1 ? 'text-zinc-400' : 'text-orange-500'} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          {index === 0 ? 'Current Leader' : index === 1 ? 'Runner Up' : 'Third Place'}
                        </span>
                      </div>
                      <h3 className="text-lg font-black italic tracking-tighter text-white uppercase leading-none">
                        {record.carMake} {record.carModel}
                      </h3>
                      <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mt-1">@{record.ownerUsername}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-black italic tracking-tighter block leading-none ${
                        activeCategory === 'horsepower' ? 'text-yellow-400' : 
                        activeCategory === 'torque' ? 'text-blue-400' : 'text-red-500'
                      }`}>
                        {record[activeCategory]}
                        <span className="text-xs not-italic uppercase ml-1 opacity-60">
                          {activeCategory === 'horsepower' ? 'whp' : activeCategory === 'torque' ? 'tq' : 's'}
                        </span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* List Section */}
            <div className="space-y-3">
              {records.length > 3 && (
                <div className="px-2 py-2">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Rankings 4 - {records.length}</h4>
                </div>
              )}
              <AnimatePresence mode="popLayout">
                {records.slice(3).map((record, index) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    key={record.id}
                    className="group bg-zinc-900 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
                  >
                    <span className="text-xs font-black text-zinc-600 w-4">{index + 4}</span>
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0">
                      <img src={record.proofUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-white truncate uppercase tracking-tight">{record.carMake} {record.carModel}</h4>
                      <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">@{record.ownerUsername}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black italic tracking-tighter text-white">
                        {record[activeCategory]}
                        <span className="text-[8px] not-italic uppercase ml-0.5 opacity-50">
                          {activeCategory === 'horsepower' ? 'HP' : activeCategory === 'torque' ? 'TQ' : 'S'}
                        </span>
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
