import React, { useState, useEffect, useRef } from 'react';
// Force TS server refresh
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { Car, MediaType } from '../types';
import { Film, Upload, CheckCircle2, ChevronRight, Video, X, Image as ImageIcon, Camera, Plus, Heart, Music } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MusicSelector, SongInfo } from './MusicSelector';
import { processImageFile } from '../lib/imageUtils';

export function UploadView({ onComplete }: { onComplete: () => void }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedSong, setSelectedSong] = useState<SongInfo | null>(null);
  const [showMusicSelector, setShowMusicSelector] = useState(false);

  const [formData, setFormData] = useState({
    caption: '',
    carTagId: '',
    isModUpdate: false,
    isDuo: false,
  });

  useEffect(() => {
    if (!user) return;
    const fetchCars = async () => {
       const q = query(collection(db, 'garage'), where('ownerId', '==', user.uid));
       const snap = await getDocs(q);
       setCars(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Car[]);
    };
    fetchCars();
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, replace = false) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setMediaType('image');
      
      // Process HEIC images
      const processedFiles = await Promise.all(selectedFiles.map(f => processImageFile(f)));

      if (replace) {
        const limitedFiles = processedFiles.slice(0, 10);
        setFiles(limitedFiles);
        const urls = limitedFiles.map(file => URL.createObjectURL(file));
        setPreviews(urls);
      } else {
        const totalFiles = [...files, ...processedFiles].slice(0, 10);
        setFiles(totalFiles);
        const urls = processedFiles.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...urls]);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || files.length === 0) return;
    setLoading(true);

    try {
      const uploadPromises = files.map(async (f) => {
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${f.name}`);
        const snapshot = await uploadBytes(storageRef, f);
        return await getDownloadURL(snapshot.ref);
      });

      const mediaUrls = await Promise.all(uploadPromises);

      const postDoc = await addDoc(collection(db, 'posts'), {
        ...formData,
        mediaUrls,
        mediaType: 'image',
        authorId: user.uid,
        likesCount: 0,
        commentsCount: 0,
        songId: selectedSong ? JSON.stringify(selectedSong) : '',
        createdAt: Date.now()
      });

      if (formData.isModUpdate && formData.carTagId) {
        const selectedCar = cars.find(c => c.id === formData.carTagId);
        const nextBuildNumber = (selectedCar?.buildTimeline?.length || 0) + 1;
        
        const modEntry = {
          id: Math.random().toString(36).substring(7),
          title: `Build #${nextBuildNumber}`,
          description: formData.caption,
          date: Date.now(),
          type: 'modification',
          postId: postDoc.id,
          mediaUrl: mediaUrls[0] // Use first image for timeline
        };
        await updateDoc(doc(db, 'garage', formData.carTagId), {
          buildTimeline: arrayUnion(modEntry)
        });
      }

      onComplete();
    } catch (error: any) {
      if (error?.message?.includes('storage/unauthorized')) {
        alert('Permission Denied: To upload media, please go to your Firebase Console -> Storage -> Rules, and allow read/write access for authenticated users.');
      } else {
        handleFirestoreError(error, OperationType.CREATE, 'posts');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pl-[calc(1.5rem+env(safe-area-inset-left,0px))] pr-[calc(1.5rem+env(safe-area-inset-right,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] h-full flex flex-col space-y-8 bg-black overflow-y-auto max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-black italic tracking-tighter">SHARE BUILD</h1>
        <p className="text-zinc-500 text-sm font-medium">Show the world what's under the hood.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
        {/* Media Selection Area */}
        <div className="space-y-3">
          <div className="flex justify-between items-end px-1">
            <label className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Post Photos ({files.length}/10)</label>
            {files.length > 0 && (
               <button 
                type="button" 
                onClick={() => { setIsReplacing(true); fileInputRef.current?.click(); }}
                className="text-[10px] font-black text-white hover:text-zinc-300 transition-colors uppercase tracking-widest"
              >
                Change All
              </button>
            )}
          </div>
          
          <div 
            onClick={() => { if (previews.length === 0) { setIsReplacing(true); fileInputRef.current?.click(); } }}
            className={`${previews.length > 0 ? '' : 'aspect-[9/12] border-2 border-dashed border-zinc-800'} w-full bg-zinc-900 rounded-[32px] flex flex-col items-center justify-center p-0 text-center space-y-4 relative overflow-hidden`}
          >
             {previews.length > 0 ? (
               <div className="w-full space-y-2">
                 <div className="flex gap-2 overflow-x-auto pb-4 snap-x px-1">
                   {previews.map((url, idx) => (
                      <div key={idx} className="relative aspect-[9/12] h-[400px] flex-shrink-0 snap-center rounded-2xl overflow-hidden group">
                        <img src={url} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} />
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-full text-white hover:bg-black transition-colors"
                        >
                          <X size={16} />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-black text-white">
                          {idx + 1}/{previews.length}
                        </div>
                      </div>
                   ))}
                   {previews.length < 10 && (
                      <button 
                        type="button"
                        onClick={() => { setIsReplacing(false); fileInputRef.current?.click(); }}
                        className="aspect-[9/12] h-[400px] flex-shrink-0 snap-center rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/50 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
                      >
                        <Plus size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Add More</span>
                      </button>
                   )}
                 </div>
               </div>
             ) : (
               <div className="text-center group cursor-pointer">
                <Camera size={48} className="mx-auto mb-4 text-zinc-700 group-hover:scale-110 group-hover:text-zinc-500 transition-all" />
                <p className="font-bold text-sm">Upload Photos</p>
                <p className="text-xs text-zinc-500 mt-1">Select up to 10 from your camera roll</p>
              </div>
             )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handleFileChange(e, isReplacing)} 
            accept="image/jpeg, image/png, image/webp, image/gif" 
            multiple
            className="hidden" 
          />
        </div>

        {/* Caption & Settings */}
        <div className="space-y-6">
           <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Caption</label>
              <textarea
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white outline-none transition-colors h-24 resize-none"
                value={formData.caption}
                onChange={e => setFormData({ ...formData, caption: e.target.value })}
                placeholder="Write something about your build..."
                required
              />
           </div>

           <div className="space-y-4">
             <div className="space-y-1.5">
               <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Tag a Car</label>
               {cars.length > 0 ? (
                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {cars.map(car => (
                       <button
                         key={car.id}
                         type="button"
                         onClick={() => {
                           const newId = formData.carTagId === car.id ? '' : car.id;
                           setFormData({
                             ...formData, 
                             carTagId: newId,
                             isModUpdate: newId ? formData.isModUpdate : false
                           });
                         }}
                         className={`px-4 py-3 rounded-2xl border text-xs font-bold transition-all flex-shrink-0 min-w-[140px] ${formData.carTagId === car.id ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}
                       >
                         {car.make} {car.model}
                       </button>
                    ))}
                 </div>
               ) : (
                 <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest px-1 italic">No cars in garage</p>
               )}
             </div>

             {/* Background Music Option */}
             <div className="space-y-1.5 pt-1">
               <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase font-sans">Background Music</label>
               {selectedSong ? (
                 <div className="flex items-center justify-between p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl select-none font-sans">
                   <div className="flex items-center gap-3 min-w-0">
                     <div className="w-10 h-10 rounded-lg overflow-hidden border border-red-500/30 bg-black flex-shrink-0">
                       {selectedSong.artwork ? (
                         <img src={selectedSong.artwork} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                           <Music size={16} className="text-zinc-500" />
                         </div>
                       )}
                     </div>
                     <div className="min-w-0 flex-1">
                       <p className="text-xs font-black text-white truncate max-w-[170px]">{selectedSong.title}</p>
                       <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide truncate max-w-[170px]">{selectedSong.artist}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2 flex-shrink-0">
                     <button
                       type="button"
                       onClick={() => setShowMusicSelector(true)}
                       className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#ccc] transition-colors"
                     >
                       Change
                     </button>
                     <button
                       type="button"
                       onClick={() => setSelectedSong(null)}
                       className="px-3 py-1.5 bg-zinc-855 hover:bg-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-500 transition-colors"
                     >
                       Remove
                     </button>
                   </div>
                 </div>
               ) : (
                 <button
                   type="button"
                   onClick={() => setShowMusicSelector(true)}
                   className="w-full p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-750 rounded-2xl flex items-center justify-between transition-all group select-none font-sans"
                 >
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-red-500 group-hover:scale-105 transition-all">
                       <Music size={16} />
                     </div>
                     <div className="text-left">
                       <span className="text-xs font-black uppercase tracking-widest text-zinc-200">Add Music</span>
                       <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-650 mt-0.5">Add a background soundtrack to your build</p>
                     </div>
                   </div>
                   <ChevronRight size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                 </button>
               )}
             </div>

             <div className="space-y-3 pt-2">
               <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Post Options</label>
               
               <div className="grid grid-cols-1 gap-2">
                 {/* Build Log Toggle - requires car tag */}
                 <button
                   type="button"
                   onClick={() => {
                     if (formData.carTagId) {
                       setFormData({...formData, isModUpdate: !formData.isModUpdate});
                     }
                   }}
                   className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-[0.98] ${formData.isModUpdate ? 'bg-white border-white text-black' : 'bg-zinc-900 border-zinc-800 text-zinc-400'} ${!formData.carTagId && 'opacity-50 grayscale'}`}
                 >
                   <div className="flex flex-col items-start gap-1">
                     <span className={`text-xs font-black uppercase tracking-widest ${formData.isModUpdate ? 'text-black' : 'text-zinc-200'}`}>Add to Build Log</span>
                     <span className={`text-[8px] font-bold uppercase tracking-widest ${formData.isModUpdate ? 'text-black/60' : 'text-zinc-600'}`}>
                       {!formData.carTagId ? 'Select a car to enable build log' : 'Mark as a modification update'}
                     </span>
                   </div>
                   <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${formData.isModUpdate ? 'bg-black border-black text-white' : 'border-zinc-700'}`}>
                     {formData.isModUpdate && <CheckCircle2 size={16} />}
                   </div>
                 </button>

                 {/* Duo Page Toggle - requires partner */}
                 <button
                   type="button"
                   disabled={!profile?.partnerId}
                   onClick={() => setFormData({...formData, isDuo: !formData.isDuo})}
                   className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${formData.isDuo ? 'bg-red-500 border-red-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'} ${!profile?.partnerId && 'opacity-50 grayscale'}`}
                 >
                   <div className="flex flex-col items-start gap-1">
                     <span className={`text-xs font-black uppercase tracking-widest ${formData.isDuo ? 'text-white' : 'text-zinc-200'}`}>Add to Duo Page</span>
                     <span className={`text-[8px] font-bold uppercase tracking-widest ${formData.isDuo ? 'text-white/80' : 'text-zinc-600'}`}>
                       {!profile?.partnerId ? 'Partner link required (Link in Profile Settings)' : 'Share this update with your partner'}
                     </span>
                   </div>
                   <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${formData.isDuo ? 'bg-white border-white text-red-500' : 'border-zinc-700'}`}>
                     {formData.isDuo && <Heart size={14} fill="currentColor" />}
                   </div>
                 </button>
               </div>
             </div>
           </div>
        </div>

        <div className="pt-4 pb-24">
          <button
            type="submit"
            disabled={loading || files.length === 0 || !formData.caption}
            className="w-full bg-white text-black h-16 rounded-full font-black tracking-tight flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'PUBLISHING...' : 'POST MEDIA'}
            <ChevronRight size={20} />
          </button>
        </div>
      </form>

       {/* Music Selector Bottom Sheet Drawer */}
       <AnimatePresence>
         {showMusicSelector && (
           <div className="fixed inset-0 z-[120] flex items-end justify-center font-sans">
             {/* Backdrop */}
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowMusicSelector(false)}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
    </div>
  );
}
