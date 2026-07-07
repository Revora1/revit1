import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { X, Upload, Activity, Camera, Plus, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MusicSelector, SongInfo } from './MusicSelector';
import { MediaType } from '../types';

export function StoryCreator({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<{ file: File; preview: string; type: MediaType }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSong, setSelectedSong] = useState<SongInfo | null>(null);
  const [showMusicSelector, setShowMusicSelector] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      const newItems = selectedFiles.map(file => ({
        file,
        type: 'image' as MediaType,
        preview: URL.createObjectURL(file)
      }));
      setItems(prev => [...prev, ...newItems]);
    }
  };

  const removeItem = (index: number) => {
    setItems(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0) return;

    setLoading(true);
    setUploadProgress(0);
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const storageRef = ref(storage, `stories/${user.uid}/${Date.now()}_${item.file.name}`);
        const snapshot = await uploadBytes(storageRef, item.file);
        const mediaUrl = await getDownloadURL(snapshot.ref);

        const storyId = `${Date.now()}_${user.uid}_${Math.random().toString(36).substring(2, 9)}`;
        await setDoc(doc(db, 'stories', storyId), {
           authorId: user.uid,
           mediaUrl,
           mediaType: item.type,
           songId: selectedSong ? JSON.stringify(selectedSong) : '',
           createdAt: Date.now()
        });
        setUploadProgress(((i + 1) / items.length) * 100);
      }
      onClose();
    } catch (err: any) {
      if (err?.message?.includes('storage/unauthorized')) {
        alert('Permission Denied: Please check your Firebase Storage rules.');
      } else {
        handleFirestoreError(err, OperationType.CREATE, 'stories');
      }
    } finally {
       setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        className="fixed inset-0 z-[100] bg-black flex flex-col"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 pt-[max(16px,env(safe-area-inset-top))] px-4 flex items-center justify-between pointer-events-none">
           <button 
             onClick={onClose} 
             className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white pointer-events-auto hover:bg-black/60 transition-colors shadow-lg"
           >
              <X size={24} />
           </button>
           {items.length === 0 && (
             <h2 className="text-lg font-black italic tracking-widest uppercase text-white drop-shadow-xl">Add Story</h2>
           )}
           {items.length > 0 ? (
             <button
               onClick={() => setShowMusicSelector(true)}
               className={`p-2.5 backdrop-blur-md rounded-full pointer-events-auto hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-1.5 ${
                 selectedSong ? 'bg-red-500 text-white animate-pulse' : 'bg-black/40 text-zinc-300'
               }`}
             >
               <Music size={20} />
               {selectedSong && (
                 <span className="text-[9px] font-black uppercase tracking-wider pr-1">
                   {selectedSong.title.slice(0, 10)}
                 </span>
               )}
             </button>
           ) : (
             <div className="w-10"></div>
           )}
        </div>

        <div className="flex-1 relative flex flex-col items-center justify-center">
           {items.length > 0 ? (
              <div className="w-full h-full flex flex-col pt-16">
                 <div className="flex-1 min-h-0 relative flex items-center justify-center bg-black">
                    {/* Current Main Preview (showing the first one) */}
                    <div className="max-w-full max-h-full">
                       <img src={items[0].preview} className="max-w-full max-h-full object-contain" />
                    </div>

                    {/* Thumbnails list */}
                    <div className="absolute bottom-32 left-0 right-0 px-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                       {items.map((item, idx) => (
                          <div key={idx} className="relative flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
                             <img src={item.preview} className="w-full h-full object-cover" />
                             <button 
                               onClick={() => removeItem(idx)}
                               className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white"
                             >
                               <X size={10} />
                             </button>
                          </div>
                       ))}
                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="flex-shrink-0 w-16 h-24 rounded-lg bg-zinc-800 border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                       >
                          <Plus size={24} />
                       </button>
                    </div>

                    {/* Post Button */}
                    <div className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 p-6">
                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-5 bg-white text-black font-black uppercase italic tracking-widest rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 flex flex-col justify-center items-center overflow-hidden"
                      >
                        {loading ? (
                          <div className="flex flex-col items-center gap-2">
                             <div className="flex items-center gap-2">
                               <Activity className="animate-spin" size={20} />
                               <span>Posting {items.length} Stories...</span>
                             </div>
                             <div className="w-48 h-1 bg-black/10 rounded-full overflow-hidden">
                                <div className="h-full bg-black transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                             </div>
                          </div>
                        ) : (
                          `Post ${items.length} Story${items.length > 1 ? 's' : ''}`
                        )}
                      </button>
                    </div>
                 </div>
              </div>
           ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-zinc-900/50 transition-colors"
              >
                 <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 shadow-xl border border-zinc-700">
                    <Camera size={32} />
                 </div>
                 <div className="text-center">
                    <p className="font-black text-xl text-white tracking-tight uppercase italic">Capturing the Build</p>
                    <p className="text-zinc-500 font-medium mt-1">Tap to select from your roll</p>
                 </div>
              </div>
           )}
              
           <input 
             type="file" 
             ref={fileInputRef} 
             onChange={handleFileChange} 
             accept="image/*" 
             multiple
             className="hidden" 
           />
        </div>
      </motion.div>

      {/* Music Selector Drawer Sheet */}
      <AnimatePresence>
        {showMusicSelector && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center font-sans">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMusicSelector(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            {/* Sheet wrapper */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg z-10"
            >
              <MusicSelector
                selectedSong={selectedSong}
                onSelectSong={setSelectedSong}
                onClose={() => setShowMusicSelector(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
