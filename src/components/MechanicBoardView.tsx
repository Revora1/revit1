import React, { useEffect, useState } from 'react';
import { ArrowLeft, Wrench, Search, MapPin, Phone, Globe, Mail, Plus, MessageSquare } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MechanicShop } from '../types';
import { AddMechanicModal } from './AddMechanicModal';
import { useAuth } from '../context/AuthContext';

interface MechanicBoardViewProps {
  onBack: () => void;
}

export function MechanicBoardView({ onBack }: MechanicBoardViewProps) {
  const { user } = useAuth();
  const [shops, setShops] = useState<MechanicShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'mechanics'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedShops = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MechanicShop[];
      
      setShops(fetchedShops);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRequestQuote = (shop: MechanicShop) => {
    const currentUserId = user?.uid || 'anonymous';
    const providerId = shop.userId || shop.id;
    const chatId = `${currentUserId}_${providerId}`;

    window.dispatchEvent(
      new CustomEvent('navigate-chat', {
        detail: {
          chatId,
          otherUser: {
            id: providerId,
            uid: providerId,
            displayName: shop.companyName,
            username: shop.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            photoURL: shop.bannerUrl || '',
            shopName: shop.companyName,
            isMechanic: true,
            initialMessage: `Hi ${shop.companyName}, I would like to request a quote for service regarding: "${shop.specialties}".`
          }
        }
      })
    );
  };

  const filteredShops = shops.filter(shop => {
    const term = searchQuery.toLowerCase();
    return (
      shop.companyName.toLowerCase().includes(term) ||
      shop.specialties.toLowerCase().includes(term) ||
      shop.location.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex-none p-4 pb-2 border-b border-zinc-900 bg-black/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center bg-zinc-900 rounded-full text-white hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2 text-white">
              <Wrench size={20} className="text-yellow-500" />
              <h1 className="font-black uppercase tracking-widest text-lg">Service Board</h1>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-8 h-8 flex items-center justify-center bg-yellow-500 rounded-full text-black hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]"
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            type="text"
            placeholder="Search shops, locations, or specialties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 font-medium"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-8 h-8 border-2 border-zinc-800 border-t-yellow-500 rounded-full animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Loading Directory...</span>
          </div>
        ) : filteredShops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
            {filteredShops.map((shop) => (
              <div 
                key={shop.id}
                className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden group hover:border-zinc-800 transition-colors flex flex-col relative"
              >
                {/* Floating Request Quote FAB on Banner */}
                <button
                  onClick={() => handleRequestQuote(shop)}
                  className="absolute top-3 right-3 z-20 bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1.5 rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-[0_4px_16px_rgba(234,179,8,0.45)] active:scale-95 transition-all border border-yellow-300/50 cursor-pointer"
                  title="Request Quote"
                >
                  <MessageSquare size={13} className="fill-black/20" />
                  <span>Request Quote</span>
                </button>

                {shop.bannerUrl ? (
                  <div className="h-32 w-full bg-zinc-900 relative">
                    <img src={shop.bannerUrl} alt={shop.companyName} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                  </div>
                ) : (
                  <div className="h-10 w-full bg-yellow-500/10" />
                )}
                
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1 pr-16">
                    {shop.companyName}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 text-zinc-400 mb-3">
                    <MapPin size={12} />
                    <span className="text-xs font-bold">{shop.location}</span>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed font-medium flex-1">
                    {shop.description}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1 block">Specialties</span>
                      <p className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded inline-block">
                        {shop.specialties}
                      </p>
                    </div>

                    {/* Primary Quote Request Action */}
                    <button
                      onClick={() => handleRequestQuote(shop)}
                      className="w-full mt-2 flex items-center justify-center gap-2 text-black bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(234,179,8,0.25)] active:scale-98 transition-all cursor-pointer"
                    >
                      <MessageSquare size={15} />
                      Request Quote
                    </button>

                    <div className="pt-3 border-t border-zinc-900 grid grid-cols-2 gap-2">
                      <a href={`tel:${shop.phone}`} className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors bg-zinc-900/50 p-2 rounded-lg justify-center">
                        <Phone size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Call</span>
                      </a>
                      <a href={`mailto:${shop.email}`} className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors bg-zinc-900/50 p-2 rounded-lg justify-center">
                        <Mail size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Email</span>
                      </a>
                      {shop.website && (
                        <a href={shop.website} target="_blank" rel="noopener noreferrer" className="col-span-2 flex items-center gap-2 text-zinc-300 hover:text-white transition-colors bg-zinc-900/50 p-2 rounded-lg justify-center">
                          <Globe size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Website</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 bg-zinc-950/40 rounded-3xl border border-zinc-900">
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-700">
              <Wrench size={24} />
            </div>
            <div>
              <p className="text-xs font-black italic uppercase text-zinc-400">No Shops Found</p>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Be the first to list your services</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors"
            >
              List Shop
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddMechanicModal 
          onClose={() => setShowAddModal(false)} 
          onAdded={() => {
            // Optional: Show success toast
          }} 
        />
      )}
    </div>
  );
}
