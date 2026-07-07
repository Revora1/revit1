import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Car } from '../types';
import { Plus, Trash2, Settings, Gauge, Info, Zap, Sparkles, TrendingUp, Car as CarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CarDetailsModal } from './CarDetailsModal';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface GarageProps {
  userId: string;
  isOwner: boolean;
  onAddCar: () => void;
}

export function Garage({ userId, isOwner, onAddCar }: GarageProps) {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [perfRecords, setPerfRecords] = useState<any[]>([]);

  useEffect(() => {
    const qPerf = query(
      collection(db, 'performance_board'),
      where('ownerId', '==', userId)
    );

    const unsubscribe = onSnapshot(qPerf, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPerfRecords(fetched);
    }, (error) => {
      console.error('Error fetching performance board:', error);
    });

    return unsubscribe;
  }, [userId]);

  useEffect(() => {
    const q = query(
      collection(db, 'garage'),
      where('ownerId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCars = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Car[];
      setCars(fetchedCars);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'garage');
    });

    return unsubscribe;
  }, [userId]);

  const handleDelete = async (e: React.MouseEvent, carId: string) => {
    e.stopPropagation();
    if (!confirm('Remove this car from your garage?')) return;
    try {
      await deleteDoc(doc(db, 'garage', carId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `garage/${carId}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse px-4 pb-24">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-zinc-900 rounded-lg" />
          <div className="h-9 w-24 bg-zinc-900 rounded-full" />
        </div>

        {/* Chart Card Skeleton */}
        <div className="p-5 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3.5 w-24 bg-zinc-800 rounded" />
              <div className="h-6 w-36 bg-zinc-800 rounded" />
            </div>
            <div className="h-7 w-20 bg-zinc-800 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-zinc-800 rounded-full" />
            </div>
          </div>
          <div className="h-24 w-full bg-zinc-900/50 rounded-2xl border border-zinc-850" />
        </div>

        {/* Cars grid skeleton */}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-zinc-950 border border-zinc-900 rounded-3xl p-3.5 space-y-3">
              <div className="aspect-[4/3] w-full bg-zinc-900 rounded-2xl" />
              <div className="space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-2/3" />
                <div className="h-2 bg-zinc-850 rounded w-1/2" />
              </div>
              <div className="flex gap-1.5 pt-1">
                <div className="h-4 bg-zinc-900 rounded w-10" />
                <div className="h-4 bg-zinc-900 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Process and sort records chronologically
  const sortedRecords = [...perfRecords].sort((a, b) => a.createdAt - b.createdAt);
  
  const carPeakPower: Record<string, number> = {};
  const timelineData = sortedRecords.map((rec) => {
    const hp = rec.horsepower || 0;
    const prevMax = carPeakPower[rec.carId] || 0;
    if (hp > prevMax) {
      carPeakPower[rec.carId] = hp;
    }
    const totalHp = Object.values(carPeakPower).reduce((sum, h) => sum + h, 0);
    return {
      date: new Date(rec.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      timestamp: rec.createdAt,
      hp: totalHp,
      car: `${rec.carMake} ${rec.carModel}`,
      rawHp: hp
    };
  });

  const hasRealData = timelineData.length > 0;
  const currentTotalHP = hasRealData ? timelineData[timelineData.length - 1].hp : 0;

  // Determine Milestone Goals
  let targetGoal = 300;
  let clubName = "300 Club";

  if (currentTotalHP >= 800) {
    targetGoal = 1200;
    clubName = "1200 Club";
  } else if (currentTotalHP >= 500) {
    targetGoal = 800;
    clubName = "800 Club";
  } else if (currentTotalHP >= 300) {
    targetGoal = 500;
    clubName = "500 Club";
  }

  const milestoneProgress = Math.min(100, Math.round((currentTotalHP / targetGoal) * 100));

  const displayData = hasRealData
    ? (timelineData.length === 1 
        ? [
            { date: 'Initial', hp: Math.max(0, timelineData[0].hp - 50), car: 'Before Mods', timestamp: timelineData[0].timestamp - 86400000 },
            timelineData[0]
          ]
        : timelineData
      )
    : [
        { date: 'Initial', hp: 120, car: 'Stock baseline' },
        { date: 'Intake', hp: 160, car: 'Bolt-ons' },
        { date: 'Stage 1', hp: 240, car: 'ECU Tune' },
        { date: 'Built', hp: 350, car: 'Big Turbo Upgrade' }
      ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-950 border border-zinc-900 p-2.5 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-[10px] space-y-0.5 font-bold">
          <p className="text-zinc-500 font-sans">{data.date}</p>
          <p className="text-white text-xs font-black italic">{data.hp} WHP TOTAL</p>
          {data.car && <p className="text-yellow-500 uppercase tracking-widest text-[8px]">{data.car}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-xl font-black italic tracking-tight">MY GARAGE</h2>
        {isOwner && (
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`text-[10px] font-black tracking-widest px-3 py-1 rounded-full border transition-all ${isEditMode ? 'bg-red-500 border-red-500 text-white' : 'border-zinc-800 text-zinc-500 hover:border-zinc-500'}`}
            >
              {isEditMode ? 'DONE' : 'MANAGE'}
            </button>
            <button 
              onClick={onAddCar}
              className="p-1 text-white hover:text-zinc-400 transition-colors"
            >
              <Plus size={24} />
            </button>
          </div>
        )}
      </div>

      {/* Power Progression Visualization Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 p-5 rounded-3xl bg-zinc-950 border border-zinc-900 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-[10px] font-black text-zinc-500 tracking-widest uppercase flex items-center gap-1.5">
              <Zap size={11} className="text-yellow-500 fill-yellow-500 animate-pulse" />
              Power Progression
            </h3>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black italic tracking-tighter text-white">
                {currentTotalHP} <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 not-italic">WHP</span>
              </span>
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Peak Verified</p>
            </div>
          </div>

          <div className="text-right space-y-1">
            <span className="inline-flex px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[9px] font-black text-yellow-500 tracking-widest uppercase">
              {clubName}
            </span>
            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Target Goal: {targetGoal} WHP</p>
          </div>
        </div>

        {/* Dynamic Milestone Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[8px] font-black text-zinc-500 tracking-widest uppercase">
            <span>Progress to {clubName}</span>
            <span className="text-yellow-500">{milestoneProgress}%</span>
          </div>
          <div className="h-2 w-full bg-zinc-900 border border-zinc-800/50 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${milestoneProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
            />
          </div>
        </div>

        {/* Sparkline Space Grotesk / Mono style */}
        <div className="h-24 w-full relative mt-3 bg-zinc-950 rounded-xl overflow-hidden">
          {!hasRealData && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-center z-10 px-4">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                <Info size={10} className="text-yellow-500" />
                PREVIEWING POWER LINE
              </p>
              <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
                Verify performance runs to unlock live dyno charts!
              </p>
            </div>
          )}
          
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart 
              data={displayData} 
              margin={{ top: 10, right: 10, left: -25, bottom: -10 }}
            >
              <defs>
                <linearGradient id="colorHp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={hasRealData ? "#eab308" : "#3f3f46"} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={hasRealData ? "#eab308" : "#3f3f46"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#52525b", fontSize: 8, fontWeight: 900 }}
              />
              <YAxis 
                type="number" 
                domain={["auto", "auto"]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#52525b", fontSize: 8, fontWeight: 900 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#27272a", strokeWidth: 1 }} />
              <Area 
                type="monotone" 
                dataKey="hp" 
                stroke={hasRealData ? "#eab308" : "#3f3f46"} 
                strokeWidth={hasRealData ? 2 : 1.5} 
                strokeDasharray={hasRealData ? undefined : "3 3"}
                fillOpacity={1} 
                fill="url(#colorHp)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {cars.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-8"
        >
          <div className="relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500">
                  <CarIcon size={48} strokeWidth={1} />
                </div>
                <motion.div 
                  className="absolute -top-1 -right-1 w-10 h-10 bg-white rounded-full flex items-center justify-center text-black border-4 border-zinc-900 shadow-xl"
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                >
                  <Plus size={20} strokeWidth={3} />
                </motion.div>
              </div>
            </div>

            <div className="max-w-xs mx-auto space-y-3">
              <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Your Garage is Empty</h3>
              <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider leading-relaxed">
                Showcase your build, track your mods, and climb the performance board. Start by adding your first vehicle.
              </p>
            </div>

            {isOwner && (
              <button 
                onClick={onAddCar}
                className="w-full bg-white text-black h-16 rounded-full font-black tracking-tight active:scale-95 transition-all shadow-xl shadow-white/5 uppercase"
              >
                ADD MY FIRST CAR
              </button>
            )}

            {/* Background design element */}
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-white/5 blur-3xl rounded-full"></div>
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-zinc-500/10 blur-3xl rounded-full"></div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-3 gap-1 px-1 border-t border-zinc-900 mt-2">
          {cars.map((car) => (
            <motion.div 
              key={car.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => !isEditMode && setSelectedCar(car)}
              className={`relative aspect-square bg-zinc-900 overflow-hidden group ${isEditMode ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {car.coverImage ? (
                <img 
                  src={car.coverImage} 
                  className={`w-full h-full object-cover transition-transform duration-500 ${isEditMode ? 'opacity-50 grayscale' : 'group-hover:scale-105'}`} 
                  alt={`${car.year} ${car.make} ${car.model}`} 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  <Settings size={28} strokeWidth={1}/>
                </div>
              )}
              
              {isEditMode && isOwner && (
                <button
                  onClick={(e) => handleDelete(e, car.id)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 group"
                >
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Trash2 size={20} />
                  </div>
                </button>
              )}

              {car.stage && !isEditMode && (
                <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 inline-flex px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[8px] md:text-[10px] font-bold tracking-wider rounded border border-white/10 max-w-[calc(100%-8px)] truncate">
                   {car.stage.toUpperCase()}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
      
      {selectedCar && (
        <CarDetailsModal 
          car={selectedCar} 
          isOwner={isOwner} 
          onClose={() => setSelectedCar(null)} 
        />
      )}
    </div>
  );
}
