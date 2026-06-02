import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Garage } from './Garage';
import { DuoGarageView } from './DuoGarageView';
import { AddCarModal } from './AddCarModal';
import { EditProfileModal } from './EditProfileModal';
import { SettingsModal } from './SettingsModal';
import { Settings, LogOut, Grid, Play, MessageSquare, Heart, Layers, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, UserProfile } from '../types';
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

export function Profile({ userId: propUserId, username: propUsername }: { userId?: string, username?: string }) {
  const { user: currentUser, profile: currentProfile, logout } = useAuth();
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'garage' | 'posts' | 'duo'>('garage');
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
    setActiveTab('garage');
  }, [resolvedUserId]);

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
      <div className="p-6 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur sticky top-0 z-10 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             {!isOwnProfile && (
                <button 
                  onClick={() => window.history.back()} 
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

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{targetProfile.username}</h2>
          <p className="text-sm text-zinc-500 max-w-[250px] mx-auto">{targetProfile.bio || "RevItUp enthusiast"}</p>
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

        {isOwnProfile && (
          <button 
            onClick={() => setShowEditProfile(true)}
            className="w-full h-12 border border-zinc-800 rounded-full font-bold text-sm hover:bg-white hover:text-black transition-all"
          >
            EDIT PROFILE
          </button>
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
