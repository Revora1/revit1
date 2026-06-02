import React, { useState, useRef } from 'react';
import { BuildLogEntry, Car } from '../types';
import { Calendar, Plus, ExternalLink, Wrench, Fuel, Timer, Hammer, Trash2, Camera, X, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface BuildTimelineProps {
  car: Car;
  isOwner: boolean;
}

const TYPE_ICONS = {
  modification: Wrench,
  repair: Hammer,
  maintenance: Fuel,
  dyno: Timer,
  track_day: ActivityIcon,
  performance_verification: Trophy
};

function ActivityIcon(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}

export function BuildTimeline({ car, isOwner }: BuildTimelineProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<BuildLogEntry>>({
    type: 'modification',
    date: Date.now()
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const timeline = car.buildTimeline || [];
  const sortedTimeline = [...timeline].sort((a, b) => b.date - a.date);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAdd = async () => {
    if (!newEntry.title || !newEntry.description) return;
    setLoading(true);
    try {
      let mediaUrl = undefined;
      if (selectedFile) {
        const storageRef = ref(storage, `build_logs/${car.id}/${Date.now()}_${selectedFile.name}`);
        const snapshot = await uploadBytes(storageRef, selectedFile);
        mediaUrl = await getDownloadURL(snapshot.ref);
      }

      const entry: BuildLogEntry = {
        id: Math.random().toString(36).substring(7),
        title: newEntry.title,
        description: newEntry.description,
        type: newEntry.type as any,
        date: newEntry.date || Date.now(),
        postId: newEntry.postId,
        mediaUrl
      };

      await updateDoc(doc(db, 'garage', car.id), {
        buildTimeline: arrayUnion(entry)
      });
      setShowAdd(false);
      setNewEntry({ type: 'modification', date: Date.now() });
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `garage/${car.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (entry: BuildLogEntry) => {
    if (!confirm('Remove this update?')) return;
    try {
      await updateDoc(doc(db, 'garage', car.id), {
        buildTimeline: arrayRemove(entry)
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `garage/${car.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Calendar size={20} />
          <h3 className="font-bold text-lg uppercase tracking-tight italic">Build Log</h3>
        </div>
        {isOwner && (
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest italic active:scale-95 transition-transform"
          >
            <Plus size={14} /> Add Update
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-zinc-800/50 p-4 rounded-2xl border border-white/10 space-y-4"
          >
                <div className="space-y-3">
                  {/* Image Preview / Upload Area */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-full aspect-video bg-zinc-950/50 border border-dashed border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-white/20 transition-colors flex items-center justify-center group"
                  >
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera size={24} className="text-white" />
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <div className="text-center">
                        <Camera size={24} className="text-zinc-600 mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Add Picture</p>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    accept="image/*"
                    onChange={handleFileSelect}
                  />

                  <input 
                    placeholder="Update Title (e.g., Cat-back Exhaust)"
                className="w-full bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/20"
                value={newEntry.title || ''}
                onChange={e => setNewEntry({...newEntry, title: e.target.value})}
              />
              <textarea 
                placeholder="What was done? Tell the story..."
                className="w-full bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/20 min-h-[100px]"
                value={newEntry.description || ''}
                onChange={e => setNewEntry({...newEntry, description: e.target.value})}
              />
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {(['modification', 'repair', 'maintenance', 'dyno', 'track_day'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setNewEntry({...newEntry, type})}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-all border ${
                      newEntry.type === type ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleAdd}
                disabled={loading}
                className="flex-1 bg-white text-black py-2.5 rounded-xl font-bold text-sm"
              >
                {loading ? 'SAVING...' : 'SAVE LOG ENTRY'}
              </button>
              <button 
                onClick={() => setShowAdd(false)}
                className="px-4 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-xl text-sm"
              >
                CANCEL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
        {timeline.length === 0 ? (
          <div className="py-8 text-center bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
            <p className="text-zinc-500 text-sm italic">The journey hasn't started yet.</p>
          </div>
        ) : (
          sortedTimeline.map((item, index) => {
            const Icon = TYPE_ICONS[item.type as keyof typeof TYPE_ICONS] || Wrench;
            return (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-700 group-hover:bg-white transition-colors border-2 border-black z-10" />
                
                <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl group-hover:bg-zinc-900/60 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg text-white">
                        <Icon size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm leading-tight">{item.title}</h4>
                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-0.5">
                          {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    {isOwner && (
                      <button 
                        onClick={() => handleRemove(item)}
                        className="p-1 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed">{item.description}</p>
                  
                  {item.mediaUrl && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                      <img src={item.mediaUrl} className="w-full aspect-video object-cover" />
                    </div>
                  )}

                  {item.postId && (
                    <button 
                      onClick={() => window.dispatchEvent(new CustomEvent('navigate-post', { detail: { postId: item.postId } }))}
                      className="mt-4 flex items-center gap-2 text-white/50 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-wider"
                    >
                      <ExternalLink size={12} /> View Build Post
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
