import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, TrendingUp, Hash, User } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';

export function SearchView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const trending = ['#Clio182', '#M3Build', '#JDM', '#EuroTuner', '#DriftMissile'];

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const qLower = query(
          usersRef,
          where('usernameLower', '>=', searchTerm.toLowerCase()),
          where('usernameLower', '<=', searchTerm.toLowerCase() + '\uf8ff'),
          limit(10)
        );
        const snap = await getDocs(qLower);
        let users = snap.docs.map(doc => doc.data() as UserProfile);

        if (users.length === 0) {
          const qNormal = query(
            usersRef,
            where('username', '>=', searchTerm),
            where('username', '<=', searchTerm + '\uf8ff'),
            limit(10)
          );
          const snapNormal = await getDocs(qNormal);
          users = snapNormal.docs.map(doc => doc.data() as UserProfile);
        }
        setResults(users);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const onUserClick = (uid: string) => {
    window.dispatchEvent(new CustomEvent('navigate-profile', { detail: { userId: uid } }));
  };

  return (
    <div className="p-6 space-y-8 bg-black min-h-full pb-20 scrollbar-hide">
      <div className="space-y-6">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">Discover</h1>
        <div className="relative group">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={20} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search builds, users, or cars..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-white outline-none transition-colors"
          />
        </div>
      </div>

      {searchTerm.trim() ? (
        <div className="space-y-4">
          <h2 className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Users</h2>
          {loading ? (
             <div className="flex justify-center p-8">
               <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
             </div>
          ) : results.length > 0 ? (
            <div className="grid gap-3">
              {results.map(u => (
                <button 
                  key={u.uid}
                  onClick={() => onUserClick(u.uid)}
                  className="flex items-center gap-3 p-3 bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-white transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                    {u.profilePic ? (
                      <img src={u.profilePic} alt={u.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold uppercase">
                        {u.username[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm tracking-tight">{u.username}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{u.followersCount} Followers</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <p className="text-sm font-bold">NO RESULTS FOR "{searchTerm.toUpperCase()}"</p>
              <p className="text-xs">Try searching for something else</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-zinc-500">
               <TrendingUp size={16} />
               <span className="text-[10px] font-black tracking-widest uppercase">Trending Builds</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {trending.map(tag => (
                <button key={tag} className="px-4 py-2 bg-zinc-900 rounded-full text-sm font-bold border border-zinc-800 hover:border-white transition-all">
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-zinc-500">
               <Hash size={16} />
               <span className="text-[10px] font-black tracking-widest uppercase">Popular Categories</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['TRACK READY', 'STANCE', 'MUSCLE', 'JDM CLASSIC'].map(cat => (
                <div key={cat} className="h-24 bg-zinc-900 rounded-2xl p-4 flex flex-col justify-end border border-zinc-800 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                   <span className="text-[10px] font-black italic tracking-tight z-20 group-hover:scale-105 transition-transform origin-left uppercase">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
