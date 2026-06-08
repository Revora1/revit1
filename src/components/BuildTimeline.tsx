import React, { useState, useRef } from 'react';
import { BuildLogEntry, Car } from '../types';
import { 
  Calendar, Plus, ExternalLink, Wrench, Fuel, Timer, Hammer, 
  Trash2, Camera, X, Trophy, DollarSign, ArrowUpRight, ShoppingBag, Settings2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface BuildTimelineProps {
  car: Car;
  isOwner: boolean;
}

const TYPE_CONFIGS = {
  modification: {
    icon: Wrench,
    label: 'Modification',
    color: 'text-violet-400',
    bg: 'bg-violet-950/30',
    border: 'border-violet-500/20',
  },
  repair: {
    icon: Hammer,
    label: 'Repair',
    color: 'text-amber-400',
    bg: 'bg-amber-950/30',
    border: 'border-amber-500/20',
  },
  maintenance: {
    icon: Fuel,
    label: 'Maintenance',
    color: 'text-sky-400',
    bg: 'bg-sky-950/30',
    border: 'border-sky-500/20',
  },
  dyno: {
    icon: Timer,
    label: 'Dyno Session',
    color: 'text-rose-400',
    bg: 'bg-rose-950/30',
    border: 'border-rose-500/20',
  },
  track_day: {
    icon: ActivityIcon,
    label: 'Track Event',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/30',
    border: 'border-emerald-500/20',
  },
  performance_verification: {
    icon: Trophy,
    label: 'Performance Verify',
    color: 'text-amber-300',
    bg: 'bg-yellow-950/30',
    border: 'border-yellow-500/20',
  }
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
    date: Date.now(),
    cost: undefined,
    laborCost: undefined,
    supplier: '',
    installedBy: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const timeline = car.buildTimeline || [];
  const sortedTimeline = [...timeline].sort((a, b) => b.date - a.date);

  // Stats Calculations
  const totalPartsCost = timeline.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  const totalLaborCost = timeline.reduce((sum, item) => sum + (Number(item.laborCost) || 0), 0);
  const totalInvestment = totalPartsCost + totalLaborCost;
  const modEntriesCount = timeline.filter(item => item.type === 'modification').length;

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
        mediaUrl,
        cost: newEntry.cost ? Number(newEntry.cost) : undefined,
        laborCost: newEntry.laborCost ? Number(newEntry.laborCost) : undefined,
        supplier: newEntry.supplier?.trim() || undefined,
        installedBy: newEntry.installedBy?.trim() || undefined
      };

      await updateDoc(doc(db, 'garage', car.id), {
        buildTimeline: arrayUnion(entry)
      });
      setShowAdd(false);
      setNewEntry({ 
        type: 'modification', 
        date: Date.now(),
        cost: undefined,
        laborCost: undefined,
        supplier: '',
        installedBy: ''
      });
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `garage/${car.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (entry: BuildLogEntry) => {
    if (!confirm('Remove this update from Build Ledger?')) return;
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
      {/* Title & Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Settings2 size={20} className="text-zinc-400" />
          <h3 className="font-black text-lg uppercase tracking-tight italic">Build Ledger</h3>
        </div>
        {isOwner && (
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest italic active:scale-95 transition-transform"
          >
            <Plus size={14} /> Add Ledger Entry
          </button>
        )}
      </div>

      {/* Stats Cards Section */}
      {timeline.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Total Invested</span>
            <div className="flex items-baseline gap-0.5 mt-1">
              <span className="text-xs font-bold text-emerald-400 font-mono">$</span>
              <span className="text-base font-black text-emerald-400 font-mono leading-none tracking-tight">
                {totalInvestment.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="bg-zinc-900 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Parts & Sourcing</span>
            <div className="flex items-baseline gap-0.5 mt-1">
              <span className="text-xs font-bold text-zinc-300 font-mono">$</span>
              <span className="text-base font-black text-zinc-300 font-mono leading-none tracking-tight">
                {totalPartsCost.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="bg-zinc-900 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Modifications</span>
            <span className="text-base font-black text-white leading-none tracking-tight mt-1">
              {modEntriesCount}
            </span>
          </div>
        </div>
      )}

      {/* Add New Ledger Entry Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-zinc-950 p-5 rounded-3xl border border-white/10 space-y-4"
          >
            <div className="space-y-4">
              {/* Image Upload Option */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-full aspect-video bg-zinc-900/50 border border-dashed border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-white/20 transition-colors flex items-center justify-center group"
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} className="w-full h-full object-cover" alt="Log Preview" />
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
                    <Camera size={22} className="text-zinc-500 mx-auto mb-1.5" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Add Build Photo</p>
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

              <div className="space-y-3">
                <input 
                  placeholder="Upgrade or part name (e.g., Cat-back Exhaust)"
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-white/10"
                  value={newEntry.title || ''}
                  onChange={e => setNewEntry({...newEntry, title: e.target.value})}
                />
                
                <textarea 
                  placeholder="What was done? Tell the story or build notes..."
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-white/10 min-h-[80px]"
                  value={newEntry.description || ''}
                  onChange={e => setNewEntry({...newEntry, description: e.target.value})}
                />

                {/* LEDGER DETAILS: Sourcing and Costs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] uppercase font-black tracking-widest text-zinc-500 mb-1">Part Cost ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-mono">$</span>
                      <input 
                        type="number"
                        placeholder="0.00"
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/10"
                        value={newEntry.cost ?? ''}
                        onChange={e => setNewEntry({...newEntry, cost: e.target.value ? Number(e.target.value) : undefined})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase font-black tracking-widest text-zinc-500 mb-1">Labor / Svc ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-mono">$</span>
                      <input 
                        type="number"
                        placeholder="0.00"
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/10"
                        value={newEntry.laborCost ?? ''}
                        onChange={e => setNewEntry({...newEntry, laborCost: e.target.value ? Number(e.target.value) : undefined})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] uppercase font-black tracking-widest text-zinc-500 mb-1">Brand / Supplier</label>
                    <input 
                      type="text"
                      placeholder="e.g. Garrett, eBay"
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/10"
                      value={newEntry.supplier || ''}
                      onChange={e => setNewEntry({...newEntry, supplier: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase font-black tracking-widest text-zinc-500 mb-1">Installer</label>
                    <input 
                      type="text"
                      placeholder="e.g. DIY, Shop Name"
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/10"
                      value={newEntry.installedBy || ''}
                      onChange={e => setNewEntry({...newEntry, installedBy: e.target.value})}
                    />
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-1">
                  <label className="block text-[8px] uppercase font-black tracking-widest text-zinc-500">Log Category</label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {Object.keys(TYPE_CONFIGS).map(typeKey => {
                      const config = TYPE_CONFIGS[typeKey as keyof typeof TYPE_CONFIGS];
                      const Icon = config.icon;
                      const isSelected = newEntry.type === typeKey;
                      return (
                        <button
                          key={typeKey}
                          onClick={() => setNewEntry({...newEntry, type: typeKey as any})}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                            isSelected 
                              ? 'bg-white text-black border-white' 
                              : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <Icon size={12} />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button 
                onClick={handleAdd}
                disabled={loading}
                className="flex-1 bg-white hover:bg-zinc-200 text-black py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                {loading ? 'STORING ENTRY...' : 'COMMIT TO LEDGER'}
              </button>
              <button 
                onClick={() => setShowAdd(false)}
                className="px-4 bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                CANCEL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline Thread */}
      <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
        {timeline.length === 0 ? (
          <div className="py-8 text-center bg-zinc-900/10 rounded-2xl border border-dashed border-zinc-800">
            <p className="text-zinc-500 text-xs italic">No ledger entries registered yet.</p>
          </div>
        ) : (
          sortedTimeline.map((item, index) => {
            const config = TYPE_CONFIGS[item.type as keyof typeof TYPE_CONFIGS] || TYPE_CONFIGS.modification;
            const Icon = config.icon;
            const itemTotal = (Number(item.cost) || 0) + (Number(item.laborCost) || 0);

            return (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative group mr-0.5"
              >
                {/* Node marker */}
                <div className={`absolute -left-[23px] top-4 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 z-10 transition-colors ${
                  config.color.replace('text-', 'bg-')
                }`} />
                
                <div className="bg-zinc-900/30 border border-white/5 hover:border-white/10 p-4 rounded-2xl group-hover:bg-zinc-900/50 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${config.bg} ${config.color}`}>
                        <Icon size={14} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm leading-tight tracking-tight">{item.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[8px] font-black uppercase tracking-widest ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-zinc-600 font-bold">•</span>
                          <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {itemTotal > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-right select-none">
                          <span className="text-[10px] font-black font-mono text-emerald-400">
                            +${itemTotal.toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      {isOwner && (
                        <button 
                          onClick={() => handleRemove(item)}
                          className="p-1 text-zinc-650 hover:text-red-500 transition-colors"
                          title="Remove Entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-zinc-400 text-xs leading-relaxed">{item.description}</p>
                  )}

                  {/* Sourcing and Labor tags */}
                  {(item.supplier || item.installedBy || item.cost || item.laborCost) && (
                    <div className="mt-3.5 pt-2 border-t border-white/5 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-wider text-zinc-500 select-none">
                      {item.supplier && (
                        <span className="bg-zinc-950/40 px-2 py-1 rounded-md border border-white/5">
                          <span className="text-zinc-500 italic lowercase">brand/supplier:</span> <span className="text-zinc-300">{item.supplier}</span>
                        </span>
                      )}
                      {item.installedBy && (
                        <span className="bg-zinc-950/40 px-2 py-1 rounded-md border border-white/5">
                          <span className="text-zinc-500 italic lowercase">installer:</span> <span className="text-zinc-300">{item.installedBy}</span>
                        </span>
                      )}
                      {item.cost !== undefined && item.cost > 0 && (
                        <span className="bg-zinc-950/40 px-2 py-1 rounded-md border border-white/5 font-mono">
                          <span className="text-zinc-500 italic lowercase tracking-normal">part cost:</span> <span className="text-zinc-400">${item.cost.toLocaleString()}</span>
                        </span>
                      )}
                      {item.laborCost !== undefined && item.laborCost > 0 && (
                        <span className="bg-zinc-950/40 px-2 py-1 rounded-md border border-white/5 font-mono">
                          <span className="text-zinc-500 italic lowercase tracking-normal">labor cost:</span> <span className="text-zinc-400">${item.laborCost.toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Photo attachment if available */}
                  {item.mediaUrl && (
                    <div className="mt-3.5 rounded-xl overflow-hidden border border-white/5 shadow-inner">
                      <img src={item.mediaUrl} className="w-full aspect-video object-cover" alt="Build photo" />
                    </div>
                  )}

                  {/* Original connected feed post link if exists */}
                  {item.postId && (
                    <button 
                      onClick={() => window.dispatchEvent(new CustomEvent('navigate-post', { detail: { postId: item.postId } }))}
                      className="mt-3.5 flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-[9px] uppercase font-black tracking-widest italic"
                    >
                      <ExternalLink size={11} /> View Build Post
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
