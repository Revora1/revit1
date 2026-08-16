import React, { useState } from 'react';
import { X, Wrench, Upload, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import imageCompression from 'browser-image-compression';

interface AddMechanicModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddMechanicModal({ onClose, onAdded }: AddMechanicModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerPreview(URL.createObjectURL(file));
      try {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        });
        setBannerFile(compressedFile);
      } catch (err) {
        console.error("Image compression error:", err);
        setBannerFile(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      let bannerUrl = '';
      if (bannerFile) {
        const fileRef = ref(storage, `mechanic_banners/${Date.now()}_${bannerFile.name}`);
        await uploadBytes(fileRef, bannerFile);
        bannerUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, 'mechanics'), {
        userId: user.uid,
        companyName,
        description,
        specialties,
        phone,
        email,
        website,
        location,
        bannerUrl,
        createdAt: serverTimestamp()
      });

      onAdded();
      onClose();
    } catch (err: any) {
      console.error('Error adding mechanic:', err);
      setError(err.message || 'Failed to add shop. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2 text-white">
            <Wrench size={20} className="text-yellow-500" />
            <h2 className="font-black uppercase tracking-widest text-sm">List Your Shop</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 custom-scrollbar">
          <form id="mechanic-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Banner Upload */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Shop Banner (Optional)</label>
              <div 
                onClick={() => document.getElementById('banner-upload')?.click()}
                className="w-full h-32 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors cursor-pointer relative overflow-hidden group"
              >
                {bannerPreview ? (
                  <>
                    <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Change Image</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    <ImageIcon size={24} className="mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider">Upload Banner</span>
                  </div>
                )}
                <input 
                  id="banner-upload"
                  type="file" 
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerSelect}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Performance Tuning"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Location *</label>
              <input
                type="text"
                required
                placeholder="e.g. Los Angeles, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Specialties *</label>
              <input
                type="text"
                required
                placeholder="e.g. Engine Swaps, Dyno Tuning, Suspension"
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="Contact email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Website (Optional)</label>
              <input
                type="url"
                placeholder="https://"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description *</label>
              <textarea
                required
                placeholder="Tell the community about your shop..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 min-h-[100px] resize-none font-medium"
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-xs text-center font-bold">{error}</p>
              </div>
            )}
          </form>
        </div>

        <div className="p-4 border-t border-zinc-900 bg-zinc-950">
          <button
            type="submit"
            form="mechanic-form"
            disabled={loading}
            className="w-full bg-yellow-500 text-black py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Upload size={16} />
                List Shop
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
