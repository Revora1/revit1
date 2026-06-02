import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Settings, Activity, Trash2, Edit2, Wrench } from 'lucide-react';
import { Car } from '../types';
import { deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BuildTimeline } from './BuildTimeline';
import { PerformanceSubmitModal } from './PerformanceSubmitModal';
import { useAuth } from '../context/AuthContext';
import { Trophy } from 'lucide-react';

interface CarDetailsModalProps {
  car: Car;
  isOwner: boolean;
  onClose: () => void;
}

export function CarDetailsModal({ car, isOwner, onClose }: CarDetailsModalProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const { user, profile } = useAuth();

  // Handle body scroll lock
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'garage', car.id));
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `garage/${car.id}`);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-zinc-900 w-full max-w-lg rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] relative shadow-2xl border border-zinc-800"
        >
          <div className="overflow-y-auto flex-1 overscroll-contain pb-8">
            {/* Header Image */}
            <div className="relative h-64 sm:h-80 shrink-0 bg-zinc-800">
            {car.coverImage ? (
              <img src={car.coverImage} className="w-full h-full object-cover" alt={`${car.year} ${car.make} ${car.model}`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                <Settings size={64} strokeWidth={1} />
              </div>
            )}
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full backdrop-blur-md transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-black text-xs font-black italic rounded-full shadow-lg z-10">
              {car.stage?.toUpperCase() || 'STOCK'}
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-8">
            <div>
              <h2 className="text-3xl font-black italic leading-tight tracking-tight uppercase">
                {car.year} {car.make} {car.model}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Activity size={16} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Engine</span>
                </div>
                <p className="font-medium">{car.engine}</p>
              </div>

              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Calendar size={16} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Year</span>
                </div>
                <p className="font-medium">{car.year}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <Wrench size={20} />
                <h3 className="font-bold text-lg">Modifications List</h3>
              </div>
              <div className="bg-zinc-800/30 p-5 rounded-2xl border border-white/5">
                {car.mods ? (
                  <p className="whitespace-pre-wrap text-zinc-300 leading-relaxed text-sm">
                    {car.mods}
                  </p>
                ) : (
                  <p className="text-zinc-500 italic text-sm">No modifications listed.</p>
                )}
              </div>
            </div>

            <BuildTimeline car={car} isOwner={isOwner} />
            
            {isOwner && (
              <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row justify-between gap-3 shrink-0">
                <button 
                  onClick={() => setShowPerformanceModal(true)}
                  className="px-6 py-2.5 flex items-center justify-center gap-2 rounded-xl bg-white text-black font-black text-sm active:scale-95 transition-all shadow-lg"
                >
                  <Trophy size={16} /> VERIFY PERFORMANCE
                </button>
                <button 
                  onClick={() => setShowConfirm(true)}
                  className="px-4 py-2 flex items-center justify-center gap-2 rounded-xl transition-all font-bold text-sm text-red-500 bg-red-500/10 hover:bg-red-500/20"
                >
                  <Trash2 size={16} /> Delete Car
                </button>
              </div>
            )}
            <div className="h-4"></div>
          </div>
        </div>
      </motion.div>

        {showConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl"
            >
              <h3 className="text-xl font-black italic tracking-tight">DELETE CAR?</h3>
              <p className="text-zinc-400 text-sm font-medium">Are you sure you want to delete this car? This action cannot be undone.</p>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="px-5 py-2.5 font-bold text-sm rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleDelete}
                  className="px-5 py-2.5 font-bold text-sm rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  DELETE
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showPerformanceModal && user && (
          <PerformanceSubmitModal 
            car={car} 
            userName={profile?.username || user.displayName || 'User'} 
            onClose={() => setShowPerformanceModal(false)} 
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
