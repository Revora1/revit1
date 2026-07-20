import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Garage } from './Garage';
import { DuoGarageView } from './DuoGarageView';
import { AddCarModal } from './AddCarModal';
import { EditProfileModal } from './EditProfileModal';
import { Settings, LogOut, Grid, Play, MessageSquare, Heart, Layers, Share2, Award, Info, Sparkles, ThumbsUp, Lock, Unlock, Check, MoreVertical, Flag, UserX, RefreshCw, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, UserProfile, Car, Comment } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, onSnapshot, doc, getDoc, deleteDoc, setDoc, updateDoc, increment, limit, getCountFromServer } from 'firebase/firestore';
import { PostCard } from './PostCard';
import { ReportModal } from './ReportModal';
import { Capacitor } from '@capacitor/core';

import { FollowListModal } from './FollowListModal';
import { copyToClipboard } from '../lib/utils';

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
  const { 
    user: currentUser, 
    profile: currentProfile, 
    logout,
    blockedUserIds,
    myBlockedIds,
    blockUser,
    unblockUser
  } = useAuth();
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'garage' | 'posts' | 'duo'>(initialTab);

  // Pull to refresh states
  const [refreshKey, setRefreshKey] = useState(0);
  const [pullOffset, setPullOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const pullStarted = useRef(false);



  const refreshAllProfileData = async () => {
    if (!resolvedUserId || resolvedUserId === 'not_found') return;
    try {
      // 1. Fetch user profile document manually
      const userRef = doc(db, 'users', resolvedUserId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        setTargetProfile(docSnap.data() as UserProfile);
      }

      // 2. Fetch partner profile
      const currentTarget = docSnap.exists() ? docSnap.data() as UserProfile : targetProfile;
      if (currentTarget?.partnerId) {
        const pSnap = await getDoc(doc(db, 'users', currentTarget.partnerId));
        if (pSnap.exists()) {
          setPartnerProfile(pSnap.data() as UserProfile);
        }
      }

      // 3. If isOwner, fetch ownerStats
      if (resolvedUserId === currentUser?.uid && currentUser?.email?.toLowerCase() === 'tonyang11552883@gmail.com') {
        const [usersCountSnap, garageCountSnap, postsCountSnap] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'garage')),
          getCountFromServer(collection(db, 'posts'))
        ]);
        setOwnerStats({
          usersCount: usersCountSnap.data().count,
          carsCount: garageCountSnap.data().count,
          postsCount: postsCountSnap.data().count
        });
      }

      // 4. Force refresh nested tabs
      setRefreshKey(prev => prev + 1);

    } catch (err) {
      console.error("Error manual refreshing profile data:", err);
    }
  };

  const [showSafetyMenu, setShowSafetyMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blockingInProgress, setBlockingInProgress] = useState(false);
  
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
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [followModalConfig, setFollowModalConfig] = useState<{ type: 'followers' | 'following', isOpen: boolean }>({ type: 'followers', isOpen: false });

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollower, setIsFollower] = useState(false);
  const [checkingFollow, setCheckingFollow] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Link Copied to Clipboard");
  const [sharing, setSharing] = useState(false);

  const handleShareApp = async () => {
    if (sharing || !targetProfile) return;
    setSharing(true);

    const profileUrl = `${window.location.origin}?u=${targetProfile.username}`;
    const shareData = {
      title: `RevItUp - @${targetProfile.username}`,
      text: isOwnProfile 
        ? `Check out my garage and build specs on RevItUp!` 
        : `Check out @${targetProfile.username}'s garage and build specs on RevItUp!`,
      url: profileUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const success = await copyToClipboard(profileUrl);
        if (success) {
          setToastMessage(isOwnProfile ? "Personal profile link copied!" : "Profile link copied!");
          setShowShareToast(true);
          setTimeout(() => setShowShareToast(false), 2500);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.warn('Navigator.share failed inside sandbox, trying copy fallback...', error);
        const success = await copyToClipboard(profileUrl);
        if (success) {
          setToastMessage(isOwnProfile ? "Personal profile link copied!" : "Profile link copied!");
          setShowShareToast(true);
          setTimeout(() => setShowShareToast(false), 2500);
        }
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

  const isOwner = isOwnProfile && currentUser?.email?.toLowerCase() === 'tonyang11552883@gmail.com';
  const [ownerStats, setOwnerStats] = useState<{ usersCount: number; carsCount: number; postsCount: number } | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    
    let active = true;
    const fetchCounts = async () => {
      try {
        const [usersCountSnap, garageCountSnap, postsCountSnap] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'garage')),
          getCountFromServer(collection(db, 'posts'))
        ]);
        if (!active) return;
        setOwnerStats({
          usersCount: usersCountSnap.data().count,
          carsCount: garageCountSnap.data().count,
          postsCount: postsCountSnap.data().count
        });
      } catch (err) {
        console.error("Error fetching owner console stats:", err);
      }
    };

    fetchCounts();
    return () => {
      active = false;
    };
  }, [isOwner]);

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
  }, [effectiveUserId, isOwnProfile, currentProfile, refreshKey]);

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
  }, [targetProfile?.partnerId, refreshKey]);

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
  }, [effectiveUserId, refreshKey]);

  const pointsFromCars = repData.carsCount * 20; // 20 points per car
  const pointsFromLogs = repData.buildLogsCount * 10; // 10 points per mod log entry
  const pointsFromComments = repData.commentsCount * 5; // 5 points per comment made
  const pointsFromVotes = repData.helpfulVotesCount * 15; // 15 points per helpful vote received
  const pointsFromPosts = repData.postsCount * 10; // 10 points per post shared
  const pointsFromAdMob = (targetProfile as any)?.reputationBonus || 0;

  const totalPoints = pointsFromCars + pointsFromLogs + pointsFromComments + pointsFromVotes + pointsFromPosts + pointsFromAdMob;

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

  const handleBlockAction = async () => {
    if (!effectiveUserId || blockingInProgress) return;
    setBlockingInProgress(true);
    try {
      const isBlocked = myBlockedIds?.includes(effectiveUserId) || false;
      if (isBlocked) {
        await unblockUser(effectiveUserId);
      } else {
        await blockUser(effectiveUserId);
      }
      setShowBlockConfirm(false);
    } catch (err) {
      console.error('Error block/unblock user:', err);
    } finally {
      setBlockingInProgress(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [role="button"]')) {
      return;
    }
    const scrollContainer = document.querySelector('main.overflow-y-auto') || document.documentElement;
    if (scrollContainer && scrollContainer.scrollTop === 0 && !refreshing) {
      pullStartY.current = e.clientY;
      pullStarted.current = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pullStarted.current || refreshing) return;
    const currentY = e.clientY;
    const deltaY = currentY - pullStartY.current;
    
    const scrollContainer = document.querySelector('main.overflow-y-auto') || document.documentElement;
    if (deltaY > 0 && scrollContainer && scrollContainer.scrollTop === 0) {
      const dampened = Math.min(80, deltaY * 0.45);
      setPullOffset(dampened);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pullStarted.current) return;
    pullStarted.current = false;

    if (pullOffset >= 50) {
      setRefreshing(true);
      setPullOffset(50);
      
      refreshAllProfileData().finally(() => {
        setTimeout(() => {
          setRefreshing(false);
          setPullOffset(0);
        }, 800);
      });
    } else {
      setPullOffset(0);
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
    <div 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative min-h-full bg-black pb-20 select-none touch-pan-y"
      style={{
        transform: `translateY(${pullOffset}px)`,
        transition: pullStarted.current ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Pull down to refresh indicator */}
      {(pullOffset > 0 || refreshing) && (
        <div 
          className="absolute left-0 right-0 z-[100] flex justify-center pointer-events-none"
          style={{ 
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            transform: `translateY(${Math.min(100, pullOffset * 0.9)}px)`,
            opacity: Math.min(1, pullOffset / 30)
          }}
        >
          <div className="bg-white/95 backdrop-blur-xl border border-zinc-200/80 px-4 py-1.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.15)] flex items-center gap-2">
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: pullOffset * 6 }}
              transition={refreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0 }}
            >
              <RefreshCw size={12} className={refreshing ? "text-red-500 animate-spin" : "text-red-500"} />
            </motion.div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-800 font-mono">
              {refreshing ? "TUNING SYNCS..." : pullOffset >= 50 ? "RELEASE TO SYNC" : "PULL TO REFRESH"}
            </span>
          </div>
        </div>
      )}
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
             {!isOwnProfile && (
               <div className="relative">
                 <button 
                   onClick={() => setShowSafetyMenu(!showSafetyMenu)}
                   className="p-2 text-zinc-400 hover:text-white active:scale-95 transition-transform"
                   title="Safety options"
                 >
                   <MoreVertical size={20} />
                 </button>
                 
                 <AnimatePresence>
                   {showSafetyMenu && (
                     <>
                       <div className="fixed inset-0 z-40" onClick={() => setShowSafetyMenu(false)} />
                       <motion.div
                         initial={{ opacity: 0, scale: 0.95, y: 10 }}
                         animate={{ opacity: 1, scale: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.95, y: 10 }}
                         className="absolute right-0 top-10 w-44 bg-zinc-950 border border-zinc-850 rounded-2xl shadow-2xl overflow-hidden z-50 p-1.5"
                       >
                         <button
                           onClick={() => {
                             setShowSafetyMenu(false);
                             setShowReportModal(true);
                           }}
                           className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors rounded-xl"
                         >
                           <Flag size={14} className="text-zinc-500" />
                           Report User
                         </button>
                         <button
                           onClick={() => {
                             setShowSafetyMenu(false);
                             setShowBlockConfirm(true);
                           }}
                           className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors rounded-xl"
                         >
                           <UserX size={14} className="text-zinc-500" />
                           {myBlockedIds?.includes(effectiveUserId || '') ? 'Unblock User' : 'Block User'}
                         </button>
                       </motion.div>
                     </>
                   )}
                 </AnimatePresence>
               </div>
             )}
             {isOwnProfile ? (
               <>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
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

      {effectiveUserId && blockedUserIds?.includes(effectiveUserId) ? (
        <div className="px-6 py-24 flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20 shadow-lg">
            <UserX size={26} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black uppercase italic tracking-tight text-zinc-100">User Blocked</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed font-medium">
              You have blocked @{targetProfile?.username || 'this user'}. You cannot view their garage, duo status, or posts.
            </p>
          </div>
          <button
            onClick={() => setShowBlockConfirm(true)}
            className="px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-all active:scale-95 shadow-xl"
          >
            UNBLOCK USER
          </button>
        </div>
      ) : (
        <>
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
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => setShowEditProfile(true)}
                    className="flex-1 h-11 border border-zinc-800 rounded-full font-bold text-sm bg-zinc-900/50 hover:bg-white hover:text-black transition-all active:scale-95"
                  >
                    EDIT PROFILE
                  </button>
                  <button 
                    onClick={handleShareApp}
                    className="w-11 h-11 border border-zinc-800 rounded-full bg-zinc-900/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all active:scale-95 shadow-lg"
                    title="Share Personal Profile Link"
                  >
                    <Share2 size={18} />
                  </button>
                </div>
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

            {/* Owner Analytics Console */}
            {isOwner && ownerStats && (
              <div className="w-full max-w-xs p-4 rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-yellow-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                    </span>
                    <p className="text-[9px] font-black text-yellow-500 tracking-widest uppercase">Owner Console</p>
                  </div>
                  <span className="text-[7px] font-black bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded uppercase tracking-wider border border-yellow-500/20">Active</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/60 text-center">
                    <p className="text-[7.5px] font-black text-zinc-500 tracking-wider uppercase mb-0.5">Joined</p>
                    <p className="text-sm font-black text-white italic tracking-tighter">{ownerStats.usersCount}</p>
                  </div>
                  <div className="bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/60 text-center">
                    <p className="text-[7.5px] font-black text-zinc-500 tracking-wider uppercase mb-0.5">Garages</p>
                    <p className="text-sm font-black text-white italic tracking-tighter">{ownerStats.carsCount}</p>
                  </div>
                  <div className="bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/60 text-center">
                    <p className="text-[7.5px] font-black text-zinc-500 tracking-wider uppercase mb-0.5">Logs</p>
                    <p className="text-sm font-black text-white italic tracking-tighter">{ownerStats.postsCount}</p>
                  </div>
                </div>
              </div>
            )}
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
              <Garage key={`garage_${effectiveUserId}_${refreshKey}`} userId={effectiveUserId} isOwner={isOwnProfile} onAddCar={() => setShowAddCar(true)} />
            ) : activeTab === 'duo' && effectiveUserId && targetProfile.partnerId && partnerProfile ? (
              <DuoGarageView 
                key={`duo_${effectiveUserId}_${refreshKey}`}
                userId1={effectiveUserId} 
                userId2={targetProfile.partnerId} 
                user1={targetProfile}
                user2={partnerProfile}
              />
            ) : (
              <UserPosts key={`posts_${effectiveUserId}_${refreshKey}`} userId={effectiveUserId} />
            )}
          </div>
        </>
      )}

      {showAddCar && <AddCarModal onClose={() => setShowAddCar(false)} />}
      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
      
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-2"
          >
            <Share2 size={14} className="text-black" />
            {toastMessage}
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

      {/* Block Confirmation Modal */}
      <AnimatePresence>
        {showBlockConfirm && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]" onClick={() => setShowBlockConfirm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-zinc-950 border border-zinc-900 rounded-[32px] p-6 shadow-2xl z-[120] space-y-6"
            >
              <div className="text-center space-y-2">
                <h3 className="text-lg font-black uppercase italic tracking-tight">
                  {myBlockedIds?.includes(effectiveUserId || '') ? 'Unblock User?' : 'Block User?'}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  {myBlockedIds?.includes(effectiveUserId || '')
                    ? "Unblocking this user will allow them to view your shared builds, duo status, and posts again."
                    : "Blocking this user will prevent them from seeing your builds, posts, or messaging you. You will also not see their content in your feed."}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBlockConfirm(false)}
                  className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold rounded-2xl transition-all active:scale-95 text-zinc-300"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleBlockAction}
                  disabled={blockingInProgress}
                  className="flex-1 py-3.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {blockingInProgress ? 'PROCESSING...' : myBlockedIds?.includes(effectiveUserId || '') ? 'UNBLOCK' : 'BLOCK'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetId={effectiveUserId || ''}
        targetType="user"
      />
    </div>
  );
}
