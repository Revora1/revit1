import React, { useState, useRef } from 'react';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { Car, PerformanceRecord } from '../types';
import { X, Camera, Gauge, Zap, Timer } from 'lucide-react';
import { motion } from 'motion/react';

interface PerformanceSubmitModalProps {
  car: Car;
  userName: string;
  onClose: () => void;
}

export function PerformanceSubmitModal({ car, userName, onClose }: PerformanceSubmitModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    horsepower: '',
    torque: '',
    quarterMile: '',
    category: 'horsepower' as 'horsepower' | 'torque' | 'quarter_mile'
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !proofFile) return;
    setLoading(true);

    try {
      const storageRef = ref(storage, `performance_proof/${user.uid}/${Date.now()}_${proofFile.name}`);
      const snapshot = await uploadBytes(storageRef, proofFile);
      const proofUrl = await getDownloadURL(snapshot.ref);

      const recordData: Omit<PerformanceRecord, 'id'> = {
        carId: car.id,
        ownerId: user.uid,
        ownerUsername: userName,
        carMake: car.make,
        carModel: car.model,
        horsepower: formData.horsepower ? parseFloat(formData.horsepower) : undefined,
        torque: formData.torque ? parseFloat(formData.torque) : undefined,
        quarterMileTime: formData.quarterMile ? parseFloat(formData.quarterMile) : undefined,
        proofUrl,
        createdAt: Date.now()
      };

      // Add to performance board
      await addDoc(collection(db, 'performance_board'), recordData);

      // Add to build timeline
      const timelineEntry = {
        id: Math.random().toString(36).substr(2, 9),
        title: 'Performance Verified',
        description: `Verified stats: ${formData.horsepower ? formData.horsepower + ' WHP ' : ''}${formData.quarterMile ? formData.quarterMile + 's 1/4 Mile' : ''}`,
        date: Date.now(),
        type: 'performance_verification',
        mediaUrl: proofUrl
      };

      await updateDoc(doc(db, 'garage', car.id), {
        buildTimeline: arrayUnion(timelineEntry)
      });

      onClose();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'performance_board');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="w-full max-w-lg bg-zinc-950 rounded-t-[32px] sm:rounded-3xl border border-zinc-800 p-8 pt-6 space-y-6 max-h-[90vh] overflow-y-auto scrollbar-hide"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-black italic tracking-tight uppercase">Verify Performance</h2>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{car.year} {car.make} {car.model}</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Proof Upload */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Upload Proof (Dyno Sheet / Slip)</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video w-full bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-3xl overflow-hidden cursor-pointer group flex flex-col items-center justify-center text-center p-4 transition-all hover:border-zinc-500"
            >
              {proofPreview ? (
                <img src={proofPreview} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <>
                  <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 mb-3 group-hover:scale-105 transition-transform">
                    <Camera size={28} />
                  </div>
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Select Proof Image</p>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase flex items-center gap-2">
                <Zap size={10} className="text-yellow-500" /> Horsepower (WHP)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:border-white outline-none transition-colors"
                value={formData.horsepower}
                onChange={e => setFormData({ ...formData, horsepower: e.target.value })}
                placeholder="0.0"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase flex items-center gap-2">
                <Gauge size={10} className="text-blue-500" /> Torque (LB-FT)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:border-white outline-none transition-colors"
                value={formData.torque}
                onChange={e => setFormData({ ...formData, torque: e.target.value })}
                placeholder="0.0"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase flex items-center gap-2">
                <Timer size={10} className="text-red-500" /> 1/4 Mile Time (Seconds)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:border-white outline-none transition-colors"
                value={formData.quarterMile}
                onChange={e => setFormData({ ...formData, quarterMile: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
            <p className="text-[10px] text-zinc-500 font-bold uppercase leading-relaxed text-center">
              Ensure your proof image clearly shows the vehicle details and results. Falsifying records will result in a ban.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !proofFile}
            className="w-full bg-white text-black h-16 rounded-full font-black tracking-tight active:scale-95 transition-all shadow-xl shadow-white/5 disabled:opacity-50 uppercase"
          >
            {loading ? 'SUBMITTING...' : 'SUBMIT FOR VERIFICATION'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
