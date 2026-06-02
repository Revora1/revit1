import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Car } from '../types';
import { Plus, Trash2, Settings, Gauge, Info, Car as CarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CarDetailsModal } from './CarDetailsModal';

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

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading Garage...</div>;

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
