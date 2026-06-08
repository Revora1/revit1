import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Trophy, Search, Wrench, MessageSquare, 
  ThumbsUp, Award, ExternalLink, Car, PlusSquare, 
  Sparkles, Star, ChevronDown, ChevronUp, User, Eye, X,
  Lock, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReputationTier {
  name: string;
  pointsRequired: number;
  badgeColor: string;
  badgeBorder: string;
  borderColor: string;
  bgGradient: string;
  textColor: string;
  description: string;
}

const REPUTATION_TIERS: ReputationTier[] = [
  {
    name: "Master Builder",
    pointsRequired: 300,
    badgeColor: "bg-purple-950/80 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]",
    badgeBorder: "border-purple-500",
    borderColor: "border-purple-500/25",
    bgGradient: "from-purple-950/40 to-indigo-950/40",
    textColor: "text-purple-400",
    description: "Legendary mechanical wizard. Visually documented builds, community-trusted specs & advice."
  },
  {
    name: "Trackday Regular",
    pointsRequired: 150,
    badgeColor: "bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
    badgeBorder: "border-amber-500",
    borderColor: "border-amber-500/25",
    bgGradient: "from-amber-950/40 to-yellow-950/40",
    textColor: "text-amber-400",
    description: "Proven high performer on the streets, dyno, & track day buildlogs."
  },
  {
    name: "Tuner Pro",
    pointsRequired: 50,
    badgeColor: "bg-blue-950/80 border-blue-500 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]",
    badgeBorder: "border-blue-500",
    borderColor: "border-blue-500/25",
    bgGradient: "from-blue-950/40 to-cyan-950/40",
    textColor: "text-cyan-400",
    description: "Actively contributing mods, dynos, and writing helpful comment replies."
  },
  {
    name: "Grease Monkey",
    pointsRequired: 0,
    badgeColor: "bg-zinc-900/80 border-zinc-700 text-zinc-300",
    badgeBorder: "border-zinc-700",
    borderColor: "border-zinc-800",
    bgGradient: "from-zinc-900/20 to-zinc-950/20",
    textColor: "text-zinc-400",
    description: "Automotive build journey initialized. Share logs & write helpful comments to level up!"
  }
];

const MILESTONE_REWARDS = [
  {
    tierName: "Grease Monkey",
    pointsRequired: 0,
    badgeName: "🔧 Novice Grease Gun Badge",
    rewards: [
      "Comment styling: Standard Zinc",
      "Unlock Garage: Register 1 Car Spec",
      "Write active replies in Comments"
    ]
  },
  {
    tierName: "Tuner Pro",
    pointsRequired: 50,
    badgeName: "⚡ Pro Dyno Certified Badge",
    rewards: [
      "Custom Neon-Blue Avatar Rim",
      "Unlock Garage: Register up to 3 Cars",
      "Ability to write Dyno review logs"
    ]
  },
  {
    tierName: "Trackday Regular",
    pointsRequired: 150,
    badgeName: "🏁 Apex Corner Expert Badge",
    rewards: [
      "Spotlight feature: Promoted Builds",
      "Unlock Garage: Register up to 5 Cars",
      "Receive gold-rimmed activity cards"
    ]
  },
  {
    tierName: "Master Builder",
    pointsRequired: 300,
    badgeName: "👑 Carbon Fiber Crown Badge",
    rewards: [
      "Verified Legend Expert emblem",
      "Unlock Garage: Register Unlimited Cars",
      "Pin posts to the Top Tuners index"
    ]
  }
];

const getCurrentTier = (pts: number): ReputationTier => {
  return REPUTATION_TIERS.find(t => pts >= t.pointsRequired) || REPUTATION_TIERS[REPUTATION_TIERS.length - 1];
};

const getNextTier = (pts: number): ReputationTier | null => {
  const reversed = [...REPUTATION_TIERS].reverse();
  return reversed.find(t => t.pointsRequired > pts) || null;
};

export function TopTuners() {
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [showGuide, setShowGuide] = useState(false);
  const [selectedUserStats, setSelectedUserStats] = useState<any | null>(null);

  useEffect(() => {
    // We fetch all key collections reactively to compute points dynamically on client-side
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    }, (err) => console.error("Error loading users:", err));

    const unsubGarage = onSnapshot(collection(db, 'garage'), (snap) => {
      setCars(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Error loading garage:", err));

    const unsubPosts = onSnapshot(collection(db, 'posts'), (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Error loading posts:", err));

    const unsubComments = onSnapshot(collection(db, 'comments'), (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Error loading comments:", err));

    const unsubVotes = onSnapshot(collection(db, 'helpful_votes'), (snap) => {
      setVotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Error loading votes:", err));

    // Resolve loading once all metadata collections have a baseline
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => {
      unsubUsers();
      unsubGarage();
      unsubPosts();
      unsubComments();
      unsubVotes();
      clearTimeout(timer);
    };
  }, []);

  // Compute reputation scores on the fly for all users
  const rankedUsers = useMemo(() => {
    // Map with empty baseline statistics for each user in db
    const statsMap: Record<string, {
      carsCount: number;
      buildLogsCount: number;
      postsCount: number;
      commentsCount: number;
      helpfulVotesCount: number;
    }> = {};

    users.forEach(u => {
      statsMap[u.uid] = {
        carsCount: 0,
        buildLogsCount: 0,
        postsCount: 0,
        commentsCount: 0,
        helpfulVotesCount: 0
      };
    });

    // Populate counts
    cars.forEach(car => {
      const ownerId = car.ownerId;
      if (ownerId && statsMap[ownerId]) {
        statsMap[ownerId].carsCount += 1;
        statsMap[ownerId].buildLogsCount += (car.buildTimeline?.length || 0);
      }
    });

    posts.forEach(post => {
      const authorId = post.authorId;
      if (authorId && statsMap[authorId]) {
        statsMap[authorId].postsCount += 1;
      }
    });

    comments.forEach(comment => {
      const authorId = comment.authorId;
      if (authorId && statsMap[authorId]) {
        statsMap[authorId].commentsCount += 1;
      }
    });

    votes.forEach(vote => {
      const authorId = vote.commentAuthorId;
      if (authorId && statsMap[authorId]) {
        statsMap[authorId].helpfulVotesCount += 1;
      }
    });

    const calculated = users.map(user => {
      const stats = statsMap[user.uid] || {
        carsCount: 0,
        buildLogsCount: 0,
        postsCount: 0,
        commentsCount: 0,
        helpfulVotesCount: 0
      };

      const pointsFromCars = stats.carsCount * 20;
      const pointsFromLogs = stats.buildLogsCount * 10;
      const pointsFromPosts = stats.postsCount * 10;
      const pointsFromComments = stats.commentsCount * 5;
      const pointsFromVotes = stats.helpfulVotesCount * 15;

      const totalPoints = pointsFromCars + pointsFromLogs + pointsFromPosts + pointsFromComments + pointsFromVotes;
      const tier = getCurrentTier(totalPoints);

      return {
        ...user,
        stats,
        totalPoints,
        tier,
        breakdown: {
          cars: pointsFromCars,
          logs: pointsFromLogs,
          posts: pointsFromPosts,
          comments: pointsFromComments,
          votes: pointsFromVotes
        }
      };
    });

    // Highly performant sort by totalPoints desc, username asc
    return calculated.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return (a.username || '').localeCompare(b.username || '');
    });
  }, [users, cars, posts, comments, votes]);

  // Find active authenticated user identity metrics
  const myRankingInfo = useMemo(() => {
    if (!currentUser) return null;
    const index = rankedUsers.findIndex(u => u.uid === currentUser.uid);
    if (index === -1) return null;
    return {
      rank: index + 1,
      user: rankedUsers[index]
    };
  }, [rankedUsers, currentUser]);

  // Handle live query lists
  const filteredUsers = useMemo(() => {
    return rankedUsers.filter(u => {
      const matchesSearch = (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (u.bio || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = selectedTier === 'all' || u.tier.name === selectedTier;
      return matchesSearch && matchesTier;
    });
  }, [rankedUsers, searchQuery, selectedTier]);

  // Podium splits
  const podiumUsers = useMemo(() => {
    return rankedUsers.slice(0, 3);
  }, [rankedUsers]);

  // Other list elements from rank #4 onwards
  const standardListUsers = useMemo(() => {
    // If we've applied filters, show everything matched.
    // Otherwise, slice from 3 to omit the podium.
    if (searchQuery || selectedTier !== 'all') {
      return filteredUsers;
    }
    return filteredUsers.slice(3);
  }, [filteredUsers, searchQuery, selectedTier]);

  const handleUserClick = (userId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-profile', { detail: { userId } }));
  };

  return (
    <div className="flex flex-col min-h-full bg-black pb-24 text-zinc-100">
      {/* Dynamic Header */}
      <div className="pt-12 px-6 pb-6 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase flex items-center gap-2">
              <Trophy className="text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)] animate-pulse" size={28} />
              Top Tuners
            </h1>
            <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mt-1">
              REP, BUILDS & COMMUNITY AUTHORITY
            </p>
          </div>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-xs font-black uppercase text-zinc-400 tracking-widest transition-all border border-zinc-800 hover:border-zinc-700"
          >
            <Sparkles size={12} className="text-yellow-500" />
            <span>Rules</span>
            {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Reputation Guide Panel (Expands beautifully) */}
        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800/80 overflow-hidden text-xs text-zinc-400"
            >
              <h4 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-1">
                🏆 Point Allocation Mechanics
              </h4>
              <p className="mb-3 text-zinc-500 leading-relaxed">
                Reputation reflects your automotive craftsmanship and contributions to the project ecosystem. Add specs, logging updates, and answer comments with high helpfulness to rise.
              </p>
              <div className="grid grid-cols-2 gap-2 text-zinc-300 font-medium">
                <div className="flex items-center gap-2 p-1.5 bg-zinc-900/40 rounded-lg">
                  <span className="text-yellow-500 font-bold w-10 text-right">+20</span>
                  <span>Per Garage Car</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-zinc-900/40 rounded-lg">
                  <span className="text-yellow-500 font-bold w-10 text-right">+10</span>
                  <span>Mod Log Entry</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-zinc-900/40 rounded-lg">
                  <span className="text-yellow-500 font-bold w-10 text-right">+10</span>
                  <span>Media Post</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-zinc-900/40 rounded-lg">
                  <span className="text-yellow-500 font-bold w-10 text-right">+5</span>
                  <span>Active Comment</span>
                </div>
                <div className="col-span-2 flex items-center gap-2 p-2 bg-purple-950/20 rounded-lg border border-purple-500/10">
                  <span className="text-purple-400 font-bold w-10 text-right">+15</span>
                  <span>Helpful Vote Received (per user click on comments)</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 border-2 border-zinc-700 border-t-yellow-500 rounded-full animate-spin" />
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Synchronizing Leaderboard...</p>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* My Score Summary Block */}
          {myRankingInfo && (
            <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 rounded-3xl p-5 border border-zinc-800/80 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-900 flex-shrink-0">
                    <img 
                      src={myRankingInfo.user.profilePic || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120'} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm uppercase text-zinc-300">@{myRankingInfo.user.username}</span>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">(You)</span>
                    </div>
                    <p className="text-xs font-black text-zinc-500 flex items-center gap-1">
                      Rank <span className="text-white text-sm">#{myRankingInfo.rank}</span> overall
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black bg-zinc-800 text-yellow-400 px-3 py-1.5 rounded-full border border-yellow-500/20 flex items-center gap-1">
                    <Star size={13} fill="currentColor" /> {myRankingInfo.user.totalPoints} REP
                  </span>
                </div>
              </div>

              {/* Progress to Next Tier */}
              {(() => {
                const currentPts = myRankingInfo.user.totalPoints;
                const activeTier = myRankingInfo.user.tier;
                const nextTier = getNextTier(currentPts);

                if (!nextTier) {
                  return (
                    <div className="bg-zinc-900/60 p-3 rounded-2xl border border-purple-500/10 flex items-center justify-between text-xs text-purple-300">
                      <span className="font-semibold flex items-center gap-1">👑 Peak Rank: {activeTier.name} reached!</span>
                      <span className="text-[10px] px-2 py-0.5 bg-purple-950 rounded border border-purple-500/20 font-bold uppercase">MAX LEVEL</span>
                    </div>
                  );
                }

                const prevReq = activeTier.pointsRequired;
                const nextReq = nextTier.pointsRequired;
                const progressPercent = Math.min(100, Math.max(0, ((currentPts - prevReq) / (nextReq - prevReq)) * 100));

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-zinc-500">
                      <span>{activeTier.name}</span>
                      <span className="text-zinc-300">Next: {nextTier.name} ({nextReq - currentPts} to go)</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/30">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-1000" 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Top 3 Podium (Omitted if searching or filtering tiers) */}
          {searchQuery === "" && selectedTier === "all" && podiumUsers.length > 0 && (
            <div className="py-2">
              <div className="text-center mb-6">
                <h3 className="text-lg font-black tracking-wider uppercase text-zinc-400 italic">Podium Positions</h3>
                <div className="h-0.5 w-12 bg-zinc-800 mx-auto mt-1" />
              </div>

              <div className="flex items-end justify-center gap-2 sm:gap-6 mt-2 mb-4 px-2">
                {/* 2nd Place */}
                {podiumUsers[1] && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    onClick={() => handleUserClick(podiumUsers[1].uid)}
                    className="flex flex-col items-center cursor-pointer w-24 sm:w-28 group"
                    id={`podium-2`}
                  >
                    <div className="relative mb-2">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-zinc-400 p-0.5 bg-zinc-900 group-hover:scale-105 transition-transform duration-300">
                        <img 
                          src={podiumUsers[1].profilePic || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120'} 
                          alt="" 
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <div className="absolute -top-1 -left-1 w-6 h-6 bg-zinc-400 text-black text-[10px] font-black rounded-full flex items-center justify-center border border-zinc-900">
                        2
                      </div>
                    </div>
                    <div className="text-center w-full">
                      <p className="text-xs font-black tracking-tight text-white truncate max-w-full">
                        @{podiumUsers[1].username}
                      </p>
                      <span className="text-[10px] font-black text-zinc-400 tracking-wider">
                        {podiumUsers[1].totalPoints} REP
                      </span>
                    </div>
                    {/* Podium block */}
                    <div className="w-full h-14 sm:h-16 bg-gradient-to-t from-zinc-950 via-zinc-900 to-zinc-800 rounded-t-xl border-t border-x border-zinc-800/80 mt-3 flex flex-col justify-end pb-2 items-center">
                      <span className="text-[10px] font-black italic tracking-tighter text-zinc-400">SILVER</span>
                    </div>
                  </motion.div>
                )}

                {/* 1st Place */}
                {podiumUsers[0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    onClick={() => handleUserClick(podiumUsers[0].uid)}
                    className="flex flex-col items-center cursor-pointer w-28 sm:w-32 group z-10"
                    id={`podium-1`}
                  >
                    <div className="relative mb-2">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-yellow-500 p-1 bg-zinc-900 shadow-[0_0_20px_rgba(234,179,8,0.25)] group-hover:scale-105 transition-transform duration-300 relative">
                        <img 
                          src={podiumUsers[0].profilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                          alt="" 
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <div className="absolute -top-1.5 -left-1.5 w-8 h-8 bg-yellow-500 text-black text-xs font-black rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-lg">
                        1
                      </div>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 rotate-12 text-lg text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]">
                        👑
                      </div>
                    </div>
                    <div className="text-center w-full">
                      <p className="text-sm font-black tracking-tight text-yellow-400 truncate max-w-full">
                        @{podiumUsers[0].username}
                      </p>
                      <span className="text-xs font-black text-zinc-200">
                        {podiumUsers[0].totalPoints} REP
                      </span>
                    </div>
                    {/* Podium block */}
                    <div className="w-full h-20 sm:h-24 bg-gradient-to-t from-zinc-950 via-zinc-900/30 to-yellow-950/25 rounded-t-2xl border-t border-x border-yellow-500/20 mt-3 flex flex-col justify-end pb-3 items-center shadow-[0_12px_24px_rgba(234,179,8,0.05)]">
                      <span className="text-xs font-black italic tracking-tighter text-yellow-500 drop-shadow-[0_2px_4px_rgba(234,179,8,0.2)]">GOLDEN</span>
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place */}
                {podiumUsers[2] && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    onClick={() => handleUserClick(podiumUsers[2].uid)}
                    className="flex flex-col items-center cursor-pointer w-24 sm:w-28 group"
                    id={`podium-3`}
                  >
                    <div className="relative mb-2">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-amber-600/80 p-0.5 bg-zinc-900 group-hover:scale-105 transition-transform duration-300">
                        <img 
                          src={podiumUsers[2].profilePic || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120'} 
                          alt="" 
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <div className="absolute -top-1 -left-1 w-6 h-6 bg-amber-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border border-zinc-900">
                        3
                      </div>
                    </div>
                    <div className="text-center w-full">
                      <p className="text-xs font-black tracking-tight text-white truncate max-w-full">
                        @{podiumUsers[2].username}
                      </p>
                      <span className="text-[10px] font-black text-zinc-400 tracking-wider">
                        {podiumUsers[2].totalPoints} REP
                      </span>
                    </div>
                    {/* Podium block */}
                    <div className="w-full h-10 sm:h-12 bg-gradient-to-t from-zinc-950 via-zinc-900 to-zinc-800 rounded-t-xl border-t border-x border-zinc-800/80 mt-3 flex flex-col justify-end pb-2 items-center">
                      <span className="text-[10px] font-black italic tracking-tighter text-amber-500">BRONZE</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Search and Filters Controls */}
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                <Search size={16} />
              </span>
              <input 
                type="text"
                placeholder="Search tuners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950 text-white placeholder-zinc-500 rounded-2xl border border-zinc-900 focus:border-zinc-800 focus:outline-none text-sm transition-all"
              />
            </div>

            {/* Tier Filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
              <button 
                onClick={() => setSelectedTier("all")}
                className={`flex-shrink-0 text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-full transition-all ${
                  selectedTier === 'all' 
                  ? 'bg-white text-black' 
                  : 'bg-zinc-950 text-zinc-500 border border-zinc-900 hover:text-white'
                }`}
              >
                All Tiers
              </button>
              {REPUTATION_TIERS.map(t => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTier(t.name)}
                  className={`flex-shrink-0 text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-full transition-all border ${
                    selectedTier === t.name
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-950 text-zinc-500 border-zinc-900/60 hover:text-white'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard List Header */}
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-zinc-500 px-2 mt-4">
            <span>Tuner Profiles</span>
            <span>Reputation Score</span>
          </div>

          {/* Users List */}
          <div className="space-y-2">
            {standardListUsers.length === 0 ? (
              <div className="text-center py-12 bg-zinc-950 rounded-3xl border border-zinc-900 px-6">
                <User size={32} className="mx-auto mb-3 text-zinc-750" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No matching Tuners found</p>
                <p className="text-[11px] text-zinc-650 mt-1">Try adapting your search parameters</p>
              </div>
            ) : (
              standardListUsers.map((user, index) => {
                // Calculate original rank in the master ranked list
                const originalRank = rankedUsers.findIndex(u => u.uid === user.uid) + 1;
                const isMe = currentUser?.uid === user.uid;

                return (
                  <motion.div
                    key={user.uid}
                    layoutId={`user-row-${user.uid}`}
                    onClick={() => handleUserClick(user.uid)}
                    className={`flex items-center justify-between p-4 rounded-2xl bg-zinc-950/40 border transition-all duration-300 hover:bg-zinc-900/40 cursor-pointer ${
                      isMe 
                      ? 'border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.04)] bg-zinc-900/20' 
                      : 'border-zinc-900 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank badge */}
                      <div className="w-6 flex-shrink-0 text-center">
                        <span className={`text-[11px] font-black ${
                          originalRank === 1 ? 'text-yellow-500' :
                          originalRank === 2 ? 'text-zinc-400' :
                          originalRank === 3 ? 'text-amber-600' : 'text-zinc-600'
                        }`}>
                          #{originalRank}
                        </span>
                      </div>

                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900">
                          <img 
                            src={user.profilePic || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120'} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {isMe && (
                          <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-yellow-500 border border-zinc-950 rounded-full flex items-center justify-center text-[8px] text-zinc-950 font-black">
                            ME
                          </div>
                        )}
                      </div>

                      {/* Name and active tier badge */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm text-white truncate max-w-[120px] sm:max-w-[200px]">
                            @{user.username || "tuner"}
                          </h4>
                          {/* Mini tier pill */}
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${user.tier.badgeColor}`}>
                            {user.tier.name}
                          </span>
                        </div>
                        
                        {/* Compact statistics breakdown */}
                        <div className="flex items-center gap-2.5 mt-1 text-[10px] text-zinc-500 font-bold">
                          <span className="flex items-center gap-0.5">
                            <Car size={10} className="text-zinc-500" /> {user.stats.carsCount}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Wrench size={10} className="text-zinc-500" /> {user.stats.buildLogsCount}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <PlusSquare size={10} className="text-zinc-500" /> {user.stats.postsCount}
                          </span>
                          {user.stats.helpfulVotesCount > 0 && (
                            <span className="flex items-center gap-0.5 text-purple-400">
                              <ThumbsUp size={10} /> {user.stats.helpfulVotesCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reputation display with detailed lookup trigger */}
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-xs font-black text-white px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center gap-1">
                          <Star size={11} fill="currentColor" className="text-yellow-500" />
                          <span>{user.totalPoints}</span>
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserStats(user);
                        }}
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-all"
                        title="View Points Breakdown"
                      >
                        <Eye size={12} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Points breakdown details lookup overlay modal */}
      <AnimatePresence>
        {selectedUserStats && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 w-full max-w-sm rounded-[32px] p-6 border border-zinc-800 shadow-2xl text-zinc-200 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-900 border border-zinc-700">
                    <img 
                      src={selectedUserStats.profilePic || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120'} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">@{selectedUserStats.username}</h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Reputation profile</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserStats(null)}
                  className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Tier status indicator banner */}
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${selectedUserStats.tier.bgGradient} border ${selectedUserStats.tier.borderColor} mb-6`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${selectedUserStats.tier.badgeColor}`}>
                    {selectedUserStats.tier.name}
                  </span>
                  <span className="text-xs font-black text-white">{selectedUserStats.totalPoints} Global Points</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                  {selectedUserStats.tier.description}
                </p>
              </div>

              {/* Milestone Rewards & Badge Unlocks Roadmap */}
              <div className="space-y-3 mb-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 border-b border-zinc-900 pb-1.5">
                  <Sparkles size={11} className="text-yellow-500" />
                  Milestones & Unlockable Rewards
                </h5>
                
                <div className="space-y-2.5">
                  {MILESTONE_REWARDS.map((milestone) => {
                    const isUnlocked = selectedUserStats.totalPoints >= milestone.pointsRequired;
                    return (
                      <div 
                        key={milestone.tierName}
                        className={`p-3 rounded-2xl border transition-all ${
                          isUnlocked 
                            ? 'bg-zinc-900/40 border-emerald-500/10 shadow-[inset_0_1px_20px_rgba(16,185,129,0.01)]' 
                            : 'bg-zinc-950/20 border-zinc-900/40 opacity-55'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-black uppercase tracking-wider ${isUnlocked ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                {milestone.tierName}
                              </span>
                              <span className="text-[9px] text-zinc-650">•</span>
                              <span className="text-[9px] font-bold text-zinc-400">{milestone.pointsRequired} PTS</span>
                            </div>
                            <h6 className={`text-xs font-black flex items-center gap-1 ${isUnlocked ? 'text-white' : 'text-zinc-400'}`}>
                              {milestone.badgeName}
                            </h6>
                          </div>

                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border ${
                            isUnlocked 
                              ? 'bg-emerald-950/30 border-emerald-500/25 text-emerald-400' 
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                          }`}>
                            {isUnlocked ? (
                              <>
                                <Check size={10} strokeWidth={3} />
                                Unlocked
                              </>
                            ) : (
                              <>
                                <Lock size={10} />
                                Locked
                              </>
                            )}
                          </span>
                        </div>

                        {/* Perks List */}
                        <div className="mt-2 pl-1 space-y-1 border-l border-zinc-900 ml-1">
                          {milestone.rewards.map((reward, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                              <div className={`w-1 h-1 rounded-full ${isUnlocked ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                              <span className={isUnlocked ? 'text-zinc-300' : 'text-zinc-500'}>{reward}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quantified stats details */}
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 px-1">Compiled Contributions</h4>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center bg-zinc-900/40 p-3 rounded-xl border border-zinc-900">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                    <Car size={13} className="text-zinc-500" />
                    <span>Cars in Garage ({selectedUserStats.stats.carsCount})</span>
                  </div>
                  <span className="text-xs font-black text-white">+{selectedUserStats.breakdown.cars} REP</span>
                </div>

                <div className="flex justify-between items-center bg-zinc-900/40 p-3 rounded-xl border border-zinc-900">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                    <Wrench size={13} className="text-zinc-500" />
                    <span>Mod Log Entries ({selectedUserStats.stats.buildLogsCount})</span>
                  </div>
                  <span className="text-xs font-black text-white">+{selectedUserStats.breakdown.logs} REP</span>
                </div>

                <div className="flex justify-between items-center bg-zinc-900/40 p-3 rounded-xl border border-zinc-900">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                    <PlusSquare size={13} className="text-zinc-500" />
                    <span>Media Posts ({selectedUserStats.stats.postsCount})</span>
                  </div>
                  <span className="text-xs font-black text-white">+{selectedUserStats.breakdown.posts} REP</span>
                </div>

                <div className="flex justify-between items-center bg-zinc-900/40 p-3 rounded-xl border border-zinc-900">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                    <MessageSquare size={13} className="text-zinc-500" />
                    <span>Comments ({selectedUserStats.stats.commentsCount})</span>
                  </div>
                  <span className="text-xs font-black text-white">+{selectedUserStats.breakdown.comments} REP</span>
                </div>

                <div className="flex justify-between items-center bg-zinc-900/40 p-3 rounded-xl border border-zinc-900">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                    <ThumbsUp size={13} className="text-zinc-500" />
                    <span>Helpful Feedback Received ({selectedUserStats.stats.helpfulVotesCount})</span>
                  </div>
                  <span className="text-xs font-black text-purple-400">+{selectedUserStats.breakdown.votes} REP</span>
                </div>
              </div>

              {/* Row trigger to view profile */}
              <button 
                onClick={() => {
                  setSelectedUserStats(null);
                  handleUserClick(selectedUserStats.uid);
                }}
                className="w-full py-3 bg-white text-black hover:bg-zinc-200 transition-all font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2"
              >
                <span>Navigate to Profile</span>
                <ExternalLink size={13} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
