import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Plus, Search, MapPin, Tag, MessageSquare, Car, Info, X, Camera } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, getDoc, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { processImageFile } from '../lib/imageUtils';
import { MarketplaceItem, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Radius of the earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

interface MarketplaceViewProps {
  onBack: () => void;
}

export function MarketplaceView({ onBack }: MarketplaceViewProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<(MarketplaceItem & { sellerProfile?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem & { sellerProfile?: UserProfile } | null>(null);

  const categories = ['All', 'Engine', 'Suspension', 'Wheels', 'Interior', 'Exterior', 'Electronics', 'Other'];

  useEffect(() => {
    const q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snap) => {
      try {
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        
        const fetchedItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketplaceItem)).filter(item => {
          if (item.status === 'sold' && item.soldAt && (now - item.soldAt > SEVEN_DAYS_MS)) {
            // Opportunistic deletion if current user is owner
            if (user && item.sellerId === user.uid) {
              deleteDoc(doc(db, 'marketplace', item.id)).catch(e => console.error('Auto-delete failed:', e));
            }
            return false;
          }
          return true;
        });
        
        // Fetch seller profiles
        const uniqueSellerIds = [...new Set(fetchedItems.map(i => i.sellerId))];
        const profileMap: Record<string, UserProfile> = {};
        
        await Promise.all(
          uniqueSellerIds.map(async (id) => {
            const profileSnap = await getDoc(doc(db, 'users', id));
            if (profileSnap.exists()) {
              profileMap[id] = profileSnap.data() as UserProfile;
            }
          })
        );

        const joined = fetchedItems.map(item => ({
          ...item,
          sellerProfile: profileMap[item.sellerId]
        }));

        setItems(joined);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'marketplace');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleRadiusChange = async (radius: number | null) => {
    setMaxDistance(radius);
    if (radius !== null && !userLocation) {
      setIsLocating(true);
      try {
        const fetchIpLocation = async () => {
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          if (data.latitude && data.longitude) {
            setUserLocation({ lat: data.latitude, lng: data.longitude });
          }
          setIsLocating(false);
        };
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              setIsLocating(false);
            },
            fetchIpLocation
          );
        } else {
          await fetchIpLocation();
        }
      } catch (e) {
        console.error(e);
        setIsLocating(false);
      }
    }
  };

  const filteredItems = items.filter(item => {
    if (activeCategory !== 'All' && item.category !== activeCategory) return false;
    
    if (maxDistance !== null && userLocation) {
      if (!item.lat || !item.lng) return false; // Hide items without coordinates
      const dist = calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng);
      if (dist > maxDistance) return false;
    }
    
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.make?.toLowerCase().includes(q) ||
        item.model?.toLowerCase().includes(q) ||
        item.wheelSize?.toLowerCase().includes(q) ||
        item.tireSize?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-black text-white relative">
      <div className="flex-none p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center justify-between border-b border-zinc-900 bg-black/95 backdrop-blur z-10 sticky top-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-zinc-900 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-black italic uppercase tracking-tighter text-xl leading-none">Marketplace</h1>
          <span className="text-[9px] font-black tracking-widest text-yellow-500 uppercase">Buy & Sell Parts</span>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="p-2 -mr-2 rounded-full hover:bg-zinc-900 text-yellow-500 transition-colors">
          <Plus size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-[calc(52px+env(safe-area-inset-bottom,0px))]">
        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Search parts, wheels, turbos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-sm focus:border-white outline-none transition-colors"
            />
          </div>
        </div>

        {/* Categories & Filter */}
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors border ${
                  activeCategory === cat 
                    ? 'bg-white text-black border-white' 
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Radius</span>
              <select 
                value={maxDistance === null ? 'any' : maxDistance}
                onChange={e => handleRadiusChange(e.target.value === 'any' ? null : Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs outline-none focus:border-zinc-700"
              >
                <option value="any">Any Distance</option>
                <option value="10">10 Miles</option>
                <option value="25">25 Miles</option>
                <option value="50">50 Miles</option>
                <option value="100">100 Miles</option>
                <option value="250">250 Miles</option>
              </select>
            </div>
            {isLocating && <span className="text-[10px] font-black tracking-widest text-yellow-500 uppercase animate-pulse">Locating...</span>}
            {maxDistance !== null && !isLocating && userLocation && (
              <span className="text-[10px] font-bold text-green-500 flex items-center gap-1"><MapPin size={10} /> Filter Active</span>
            )}
          </div>
        </div>

        {/* Items Grid */}
        <div className="px-4 pb-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedItem(item)}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer hover:border-white/20 transition-all flex flex-col"
                >
                  <div className="aspect-square bg-zinc-950 relative">
                    {item.mediaUrls.length > 0 ? (
                      <img src={item.mediaUrls[0]} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                        <Tag size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                      </div>
                    )}
                    {item.status === 'sold' && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                        <span className="bg-red-500 text-white px-3 py-1 rounded text-xs font-black uppercase tracking-widest rotate-[-15deg]">Sold</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">{item.currency}{item.price.toLocaleString()}</span>
                    <h3 className="text-xs font-bold leading-tight line-clamp-2">{item.title}</h3>
                    <div className="mt-auto pt-2 flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-zinc-500 text-[9px] font-medium uppercase tracking-wider">
                        <MapPin size={10} />
                        <span className="truncate">{item.location}</span>
                      </div>
                      {userLocation && item.lat && item.lng && (
                        <span className="text-[9px] font-black tracking-widest text-zinc-600 uppercase">
                          {Math.round(calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng))} miles away
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-zinc-900/50 rounded-3xl border border-zinc-800">
              <Tag size={32} className="text-zinc-600" />
              <div>
                <p className="text-sm font-black italic uppercase">No items found</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Try adjusting your search</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <ItemDetailModal 
            item={selectedItem} 
            onClose={() => setSelectedItem(null)} 
            currentUserId={user?.uid || ''}
            userLocation={userLocation}
          />
        )}
        {showCreateModal && (
          <CreateListingModal 
            onClose={() => setShowCreateModal(false)}
            sellerId={user?.uid || ''}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ItemDetailModal({ item, onClose, currentUserId, userLocation }: { item: MarketplaceItem & { sellerProfile?: UserProfile }, onClose: () => void, currentUserId: string, userLocation: {lat: number, lng: number} | null }) {
  const isOwner = currentUserId === item.sellerId;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingSold, setIsMarkingSold] = useState(false);

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmSold, setShowConfirmSold] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'marketplace', item.id));
      onClose();
    } catch (e) {
      console.error('Error deleting listing', e);
      setIsDeleting(false);
    }
  };

  const handleMarkSold = async () => {
    setIsMarkingSold(true);
    try {
      await updateDoc(doc(db, 'marketplace', item.id), { 
        status: 'sold',
        soldAt: Date.now()
      });
      setIsMarkingSold(false);
      setShowConfirmSold(false);
    } catch (e) {
      console.error('Error marking as sold', e);
      setIsMarkingSold(false);
    }
  };

  const handleMessageSeller = () => {
    if (!item.sellerProfile) return;
    const chatId1 = `${currentUserId}_${item.sellerId}`;
    const chatId2 = `${item.sellerId}_${currentUserId}`;
    
    // Attempt to navigate via window event (which is caught in App.tsx)
    // We send a generic chat ID format, the actual resolution happens in Inbox/ChatView
    window.dispatchEvent(new CustomEvent('navigate-chat', { 
      detail: { 
        chatId: chatId1, 
        otherUser: { id: item.sellerId, ...item.sellerProfile } 
      } 
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-[60] bg-black flex flex-col "
    >
      <div className="flex-none p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center justify-between border-b border-zinc-900 bg-black">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-zinc-900 transition-colors">
          <X size={24} />
        </button>
        <span className="font-black uppercase tracking-widest text-xs">Part Detail</span>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto pb-32 min-h-0">
        {/* Media Gallery */}
        <div className="w-full aspect-square bg-zinc-950 overflow-x-auto snap-x snap-mandatory flex scrollbar-hide">
          {item.mediaUrls.length > 0 ? (
            item.mediaUrls.map((url, i) => (
              <img key={i} src={url} alt="" className="w-full h-full object-cover flex-none snap-center" />
            ))
          ) : (
             <div className="w-full h-full flex items-center justify-center text-zinc-600">
               <Tag size={48} />
             </div>
          )}
        </div>

        <div className="p-5 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-xl font-bold leading-tight">{item.title}</h2>
              <span className="text-xl font-black text-yellow-500 whitespace-nowrap">{item.currency}{item.price.toLocaleString()}</span>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {item.condition}
              </span>
              <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {item.category}
              </span>
            </div>
          </div>

          <div className="h-px w-full bg-zinc-900" />

          {/* Seller */}
          <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-profile', { detail: { userId: item.sellerId } }))}
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                {item.sellerProfile?.profilePic ? (
                  <img src={item.sellerProfile.profilePic} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold uppercase">
                    {item.sellerProfile?.username?.[0] || '?'}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white">@{item.sellerProfile?.username || 'Unknown'}</p>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                    <MapPin size={10} />
                    <span>{item.location}</span>
                  </div>
                  {userLocation && item.lat && item.lng && (
                    <span className="text-zinc-400 text-[9px] font-black uppercase tracking-widest ml-[14px]">
                      {Math.round(calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng))} miles away
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fitment */}
          {(item.make || item.model || item.wheelSize || item.tireSize) && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1"><Car size={12}/> Specifications</span>
              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-wrap gap-4 text-sm font-medium">
                {item.make && <div><span className="text-zinc-500 mr-2">Make:</span>{item.make}</div>}
                {item.model && <div><span className="text-zinc-500 mr-2">Model:</span>{item.model}</div>}
                {item.wheelSize && <div><span className="text-zinc-500 mr-2">Wheel Size:</span>{item.wheelSize}</div>}
                {item.tireSize && <div><span className="text-zinc-500 mr-2">Tire Size:</span>{item.tireSize}</div>}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1"><Info size={12}/> Description</span>
             <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
               {item.description}
             </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex-none p-4 border-t border-zinc-900 bg-black pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        {isOwner ? (
          <div className="flex flex-col gap-2">
            {showConfirmDelete ? (
              <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <span className="text-xs text-red-500 font-bold ml-1">Delete listing permanently?</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowConfirmDelete(false)} className="px-4 py-2 text-xs font-bold text-zinc-400 bg-black rounded-lg transition-colors hover:text-white">Cancel</button>
                  <button onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-lg transition-colors hover:bg-red-500 disabled:opacity-50">{isDeleting ? '...' : 'Delete'}</button>
                </div>
              </div>
            ) : showConfirmSold ? (
              <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                <span className="text-xs text-yellow-500 font-bold ml-1">Mark item as sold?</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowConfirmSold(false)} className="px-4 py-2 text-xs font-bold text-zinc-400 bg-black rounded-lg transition-colors hover:text-white">Cancel</button>
                  <button onClick={handleMarkSold} disabled={isMarkingSold} className="px-4 py-2 text-xs font-bold text-black bg-yellow-500 rounded-lg transition-colors hover:bg-yellow-400 disabled:opacity-50">{isMarkingSold ? '...' : 'Confirm'}</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowConfirmDelete(true)}
                  className="flex-1 py-3 text-sm bg-transparent border border-zinc-800 hover:border-red-500/30 text-red-500 font-bold rounded-xl transition-colors"
                >
                  Delete Listing
                </button>
                {item.status !== 'sold' && (
                  <button 
                    onClick={() => setShowConfirmSold(true)}
                    className="flex-1 py-3 text-sm bg-zinc-900 text-white hover:bg-zinc-800 font-bold rounded-xl transition-colors border border-zinc-800"
                  >
                    Mark as Sold
                  </button>
                )}
                {item.status === 'sold' && (
                  <button disabled className="flex-1 py-3 text-sm bg-zinc-900/50 border border-zinc-900 text-zinc-600 font-bold rounded-xl cursor-not-allowed">
                    Sold
                  </button>
                )}
              </div>
            )}
          </div>
        ) : item.status === 'sold' ? (
          <button disabled className="w-full py-4 bg-zinc-900 text-zinc-500 font-black uppercase tracking-widest rounded-2xl cursor-not-allowed">
            Item Sold
          </button>
        ) : (
          <button 
            onClick={handleMessageSeller}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            <MessageSquare size={18} />
            Message Seller
          </button>
        )}
      </div>
    </motion.div>
  );
}

function CreateListingModal({ onClose, sellerId }: { onClose: () => void, sellerId: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('$');
  const [category, setCategory] = useState<MarketplaceItem['category']>('Engine');
  const [condition, setCondition] = useState<MarketplaceItem['condition']>('Used - Good');
  const [location, setLocation] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [wheelSize, setWheelSize] = useState('');
  const [tireSize, setTireSize] = useState('');
  
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      // Process images (compress, convert HEIC, etc.)
      const processedFiles = await Promise.all(selectedFiles.map(f => processImageFile(f)));
      
      const newFiles = [...files, ...processedFiles].slice(0, 4); // Max 4 images
      setFiles(newFiles);
      
      const newPreviews = newFiles.map(f => URL.createObjectURL(f));
      setPreviews(newPreviews);
    }
  };

  const removeImage = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (!title || !description || !price || !location) return;
    setIsSubmitting(true);
    try {
      let itemLat: number | undefined;
      let itemLng: number | undefined;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
        const data = await res.json();
        if (data && data.length > 0) {
          itemLat = parseFloat(data[0].lat);
          itemLng = parseFloat(data[0].lon);
        }
      } catch (e) {
        console.error('Failed to geocode location', e);
      }

      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        const storageRef = ref(storage, `marketplace/${sellerId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        uploadedUrls.push(url);
      }

      const newItem: Omit<MarketplaceItem, 'id'> = {
        sellerId,
        title,
        description,
        price: Number(price),
        currency,
        category,
        condition,
        location,
        lat: itemLat,
        lng: itemLng,
        mediaUrls: uploadedUrls,
        status: 'available',
        createdAt: Date.now()
      };
      if (make) newItem.make = make;
      if (model) newItem.model = model;
      if (category === 'Wheels') {
        if (wheelSize) newItem.wheelSize = wheelSize;
        if (tireSize) newItem.tireSize = tireSize;
      }

      await addDoc(collection(db, 'marketplace'), newItem);
      onClose();
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-[60] bg-black flex flex-col "
    >
      <div className="flex-none p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center justify-between border-b border-zinc-900 bg-black">
        <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">Cancel</button>
        <span className="font-black uppercase tracking-widest text-xs">New Listing</span>
        <button 
          onClick={handleSubmit} 
          disabled={!title || !description || !price || !location || isSubmitting}
          className="text-yellow-500 hover:text-yellow-400 font-bold text-sm disabled:opacity-50"
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-32 min-h-0">
         {/* Image Upload */}
         <div className="space-y-2">
           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Photos (Max 4)</label>
           <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
             {previews.map((src, idx) => (
               <div key={idx} className="relative w-24 h-24 flex-none rounded-xl overflow-hidden border border-zinc-800">
                 <img src={src} alt="Preview" className="w-full h-full object-cover" />
                 <button 
                   onClick={() => removeImage(idx)}
                   className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white backdrop-blur-sm"
                 >
                   <X size={12} />
                 </button>
               </div>
             ))}
             {previews.length < 4 && (
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="w-24 h-24 flex-none rounded-xl border border-zinc-800 bg-zinc-900 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-white transition-colors"
               >
                 <Camera size={20} />
                 <span className="text-[10px] font-bold uppercase">Add Photo</span>
               </button>
             )}
             <input 
               type="file" 
               accept="image/*" 
               multiple 
               className="hidden" 
               ref={fileInputRef} 
               onChange={handleFileChange} 
             />
           </div>
         </div>

         {/* Form Fields */}
         <div className="space-y-1">
           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Part Name</label>
           <input 
             type="text" 
             value={title} onChange={e => setTitle(e.target.value)}
             placeholder="e.g. TE37 Wheels 18x9.5" 
             className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-white outline-none"
           />
         </div>

         <div className="grid grid-cols-2 gap-3">
           <div className="space-y-1">
             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Price</label>
             <div className="flex">
               <select
                 value={currency}
                 onChange={e => setCurrency(e.target.value)}
                 className="bg-zinc-900 border border-zinc-800 border-r-0 rounded-l-xl pl-4 pr-2 py-3 text-sm focus:border-white outline-none appearance-none font-black text-yellow-500"
               >
                 <option value="$">$</option>
                 <option value="£">£</option>
                 <option value="€">€</option>
               </select>
               <input 
                 type="number" 
                 value={price} onChange={e => setPrice(e.target.value)}
                 placeholder="0" 
                 className="w-full bg-zinc-900 border border-zinc-800 rounded-r-xl px-3 py-3 text-sm focus:border-white outline-none font-mono"
               />
             </div>
           </div>
           <div className="space-y-1">
             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Location</label>
             <input 
               type="text" 
               value={location} onChange={e => setLocation(e.target.value)}
               placeholder="City, State" 
               className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-white outline-none"
             />
           </div>
         </div>

         <div className="grid grid-cols-2 gap-3">
           <div className="space-y-1">
             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Category</label>
             <select 
               value={category} onChange={e => setCategory(e.target.value as any)}
               className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-white outline-none appearance-none"
             >
               {['Engine', 'Suspension', 'Wheels', 'Interior', 'Exterior', 'Electronics', 'Other'].map(c => <option key={c}>{c}</option>)}
             </select>
           </div>
           <div className="space-y-1">
             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Condition</label>
             <select 
               value={condition} onChange={e => setCondition(e.target.value as any)}
               className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-white outline-none appearance-none"
             >
               {['New', 'Used - Like New', 'Used - Good', 'Used - Fair'].map(c => <option key={c}>{c}</option>)}
             </select>
           </div>
         </div>

         {category === 'Wheels' && (
           <div className="space-y-3 pt-2">
             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
               Wheel & Tire Specs
             </label>
             <div className="grid grid-cols-2 gap-3">
               <input 
                 type="text" 
                 value={wheelSize} onChange={e => setWheelSize(e.target.value)}
                 placeholder="Wheel Size (e.g. 18x9.5 +38)" 
                 className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-white outline-none"
               />
               <input 
                 type="text" 
                 value={tireSize} onChange={e => setTireSize(e.target.value)}
                 placeholder="Tire Size (e.g. 265/35R18)" 
                 className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-white outline-none"
               />
             </div>
           </div>
         )}

         <div className="space-y-1">
           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Description</label>
           <textarea 
             value={description} onChange={e => setDescription(e.target.value)}
             placeholder="Describe the condition, mileage, why you are selling, etc..." 
             className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-white outline-none min-h-[120px]"
           />
         </div>

         <div className="space-y-3 pt-2">
           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
             <Car size={12}/> Compatibility (Optional)
           </label>
           <div className="grid grid-cols-2 gap-3">
             <input 
               type="text" 
               value={make} onChange={e => setMake(e.target.value)}
               placeholder="Make (e.g. BMW)" 
               className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-white outline-none"
             />
             <input 
               type="text" 
               value={model} onChange={e => setModel(e.target.value)}
               placeholder="Model (e.g. M3)" 
               className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-white outline-none"
             />
           </div>
         </div>

      </div>
    </motion.div>
  );
}
