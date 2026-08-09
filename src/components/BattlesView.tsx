import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, setDoc, updateDoc, increment, getDoc, orderBy, limit, onSnapshot, arrayUnion } from 'firebase/firestore';
import { Car, UserProfile } from '../types';
import { Swords, Trophy, Upload, ChevronRight, Car as CarIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CarDetailsModal } from './CarDetailsModal';

interface BattleEntry {
  id: string; // userId
  carId: string;
  userId: string;
  votes: number;
  coverImage?: string;
  make: string;
  model: string;
  year: number;
  ownerUsername: string;
  ownerProfilePic?: string;
  createdAt: number;
}

export function BattlesView({ hideHeader }: { hideHeader?: boolean }) {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<BattleEntry[]>([]);
  const [myEntry, setMyEntry] = useState<BattleEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [userCars, setUserCars] = useState<Car[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [battlePair, setBattlePair] = useState<BattleEntry[]>([]);
  const [votedPairs, setVotedPairs] = useState<Set<string>>(new Set());
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);

  const currentMonthId = new Date().toISOString().slice(0, 7); // e.g., "2026-08"

  useEffect(() => {
    if (!user) return;
    const entriesRef = collection(db, 'battles', currentMonthId, 'entries');
    const q = query(entriesRef, orderBy('votes', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BattleEntry));
      setEntries(fetched);
      setMyEntry(fetched.find(e => e.userId === user.uid) || null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentMonthId]);

  // Load user cars if they open the submit modal
  useEffect(() => {
    if (showSubmitModal && user && userCars.length === 0) {
      const fetchCars = async () => {
        const q = query(collection(db, 'cars'));
        const snap = await getDocs(q);
        const cars = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Car))
          .filter(c => c.ownerId === user.uid);
        setUserCars(cars);
      };
      fetchCars();
    }
  }, [showSubmitModal, user]);

  useEffect(() => {
    // Select two random cars for battle if there are at least 2 entries
    if (entries.length >= 2) {
      pickNewPair();
    }
  }, [entries]);

  const pickNewPair = () => {
    if (entries.length < 2) return;
    
    // Simple logic: pick two random different entries
    // Ideally, we'd pick pairs the user hasn't voted on, but for simplicity we'll just pick randomly.
    let index1 = Math.floor(Math.random() * entries.length);
    let index2 = Math.floor(Math.random() * entries.length);
    while (index1 === index2) {
      index2 = Math.floor(Math.random() * entries.length);
    }
    setBattlePair([entries[index1], entries[index2]]);
  };

  const handleVote = async (winnerId: string, loserId: string) => {
    if (!user) return;
    
    // Create a unique string for this specific matchup to prevent spamming the exact same pair (locally)
    const pairKey = [winnerId, loserId].sort().join('-');
    if (votedPairs.has(pairKey)) {
      pickNewPair();
      return;
    }

    const newVoted = new Set(votedPairs);
    newVoted.add(pairKey);
    setVotedPairs(newVoted);

    // Optimistic UI update could go here, but onSnapshot handles it fast enough
    
    try {
      const winnerRef = doc(db, 'battles', currentMonthId, 'entries', winnerId);
      await updateDoc(winnerRef, { votes: increment(1) });
    } catch (err) {
      console.error("Error voting", err);
    }

    setTimeout(() => {
      pickNewPair();
    }, 600); // slight delay for visual feedback
  };

  const handleSubmitCar = async (car: Car) => {
    if (!user || !profile) return;
    setSubmitting(true);
    try {
      const entryRef = doc(db, 'battles', currentMonthId, 'entries', user.uid);
      const newEntry: Partial<BattleEntry> = {
        carId: car.id,
        userId: user.uid,
        votes: 0,
        coverImage: car.coverImage || '',
        make: car.make,
        model: car.model,
        year: car.year,
        ownerUsername: profile.username,
        ownerProfilePic: profile.profilePic || '',
        createdAt: Date.now()
      };
      await setDoc(entryRef, newEntry);
      
      // Ensure the monthly document exists
      const monthRef = doc(db, 'battles', currentMonthId);
      await setDoc(monthRef, { active: true }, { merge: true });
      
      setShowSubmitModal(false);
    } catch (err) {
      console.error(err);
      alert("Error submitting car");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAwardWinner = async (e: React.MouseEvent, entryUserId: string) => {
    e.stopPropagation(); // prevent car click
    if (user?.email !== 'tonyang11552883@gmail.com') return;
    try {
      const userRef = doc(db, 'users', entryUserId);
      const badgeId = `cotm_winner_${currentMonthId.replace('-', '_')}`;
      await updateDoc(userRef, { badges: arrayUnion(badgeId) });
      alert('Badge Awarded!');
    } catch (err) {
      console.error(err);
      alert('Failed to award badge');
    }
  };

  const handleCarClick = async (carId: string) => {
    const snap = await getDoc(doc(db, 'cars', carId));
    if (snap.exists()) {
      setSelectedCar({ id: snap.id, ...snap.data() } as Car);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col h-full bg-black text-white relative">
      {!hideHeader && (
        <div className="p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] border-b border-zinc-900 bg-zinc-950/50 backdrop-blur sticky top-0 z-30">
          <h1 className="text-xl font-black italic tracking-tight uppercase">Car of the Month</h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{monthName} Battles</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-32">
        {/* Battle Arena */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Swords size={16} className="text-yellow-500" />
              Battle Arena
            </h2>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded">
              {entries.length} Entries
            </span>
          </div>

          {entries.length < 2 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-center space-y-3">
              <AlertCircle size={24} className="mx-auto text-zinc-500" />
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Waiting for Challengers</p>
              <p className="text-[10px] text-zinc-500">Need at least 2 entries to start battles.</p>
            </div>
          ) : battlePair.length === 2 ? (
            <div className="relative">
              <div className="grid grid-cols-2 gap-3">
                {battlePair.map((entry, idx) => {
                  const otherEntry = battlePair[idx === 0 ? 1 : 0];
                  return (
                    <motion.div
                      key={entry.id + idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleVote(entry.id, otherEntry.id)}
                      className="relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer group"
                    >
                      <div className="aspect-[4/5] relative">
                        {entry.coverImage ? (
                          <img src={entry.coverImage} alt="Car" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            <CarIcon size={32} className="text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                          <p className="text-xs font-black uppercase tracking-tight leading-tight truncate">
                            {entry.year} {entry.make} {entry.model}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full overflow-hidden bg-zinc-800 flex-none">
                              {entry.ownerProfilePic ? (
                                <img src={entry.ownerProfilePic} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[7px] font-black">{entry.ownerUsername[0]}</div>
                              )}
                            </div>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider truncate">@{entry.ownerUsername}</span>
                          </div>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white text-black px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">
                          VOTE
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <div className="w-10 h-10 bg-black border-2 border-zinc-800 rounded-full flex items-center justify-center shadow-xl">
                  <span className="text-[10px] font-black italic text-yellow-500">VS</span>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* My Status */}
        <section>
          {!myEntry ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full bg-white text-black py-4 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-zinc-200 transition-colors"
            >
              <Upload size={20} className="mb-1" />
              <span className="text-xs font-black uppercase tracking-widest">Submit to {monthName} Battles</span>
              <span className="text-[9px] font-bold text-zinc-600 uppercase">Show off your build</span>
            </button>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 flex-none">
                {myEntry.coverImage ? (
                  <img src={myEntry.coverImage} className="w-full h-full object-cover" alt="My Car" />
                ) : (
                  <CarIcon size={24} className="m-auto mt-5 text-zinc-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-0.5">Your Entry</h3>
                <p className="text-sm font-bold uppercase truncate">{myEntry.year} {myEntry.make} {myEntry.model}</p>
                <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-wider">Current Votes: <span className="text-white">{myEntry.votes}</span></p>
              </div>
            </div>
          )}
        </section>

        {/* Leaderboard */}
        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Trophy size={16} className="text-zinc-400" />
            Top 10 Leaderboard
          </h2>
          
          <div className="space-y-2">
            {entries.slice(0, 10).map((entry, index) => (
              <div 
                key={entry.id}
                onClick={() => handleCarClick(entry.carId)}
                className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <div className="w-6 text-center text-xs font-black text-zinc-500">
                  #{index + 1}
                </div>
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 flex-none">
                  {entry.coverImage ? (
                    <img src={entry.coverImage} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <CarIcon size={16} className="m-auto mt-3.5 text-zinc-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase truncate">{entry.year} {entry.make} {entry.model}</p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">@{entry.ownerUsername}</p>
                </div>
                {user?.email === 'tonyang11552883@gmail.com' && index === 0 && (
                  <button 
                    onClick={(e) => handleAwardWinner(e, entry.userId)}
                    className="mr-2 p-1.5 bg-yellow-500/20 text-yellow-500 rounded-lg hover:bg-yellow-500/40 transition-colors"
                    title="Award COTM Badge"
                  >
                    <Trophy size={14} />
                  </button>
                )}
                <div className="text-right">
                  <p className="text-sm font-black text-white">{entry.votes}</p>
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Votes</p>
                </div>
              </div>
            ))}
            {entries.length === 0 && (
              <div className="text-center py-8 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                No entries yet this month.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/50">
                <h3 className="text-sm font-black uppercase tracking-wider">Select a Build to Submit</h3>
                <button onClick={() => setShowSubmitModal(false)} className="text-zinc-500 hover:text-white">
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                {userCars.length === 0 ? (
                  <div className="text-center py-8 text-sm font-bold text-zinc-500">
                    No cars in your garage yet.
                  </div>
                ) : (
                  userCars.map(car => (
                    <button
                      key={car.id}
                      onClick={() => handleSubmitCar(car)}
                      disabled={submitting}
                      className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-4 hover:border-white/20 transition-all text-left"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-950 flex-none">
                        {car.coverImage ? (
                          <img src={car.coverImage} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <CarIcon size={20} className="m-auto mt-5 text-zinc-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black uppercase">{car.year} {car.make} {car.model}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Stage: {car.stage}</p>
                      </div>
                      <ChevronRight size={16} className="text-zinc-500" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCar && (
          <CarDetailsModal
            car={selectedCar}
            isOwner={false}
            onClose={() => setSelectedCar(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
