import React, { useState, useRef } from 'react';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { CarStage } from '../types';
import { X, Camera, Upload } from 'lucide-react';
import { motion } from 'motion/react';

interface AddCarModalProps {
  onClose: () => void;
}

export function AddCarModal({ onClose }: AddCarModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle body scroll lock
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    engine: '',
    mods: '',
    stage: 'Stock' as CarStage,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const currentYear = new Date().getFullYear();
    if (formData.year < 1900 || formData.year > currentYear) {
      alert(`Please enter a valid year between 1900 and ${currentYear}.`);
      setLoading(false);
      return;
    }

    try {
      let finalImageUrl = '';

      if (imageFile) {
        const storageRef = ref(storage, `garages/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, 'garage'), {
        ...formData,
        coverImage: finalImageUrl,
        ownerId: user.uid,
        createdAt: Date.now()
      });
      onClose();
    } catch (error: any) {
      if (error?.message?.includes('storage/unauthorized')) {
        alert('Permission Denied: To upload images, please go to your Firebase Console -> Storage -> Rules, and allow read/write access for authenticated users.');
      } else {
        handleFirestoreError(error, OperationType.CREATE, 'garage');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="w-full max-w-lg bg-zinc-950 rounded-t-[32px] sm:rounded-3xl border border-zinc-800 p-8 pt-6 space-y-6 max-h-[90vh] flex flex-col relative shadow-2xl"
      >
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-black italic tracking-tight">ADD TO GARAGE</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            {/* Image Upload Area */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Car Photo</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video w-full bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-2xl overflow-hidden cursor-pointer group flex flex-col items-center justify-center text-center p-4"
            >
              {imagePreview ? (
                <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <>
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 mb-2 group-hover:scale-105 transition-transform">
                    <Camera size={24} />
                  </div>
                  <p className="text-xs font-bold text-zinc-400">Select Image from Library</p>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Make</label>
              <input
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white outline-none transition-colors"
                value={formData.make}
                onChange={e => setFormData({ ...formData, make: e.target.value })}
                placeholder="e.g. BMW"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Model</label>
              <input
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white outline-none transition-colors"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g. M3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Year</label>
              <input
                type="number"
                required
                min={1900}
                max={new Date().getFullYear()}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white outline-none transition-colors"
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Stage</label>
              <select
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white outline-none transition-colors appearance-none"
                value={formData.stage}
                onChange={e => setFormData({ ...formData, stage: e.target.value as CarStage })}
              >
                {["Stock", "Stage 1", "Stage 2", "Stage 3", "Track Ready", "Show Car"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Engine</label>
             <input
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white outline-none transition-colors"
                value={formData.engine}
                onChange={e => setFormData({ ...formData, engine: e.target.value })}
                placeholder="e.g. S55 3.0L Twin-Turbo"
              />
          </div>

          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Modifications</label>
             <textarea
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white outline-none transition-colors h-24 resize-none"
                value={formData.mods}
                onChange={e => setFormData({ ...formData, mods: e.target.value })}
                placeholder="List your mods here..."
              />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black h-14 rounded-full font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? 'UPLOADING...' : 'SAVE TO GARAGE'}
          </button>
        </form>
      </div>
    </motion.div>
    </div>
  );
}
