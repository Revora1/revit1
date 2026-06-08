import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Garage } from './Garage';
import { DuoGarageView } from './DuoGarageView';
import { AddCarModal } from './AddCarModal';
import { EditProfileModal } from './EditProfileModal';
import { SettingsModal } from './SettingsModal';
import { Settings, LogOut, Grid, Play, MessageSquare, Heart, Layers, Share2, Award, Info, Sparkles, ThumbsUp, Lock, Unlock, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, UserProfile, Car, Comment } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, onSnapshot, doc, getDoc, deleteDoc, setDoc, updateDoc, increment, limit } from 'firebase/firestore';
import { PostCard } from './PostCard';

import { FollowListModal } from './FollowListModal';

function UserPosts({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(fetchedPosts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  const initialScrollDone = useRef(false);

  // Scroll to the index on open
  useEffect(() => {
    if (selectedPostIndex === null) {
      initialScrollDone.current = false;
    } else if (containerRef.current && !initialScrollDone.current) {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.clientHeight * selectedPostIndex;
          initialScrollDone.current = true;
        }
      }, 0);
    }
  }, [selectedPostIndex]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
    if (index !== selectedPostIndex) {
      setSelectedPostIndex(index);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500 font-medium">Loading...</div>;

  if (posts.length === 0) return <div className="p-8 text-center text-zinc-500 font-medium">No posts yet.</div>;

  return (
    <>
      <div className="grid grid-cols-3 gap-1 px-1 mt-2">
        {posts.map((post, index) => (
          <div 
            key={post.id} 
            className="relative aspect-[3/4] bg-zinc-900 group cursor-pointer overflow-hidden"
            onClick={() => setSelectedPostIndex(index)}
          >
            <img src={(post.mediaUrls && post.mediaUrls.length > 0) ? post.mediaUrls[0] : (post.mediaUrl || '')} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={post.caption} />
            {post.mediaUrls && post.mediaUrls.length > 1 && (
              <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-md rounded-lg">
                <Layers size={14} className="text-white" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 text-xs font-bold gap-1 text-white">
               <Heart size={12} fill="white" /> {post.likesCount || 0}
            </div>
          </div>
        ))}
      </div>

      {selectedPostIndex !== null && (
        <div className="fixed top-0 left-0 right-0 bottom-16 z-50 bg-black flex flex-col">
          <button 
            onClick={() => setSelectedPostIndex(null)}
            className="absolute top-6 left-4 z-50 p-2 bg-black/40 backdrop-blur-md rounded-full text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          
          <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          >
            {posts.map((post, index) => (
              <PostCard 
                key={post.id} 
                post={post} 
                isActive={index === selectedPostIndex} 
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

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

interface ProfileProps {
  userId?: string;
  username?: string;
  initialTab?: 'garage' | 'posts' | 'duo';
}

export function Profile({ userId: propUserId, username: propUsername, initialTab = 'garage' }: ProfileProps) {
  const { user: currentUser, profile: currentProfile, logout } = useAuth();
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'garage' | 'posts' | 'duo'>(initialTab);
  
  // Reputation states
  const [showRepDetails, setShowRepDetails] = useState(false);
  const [repData, setRepData] = useState({
    carsCount: 0,
    buildLogsCount: 0,
    commentsCount: 0,
    helpfulVotesCount: 0,
    postsCount: 0
  });
  const [showAddCar, setShowAddCar] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [followModalConfig, setFollowModalConfig] = useState<{ type: 'followers' | 'following', isOpen: boolean }>({ type: 'followers', isOpen: false });

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollower, setIsFollower] = useState(false);
  const [checkingFollow, setCheckingFollow] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleShareApp = async () => {
    if (sharing) return;
    setSharing(true);

    const shareData = {
      title: 'RevitUp',
      text: 'Join me on RevitUp - The Social Garage for Car Enthusiasts!',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      }
    } catch (error: any) {
      // Ignore AbortError (user cancelled)
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    } finally {
      setSharing(false);
    }
  };

  useEffect(() => {
    const resolveUser = async () => {
      if (propUserId) {
        setResolvedUserId(propUserId);
        return;
      }
      if (propUsername) {
        setLoading(true);
        try {
          const q = query(
            collection(db, 'users'),
            where('username', '==', propUsername),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            setResolvedUserId(snap.docs[0].id);
          } else {
            setResolvedUserId('not_found');
          }
        } catch (error) {
          console.error('Error resolving username:', error);
          setResolvedUserId('not_found');
        } finally {
          setLoading(false);
        }
      } else {
        setResolvedUserId(currentUser?.uid || null);
      }
    };
    resolveUser();
  }, [propUserId, propUsername, currentUser]);

  const isOwnProfile = !resolvedUserId || resolvedUserId === currentUser?.uid;
  const effectiveUserId = resolvedUserId;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [resolvedUserId, initialTab]);

  useEffect(() => {
    if (isOwnProfile) {
      setTargetProfile(currentProfile);
      setLoading(false);
    } else if (effectiveUserId && effectiveUserId !== 'not_found') {
      setLoading(true);
      const userRef = doc(db, 'users', effectiveUserId);
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          setTargetProfile(doc.data() as UserProfile);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${effectiveUserId}`);
        setLoading(false);
      });
      return unsubscribe;
    }
  }, [effectiveUserId, isOwnProfile, currentProfile]);

  useEffect(() => {
    const fetchPartner = async () => {
      if (targetProfile?.partnerId) {
        try {
          const pSnap = await getDoc(doc(db, 'users', targetProfile.partnerId));
          if (pSnap.exists()) {
            setPartnerProfile(pSnap.data() as UserProfile);
          }
        } catch (e) {
          console.error("Error fetching partner profile:", e);
        }
      } else {
        setPartnerProfile(null);
      }
    };
    fetchPartner();
  }, [targetProfile?.partnerId]);

  useEffect(() => {
    if (!effectiveUserId || effectiveUserId === 'not_found') return;

    // 1. Cars & build logs inside them
    const qCars = query(collection(db, 'garage'), where('ownerId', '==', effectiveUserId));
    const unsubCars = onSnapshot(qCars, (snap) => {
      const cars = snap.docs.map(doc => doc.data() as Car);
      const carsCount = cars.length;
      const buildLogsCount = cars.reduce((acc, c) => acc + (c.buildTimeline?.length || 0), 0);
      setRepData(prev => ({ ...prev, carsCount, buildLogsCount }));
    }, (error) => {
      console.error('Error fetching cars for rep:', error);
    });

    // 2. Comments made
    const qComments = query(collection(db, 'comments'), where('authorId', '==', effectiveUserId));
    const unsubComments = onSnapshot(qComments, (snap) => {
      setRepData(prev => ({ ...prev, commentsCount: snap.size }));
    }, (error) => {
      console.error('Error fetching comments for rep:', error);
    });

    // 3. Helpful votes received
    const qHelpful = query(collection(db, 'helpful_votes'), where('commentAuthorId', '==', effectiveUserId));
    const unsubHelpful = onSnapshot(qHelpful, (snap) => {
      setRepData(prev => ({ ...prev, helpfulVotesCount: snap.size }));
    }, (error) => {
      console.error('Error fetching helpful votes for rep:', error);
    });

    // 4. Posts made
    const qPosts = query(collection(db, 'posts'), where('authorId', '==', effectiveUserId));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      setRepData(prev => ({ ...prev, postsCount: snap.size }));
    }, (error) => {
      console.error('Error fetching posts for rep:', error);
    });

    return () => {
      unsubCars();
      unsubComments();
      unsubHelpful();
      unsubPosts();
    };
  }, [effectiveUserId]);

  const pointsFromCars = repData.carsCount * 20; // 20 points per car
  const pointsFromLogs = repData.buildLogsCount * 10; // 10 points per mod log entry
  const pointsFromComments = repData.commentsCount * 5; // 5 points per comment made
  const pointsFromVotes = repData.helpfulVotesCount * 15; // 15 points per helpful vote received
  const pointsFromPosts = repData.postsCount * 10; // 10 points per post shared

  const totalPoints = pointsFromCars + pointsFromLogs + pointsFromComments + pointsFromVotes + pointsFromPosts;

  useEffect(() => {
    if (isOwnProfile || !effectiveUserId || !currentUser) return;
    
    // Check if I follow them
    const myFollowRef = doc(db, 'follows', `${currentUser.uid}_${effectiveUserId}`);
    const unSubMyFollow = onSnapshot(myFollowRef, (snap) => {
      setIsFollowing(snap.exists());
    });

    // Check if they follow me
    const theirFollowRef = doc(db, 'follows', `${effectiveUserId}_${currentUser.uid}`);
    const unSubTheirFollow = onSnapshot(theirFollowRef, (snap) => {
      setIsFollower(snap.exists());
    });

    return () => {
      unSubMyFollow();
      unSubTheirFollow();
    };
  }, [effectiveUserId, isOwnProfile, currentUser]);

  const handleFollowClick = async () => {
    if (!currentUser || !effectiveUserId || checkingFollow) return;
    setCheckingFollow(true);
    const followId = `${currentUser.uid}_${effectiveUserId}`;
    const followRef = doc(db, 'follows', followId);
    const myRef = doc(db, 'users', currentUser.uid);
    const targetRef = doc(db, 'users', effectiveUserId);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        await updateDoc(myRef, { followingCount: increment(-1) });
        await updateDoc(targetRef, { followersCount: increment(-1) });
      } else {
        await setDoc(followRef, {
          followerId: currentUser.uid,
          followingId: effectiveUserId,
          createdAt: Date.now()
        });
        await updateDoc(myRef, { followingCount: increment(1) });
        await updateDoc(targetRef, { followersCount: increment(1) });
        
        // Notification
        const notifId = `${Date.now()}_${currentUser.uid}_follow_${effectiveUserId}`;
        await setDoc(doc(db, 'notifications', notifId), {
          userId: effectiveUserId,
          actorId: currentUser.uid,
          type: 'follow',
          read: false,
          createdAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'follows');
    } finally {
      setCheckingFollow(false);
    }
  };

  const handleMessageClick = async () => {
    if (!currentUser || !targetProfile || !effectiveUserId) return;
    
    try {
      // Find or create chat with deterministic ID
      const chatId1 = `${currentUser.uid}_${effectiveUserId}`;
      const chatId2 = `${effectiveUserId}_${currentUser.uid}`;
      
      const chatSnap1 = await getDoc(doc(db, 'chats', chatId1));
      let chatId = null;
      
      if (chatSnap1.exists()) {
        chatId = chatId1;
      } else {
        const chatSnap2 = await getDoc(doc(db, 'chats', chatId2));
        if (chatSnap2.exists()) {
          chatId = chatId2;
        } else {
          // Create new chat
          try {
            await setDoc(doc(db, 'chats', chatId1), {
              participantIds: [currentUser.uid, effectiveUserId],
              createdAt: Date.now(),
              lastMessageAt: Date.now(),
              lastMessage: '',
              lastSenderId: ''
            });
            chatId = chatId1;
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'chats');
            return;
          }
        }
      }
      
      window.dispatchEvent(new CustomEvent('navigate-chat', { 
        detail: { 
          chatId, 
          otherUser: { id: effectiveUserId, ...targetProfile } 
        } 
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'chats');
    }
  };

  if (loading) return (
    <div className="min-h-full bg-black flex items-center justify-center pb-20">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  if (effectiveUserId === 'not_found') return (
    <div className="min-h-full bg-black flex flex-col items-center justify-center pb-20 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-700 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h2 className="text-xl font-black uppercase italic tracking-tight mb-2">User Not Found</h2>
      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">The build or profile you're looking for doesn't exist.</p>
    </div>
  );

  if (!targetProfile) return null;

  return (
    <div className="min-h-full bg-black pb-20">
      {/* Header */}
      <div className="p-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] border-b border-zinc-900 bg-zinc-950/50 backdrop-blur sticky top-0 z-10 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             {!isOwnProfile && (
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate-back'))} 
                  className="p-1 -ml-1 text-zinc-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
             )}
             <h1 className="text-xl font-black italic tracking-tight uppercase">
               {targetProfile.username}
             </h1>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={handleShareApp}
                className="p-2 text-zinc-400 hover:text-white"
                title="Share App"
             >
                <Share2 size={20} />
             </button>
             {isOwnProfile ? (
               <>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-zinc-400 hover:text-white"
                >
                  <Settings size={20}/>
                </button>
                <button onClick={logout} className="p-2 text-zinc-400 hover:text-red-400">
                  <LogOut size={20}/>
                </button>
               </>
             ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleFollowClick}
                    disabled={checkingFollow}
                    className={`text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-transform ${
                      isFollowing 
                        ? 'bg-zinc-800 text-white border border-zinc-700' 
                        : 'bg-white text-black'
                    }`}
                  >
                    {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                  </button>
                  {!isOwnProfile && (
                    <button 
                      onClick={handleMessageClick}
                      className="p-2 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 transition-colors border border-zinc-800 active:scale-95 shadow-lg"
                    >
                      <MessageSquare size={18} />
                    </button>
                  )}
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-6 py-8 flex flex-col items-center space-y-6">
        <div className="w-24 h-24 rounded-full border-4 border-zinc-900 overflow-hidden bg-zinc-800">
           {targetProfile.profilePic ? (
             <img src={targetProfile.profilePic} className="w-full h-full object-cover" alt={targetProfile.username} />
           ) : (
             <div className="w-full h-full flex items-center justify-center text-zinc-600 text-3xl font-black">
               {targetProfile.username[0].toUpperCase()}
             </div>
           )}
        </div>

        <div className="text-center space-y-4 flex flex-col items-center animate-fade-in">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{targetProfile.username}</h2>
            <p className="text-sm text-zinc-500 max-w-[250px] mx-auto">{targetProfile.bio || "RevItUp enthusiast"}</p>
          </div>

          {/* Dynamic Reputation Badge */}
          <button
            onClick={() => setShowRepDetails(true)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer select-none bg-zinc-950/60 leading-none ${
              getCurrentTier(totalPoints).badgeColor
            }`}
          >
            <Award size={11} className="text-yellow-400 fill-yellow-400 animate-pulse" />
            <span>{getCurrentTier(totalPoints).name}</span>
            <span className="opacity-30">|</span>
            <span className="text-white font-black tracking-normal">{totalPoints} REP</span>
          </button>
        </div>

        {/* Action Button Area (EDIT PROFILE or FOLLOW & MESSAGE) - Rendered ABOVE stats */}
        <div className="w-full max-w-[240px] flex items-center justify-center gap-3">
          {isOwnProfile ? (
            <button 
              onClick={() => setShowEditProfile(true)}
              className="w-full h-11 border border-zinc-800 rounded-full font-bold text-sm bg-zinc-900/50 hover:bg-white hover:text-black transition-all active:scale-95"
            >
              EDIT PROFILE
            </button>
          ) : (
            <>
              <button 
                onClick={handleFollowClick}
                disabled={checkingFollow}
                className={`flex-1 h-11 text-xs font-bold rounded-full active:scale-95 transition-all ${
                  isFollowing 
                    ? 'bg-zinc-800 text-white border border-zinc-700' 
                    : 'bg-white text-black'
                }`}
              >
                {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
              </button>
              <button 
                onClick={handleMessageClick}
                className="w-11 h-11 bg-zinc-900 text-white rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors border border-zinc-800 active:scale-95 shadow-lg"
              >
                <MessageSquare size={18} />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-12 text-center pb-4 w-full justify-center">
          <button onClick={() => setFollowModalConfig({ type: 'followers', isOpen: true })} className="space-y-0.5 active:scale-95 transition-transform">
            <p className="text-lg font-black">{targetProfile.followersCount}</p>
            <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Followers</p>
          </button>
          <button onClick={() => setFollowModalConfig({ type: 'following', isOpen: true })} className="space-y-0.5 active:scale-95 transition-transform">
            <p className="text-lg font-black">{targetProfile.followingCount}</p>
            <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Following</p>
          </button>
          <div className="space-y-0.5">
            <p className="text-lg font-black">{targetProfile.garage?.length || 0}</p>
            <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Cars</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-900 sticky top-[72px] bg-black z-10 translate-y-[-1px]">
        <button 
          onClick={() => setActiveTab('garage')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'garage' ? 'border-white text-white' : 'border-transparent text-zinc-500'}`}
        >
          <Grid size={18} />
          <span className="text-xs font-black tracking-widest">GARAGE</span>
        </button>
        {targetProfile.partnerId && partnerProfile && (
           <button 
             onClick={() => setActiveTab('duo')}
             className={`flex-1 py-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'duo' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-500'}`}
           >
             <Heart size={18} fill={activeTab === 'duo' ? 'currentColor' : 'none'} />
             <span className="text-xs font-black tracking-widest">DUO</span>
           </button>
        )}
        <button 
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'posts' ? 'border-white text-white' : 'border-transparent text-zinc-500'}`}
        >
          <Play size={18} />
          <span className="text-xs font-black tracking-widest">POSTS</span>
        </button>
      </div>

      <div className="py-6">
        {activeTab === 'garage' ? (
          <Garage userId={effectiveUserId} isOwner={isOwnProfile} onAddCar={() => setShowAddCar(true)} />
        ) : activeTab === 'duo' && effectiveUserId && targetProfile.partnerId && partnerProfile ? (
          <DuoGarageView 
            userId1={effectiveUserId} 
            userId2={targetProfile.partnerId} 
            user1={targetProfile}
            user2={partnerProfile}
          />
        ) : (
          <UserPosts userId={effectiveUserId} />
        )}
      </div>

      {showAddCar && <AddCarModal onClose={() => setShowAddCar(false)} />}
      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-2"
          >
            <Share2 size={14} className="text-black" />
            Link Copied to Clipboard
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reputation Details Modal */}
      <AnimatePresence>
        {showRepDetails && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRepDetails(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110]"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="fixed inset-x-4 top-[8%] max-h-[84%] bg-zinc-950 border border-zinc-900 rounded-3xl z-[120] flex flex-col overflow-hidden max-w-md mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/40">
                <div className="flex items-center gap-2">
                  <Award size={20} className="text-yellow-400" />
                  <h3 className="font-black tracking-tight uppercase text-sm">Reputation Profile</h3>
                </div>
                <button 
                  onClick={() => setShowRepDetails(false)}
                  className="p-1 px-3 text-xs bg-zinc-900 text-zinc-400 hover:text-white rounded-full font-bold uppercase border border-zinc-800"
                >
                  Close
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 scroll-smooth">
                {/* Current Badge Hero */}
                <div className={`p-4 rounded-2xl border text-center ${getCurrentTier(totalPoints).badgeColor} flex flex-col items-center space-y-2`}>
                  <Sparkles size={24} className="text-yellow-400 animate-pulse" />
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest leading-none">{getCurrentTier(totalPoints).name}</h4>
                    <p className="text-xl font-black text-white mt-1.5">{totalPoints} <span className="text-[10px] text-zinc-405 uppercase tracking-widest font-bold">Points</span></p>
                  </div>
                  <p className="text-[10px] font-semibold leading-relaxed max-w-[280px] opacity-75">
                    "{getCurrentTier(totalPoints).description}"
                  </p>
                </div>

                {/* Progress to Next Tier */}
                {getNextTier(totalPoints) ? (
                  <div className="p-3.5 bg-zinc-900/30 border border-zinc-900 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-zinc-400">
                      <span>NEXT TIER: {getNextTier(totalPoints)?.name}</span>
                      <span>{totalPoints} / {getNextTier(totalPoints)?.pointsRequired} PTS</span>
                    </div>
                    {/* Progress Bar Container */}
                    <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-550 to-amber-400 rounded-full" 
                        style={{ width: `${Math.min(100, (totalPoints / (getNextTier(totalPoints)?.pointsRequired || 1)) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-center">
                      Need {Math.max(0, (getNextTier(totalPoints)?.pointsRequired || 0) - totalPoints)} more points to level up!
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 bg-zinc-950 border border-purple-500/20 rounded-2xl text-center space-y-1">
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">👑 MAXIMUM TIER REACHED</p>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">You have unlocked the peak of automotive builders!</p>
                  </div>
                )}

                {/* Milestone Rewards & Badge Unlocks Roadmap */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 border-b border-zinc-900 pb-1.5">
                    <Sparkles size={11} className="text-yellow-500" />
                    Milestones & Unlockable Rewards
                  </h5>
                  
                  <div className="space-y-2.5">
                    {MILESTONE_REWARDS.map((milestone) => {
                      const isUnlocked = totalPoints >= milestone.pointsRequired;
                      return (
                        <div 
                          key={milestone.tierName}
                          className={`p-3 rounded-2xl border transition-all ${
                            isUnlocked 
                              ? 'bg-zinc-900/45 border-emerald-500/10 shadow-[inset_0_1px_20px_rgba(16,185,129,0.01)]' 
                              : 'bg-zinc-950/20 border-zinc-900/40 opacity-55'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isUnlocked ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                  {milestone.tierName}
                                </span>
                                <span className="text-[9px] text-zinc-600">•</span>
                                <span className="text-[9px] font-bold text-zinc-400">{milestone.pointsRequired} PTS</span>
                              </div>
                              <h6 className={`text-xs font-black flex items-center gap-1 ${isUnlocked ? 'text-white' : 'text-zinc-400'}`}>
                                {milestone.badgeName}
                              </h6>
                            </div>

                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border ${
                              isUnlocked 
                                ? 'bg-emerald-950/30 border-emerald-500/25 text-emerald-400' 
                                : 'bg-zinc-900/60 border-zinc-805 text-zinc-500'
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

                {/* Point Breakdown */}
                <div className="space-y-2.5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 border-b border-zinc-900 pb-1.5">
                    <Award size={11} className="text-zinc-500" />
                    Live Reputation Breakdown
                  </h5>
                  
                  <div className="space-y-2 text-xs">
                    {/* Cars */}
                    <div className="flex justify-between items-center p-3 bg-zinc-900/20 border border-zinc-900/60 rounded-xl">
                      <div>
                        <div className="font-black uppercase tracking-wider text-[10px]">Shared Builds (Cars)</div>
                        <div className="text-[9px] text-zinc-500 font-bold uppercase">{repData.carsCount} cars registered</div>
                      </div>
                      <div className="font-extrabold pr-1 text-emerald-400">+{pointsFromCars}</div>
                    </div>

                    {/* Build Timeline Logs */}
                    <div className="flex justify-between items-center p-3 bg-zinc-900/20 border border-zinc-900/60 rounded-xl">
                      <div>
                        <div className="font-black uppercase tracking-wider text-[10px]">Timeline updates (Specs)</div>
                        <div className="text-[9px] text-zinc-500 font-bold uppercase">{repData.buildLogsCount} update logs shared</div>
                      </div>
                      <div className="font-extrabold pr-1 text-emerald-400">+{pointsFromLogs}</div>
                    </div>

                    {/* Posts */}
                    <div className="flex justify-between items-center p-3 bg-zinc-900/20 border border-zinc-900/60 rounded-xl">
                      <div>
                        <div className="font-black uppercase tracking-wider text-[10px]">Media Posts</div>
                        <div className="text-[9px] text-zinc-500 font-bold uppercase">{repData.postsCount} posts published</div>
                      </div>
                      <div className="font-extrabold pr-1 text-emerald-400">+{pointsFromPosts}</div>
                    </div>

                    {/* Comments */}
                    <div className="flex justify-between items-center p-3 bg-zinc-900/20 border border-zinc-900/60 rounded-xl">
                      <div>
                        <div className="font-black uppercase tracking-wider text-[10px]">Comments Posted</div>
                        <div className="text-[9px] text-zinc-500 font-bold uppercase">{repData.commentsCount} comments written</div>
                      </div>
                      <div className="font-extrabold pr-1 text-emerald-400">+{pointsFromComments}</div>
                    </div>

                    {/* Helpful upvotes */}
                    <div className="flex justify-between items-center p-3 bg-zinc-900/20 border border-zinc-900/60 rounded-xl">
                      <div>
                        <div className="font-black uppercase tracking-wider text-[10px]">Helpful Feedback Upvotes</div>
                        <div className="text-[9px] text-zinc-500 font-bold uppercase">{repData.helpfulVotesCount} upvotes received</div>
                      </div>
                      <div className="font-extrabold pr-1 text-emerald-400">+{pointsFromVotes}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FollowListModal 
        userId={effectiveUserId}
        type={followModalConfig.type}
        isOpen={followModalConfig.isOpen}
        onClose={() => setFollowModalConfig(prev => ({ ...prev, isOpen: false }))}
        onUserClick={(uid) => {
          window.dispatchEvent(new CustomEvent('navigate-profile', { detail: { userId: uid } }));
        }}
      />
    </div>
  );
}
