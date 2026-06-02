import React, { useRef, useEffect, useState } from 'react';
import { Post, UserProfile, Car } from '../types';
import { Heart, MessageCircle, Share2, Music2, User, Check, Trash2, Plus, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, increment, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { CommentsSheet } from './CommentsSheet';

interface PostCardProps {
  post: Post;
  isActive: boolean;
  initialShowComments?: boolean;
}

const AUTHOR_CACHE: Record<string, UserProfile> = {};
const CAR_CACHE: Record<string, Car> = {};

export const PostCard: React.FC<PostCardProps> = React.memo(({ post, isActive, initialShowComments = false }) => {
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(initialShowComments);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [author, setAuthor] = useState<UserProfile | null>(AUTHOR_CACHE[post.authorId] || null);
  const [taggedCar, setTaggedCar] = useState<Car | null>(post.carTagId ? CAR_CACHE[post.carTagId] : null);
  const { user } = useAuth();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const mediaList = (post.mediaUrls && post.mediaUrls.length > 0) 
    ? post.mediaUrls 
    : (post.mediaUrl ? [post.mediaUrl] : []);

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'posts', post.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${post.id}`);
    }
  };

  const hasIncrementedView = useRef(false);

  useEffect(() => {
    if (isActive && !hasIncrementedView.current && user && user.uid !== post.authorId) {
      hasIncrementedView.current = true;
      const incrementView = async () => {
        try {
          const postRef = doc(db, 'posts', post.id);
          await updateDoc(postRef, {
            viewCount: increment(1)
          });
        } catch (error) {
          // Silent fail for views to avoid console spam
          console.error("Failed to increment view count", error);
        }
      };
      incrementView();
    }
  }, [isActive, post.id, user]);

  useEffect(() => {
    const fetchData = async () => {
      const tasks = [];

      // Like task
      if (user) {
        tasks.push((async () => {
          try {
            const likeId = `${user.uid}_${post.id}`;
            const likeSnap = await getDoc(doc(db, 'likes', likeId));
            setLiked(likeSnap.exists());
          } catch (e) {
            console.error('Like check failed', e);
          }
        })());
      }

      // Follow task
      if (user && user.uid !== post.authorId) {
        tasks.push((async () => {
          try {
            const followId = `${user.uid}_${post.authorId}`;
            const followSnap = await getDoc(doc(db, 'follows', followId));
            setIsFollowing(followSnap.exists());
          } catch (e) {
            console.error('Follow check failed', e);
          }
        })());
      }

      // Author task
      if (!AUTHOR_CACHE[post.authorId]) {
        tasks.push((async () => {
          try {
            const docSnap = await getDoc(doc(db, 'users', post.authorId));
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              AUTHOR_CACHE[post.authorId] = data;
              setAuthor(data);
            }
          } catch (e) {
            console.error('Author fetch failed', e);
          }
        })());
      } else if (!author) {
        setAuthor(AUTHOR_CACHE[post.authorId]);
      }

      // Car task
      if (post.carTagId && !CAR_CACHE[post.carTagId]) {
        tasks.push((async () => {
          try {
            const docSnap = await getDoc(doc(db, 'garage', post.carTagId!));
            if (docSnap.exists()) {
              const data = { id: docSnap.id, ...docSnap.data() } as Car;
              CAR_CACHE[post.carTagId!] = data;
              setTaggedCar(data);
            }
          } catch (e) {
             console.error('Car fetch failed', e);
          }
        })());
      } else if (post.carTagId && !taggedCar) {
        setTaggedCar(CAR_CACHE[post.carTagId]);
      }

      await Promise.all(tasks);
    };

    fetchData();
  }, [post.id, post.authorId, post.carTagId, user]);

  const handleLike = async () => {
    if (!user) return;
    const likeId = `${user.uid}_${post.id}`;
    const likeRef = doc(db, 'likes', likeId);
    const postRef = doc(db, 'posts', post.id);

    try {
      if (liked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
        setLiked(false);
      } else {
        await setDoc(likeRef, {
          userId: user.uid,
          postId: post.id,
          createdAt: Date.now()
        });
        await updateDoc(postRef, { likesCount: increment(1) });
        setLiked(true);
        if (post.authorId !== user.uid) {
          const notifId = `${Date.now()}_${user.uid}_like_${post.id}`;
          await setDoc(doc(db, 'notifications', notifId), {
            userId: post.authorId,
            actorId: user.uid,
            type: 'like',
            postId: post.id,
            read: false,
            createdAt: Date.now()
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'likes');
    }
  };

  const handleFollow = async () => {
    if (!user || user.uid === post.authorId || isFollowingLoading) return;
    setIsFollowingLoading(true);
    const followId = `${user.uid}_${post.authorId}`;
    const followRef = doc(db, 'follows', followId);
    
    const currentUserRef = doc(db, 'users', user.uid);
    const authorRef = doc(db, 'users', post.authorId);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        await updateDoc(currentUserRef, { followingCount: increment(-1) });
        await updateDoc(authorRef, { followersCount: increment(-1) });
        setIsFollowing(false);
      } else {
        await setDoc(followRef, {
          followerId: user.uid,
          followingId: post.authorId,
          createdAt: Date.now()
        });
        await updateDoc(currentUserRef, { followingCount: increment(1) });
        await updateDoc(authorRef, { followersCount: increment(1) });
        setIsFollowing(true);
        const notifId = `${Date.now()}_${user.uid}_follow_${post.authorId}`;
        await setDoc(doc(db, 'notifications', notifId), {
          userId: post.authorId,
          actorId: user.uid,
          type: 'follow',
          read: false,
          createdAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `follows/${followId}`);
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    const index = Math.round(scrollLeft / width);
    if (index !== currentMediaIndex) {
      setCurrentMediaIndex(index);
    }
  };

  const renderText = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9._]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <button
            key={i}
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-profile', { detail: { userId: null, username: part.slice(1) } }))}
            className="text-blue-400 font-bold hover:underline"
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <article className="h-full w-full relative bg-zinc-900 snap-start snap-always flex items-center justify-center overflow-hidden flex-shrink-0">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      >
        {mediaList.map((url, idx) => (
          <div key={idx} className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
            <img
              src={url}
              className="h-full w-full object-contain"
              alt={`${post.caption} - ${idx + 1}`}
            />
          </div>
        ))}
      </div>

      {/* Carousel Numeric Indicator */}
      {mediaList.length > 1 && (
        <div className="absolute top-24 left-36 z-30">
          <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white border border-white/10 tracking-[0.2em] shadow-xl whitespace-nowrap">
            {currentMediaIndex + 1}/{mediaList.length}
          </div>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-16 flex flex-col items-center gap-4 z-20 select-none">
        <div className="flex flex-col items-center gap-0.5 group flex-shrink-0">
          <button
            onClick={handleLike}
            className={`w-10 h-10 bg-black/25 backdrop-blur-md rounded-full flex items-center justify-center active:scale-95 transition-all group-hover:bg-black/40 border shadow-lg ${
              liked ? 'border-red-500/50 shadow-red-500/20' : 'border-white/10 shadow-black/50'
            }`}
          >
            <motion.div
              animate={liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Heart 
                size={22} 
                fill={liked ? '#ef4444' : 'transparent'} 
                className={liked ? 'text-red-500' : 'text-white'} 
                strokeWidth={liked ? 0 : 2} 
              />
            </motion.div>
          </button>
          <span className={`text-[10px] font-bold tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] transition-colors ${
            liked ? 'text-red-500' : 'text-white'
          }`}>
            {post.likesCount}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5 group flex-shrink-0">
          <div className="w-10 h-10 bg-black/25 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-lg">
            <Eye size={22} className="text-white/60" />
          </div>
          <span className="text-[10px] font-bold text-white/60 tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{post.viewCount || 0}</span>
        </div>

        <button 
          disabled={isSharing}
          onClick={async () => {
            if (isSharing) return;
            setIsSharing(true);
            try {
              if (navigator.share) {
                await navigator.share({
                  title: 'RevItUp Post',
                  text: post.caption,
                  url: window.location.href,
                });
              } else {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            } catch (err: any) {
              console.error('Error sharing:', err);
              // Fallback if sharing fails and it's not a user cancellation
              if (err.name !== 'AbortError') {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch (clipErr) {
                  console.error('Clipboard failed:', clipErr);
                }
              }
            } finally {
              setIsSharing(false);
            }
          }}
          className="w-10 h-10 bg-black/25 backdrop-blur-md rounded-full flex items-center justify-center active:scale-95 transition-all group-hover:bg-black/40 border border-white/10 shadow-lg disabled:opacity-50 flex-shrink-0"
        >
          {copied ? <Check size={20} className="text-green-400" /> : <Share2 size={20} className="text-white" />}
        </button>

        {user?.uid === post.authorId && (
          <button 
            onClick={() => {
              if (showDeleteConfirm) {
                handleDelete();
              } else {
                setShowDeleteConfirm(true);
                setTimeout(() => setShowDeleteConfirm(false), 3000);
              }
            }}
            className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center active:scale-95 transition-all group-hover:bg-red-500/20 text-white shadow-lg flex-shrink-0 ${showDeleteConfirm ? 'bg-red-600' : 'bg-black/25 text-red-500 border border-white/10'}`}
          >
            {showDeleteConfirm ? <X size={20} /> : <Trash2 size={20} />}
          </button>
        )}

        {/* User Profile Hook */}
        <div className="relative w-10 h-12 flex flex-col items-center flex-shrink-0 mb-2 mt-1">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-profile', { detail: { userId: post.authorId } }))}
            className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-zinc-800 flex items-center justify-center relative active:scale-95 transition-transform"
          >
            {author?.profilePic ? (
              <img src={author.profilePic} className="w-full h-full object-cover" alt={author.username} />
            ) : (
              <User size={24} className="text-zinc-600"/>
            )}
          </button>
          {user && user.uid !== post.authorId && (
            <button
              onClick={handleFollow}
              disabled={isFollowingLoading}
              className={`absolute -bottom-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-lg active:scale-95 ${
                isFollowing 
                  ? 'bg-zinc-800 text-white border border-zinc-700' 
                  : 'bg-red-500 text-white'
              }`}
            >
              {isFollowing ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
            </button>
          )}
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-6 left-4 right-20 space-y-3 z-10">
        <div className="flex flex-wrap items-center gap-2">
           <button 
             onClick={() => window.dispatchEvent(new CustomEvent('navigate-profile', { detail: { userId: post.authorId } }))}
             className="font-bold text-lg hover:underline active:opacity-70 transition-all text-white"
           >
             @{author?.username || `user_${post.authorId.slice(0, 5)}`}
           </button>
           {taggedCar && (
             <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] font-bold tracking-tight text-white">#{taggedCar.make} {taggedCar.model}</span>
           )}
        </div>
        <p className="text-sm text-zinc-200 max-h-32 overflow-y-auto scrollbar-hide break-words">
          {renderText(post.caption)}
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Music2 size={12} className="animate-pulse" />
          <span className="truncate max-w-[200px]">Original Sound - Exhaust Note Vol. 1</span>
        </div>
      </div>

      <CommentsSheet 
        postId={post.id} 
        isOpen={showComments} 
        onClose={() => setShowComments(false)} 
      />
    </article>
  );
});
