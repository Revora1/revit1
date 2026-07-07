import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Trash2, ThumbsUp } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc, increment, getDoc, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { sanitizeInput } from '../lib/utils';

interface Comment {
  id: string;
  authorId: string;
  postId: string;
  text: string;
  createdAt: number;
}

interface CommentsSheetProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface CommentItemProps {
  comment: Comment;
  onDelete: (id: string) => Promise<void> | void;
  currentUserId?: string;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onDelete, currentUserId }) => {
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [votes, setVotes] = useState<any[]>([]);

  useEffect(() => {
    const fetchAuthor = async () => {
      try {
        const docRef = doc(db, 'users', comment.authorId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAuthor(docSnap.data() as UserProfile);
        }
      } catch (error) {
        console.error('Error fetching author for comment:', error);
      }
    };
    fetchAuthor();
  }, [comment.authorId]);

  useEffect(() => {
    const q = query(
      collection(db, 'helpful_votes'), 
      where('commentId', '==', comment.id)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setVotes(snap.docs.map(doc => doc.data()));
    }, (err) => {
      console.error('Error listening to helpful votes:', err);
    });
    return unsubscribe;
  }, [comment.id]);

  const hasVoted = votes.some(v => v.voterId === currentUserId);
  const voteCount = votes.length;

  const handleToggleHelpful = async () => {
    if (!currentUserId) return;
    if (comment.authorId === currentUserId) return;
    const voteId = `${comment.id}_${currentUserId}`;
    try {
      if (hasVoted) {
        await deleteDoc(doc(db, 'helpful_votes', voteId));
      } else {
        await setDoc(doc(db, 'helpful_votes', voteId), {
          voterId: currentUserId,
          commentId: comment.id,
          commentAuthorId: comment.authorId,
          createdAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `helpful_votes/${voteId}`);
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
    <div className="flex gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
        {author?.profilePic && (
          <img src={author.profilePic} alt={author.username} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-black opacity-60">
          @{author?.username || `user_${comment.authorId.slice(0, 5)}`}
        </div>
        <p className="text-sm mt-0.5 break-words font-medium">{renderText(comment.text)}</p>
        
        {/* Helpfulness controls */}
        <div className="flex items-center gap-3 mt-2 select-none">
          <button
            onClick={handleToggleHelpful}
            disabled={comment.authorId === currentUserId}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
              hasVoted 
                ? 'bg-yellow-400 text-black border-yellow-400' 
                : comment.authorId === currentUserId
                  ? 'bg-zinc-800/40 text-zinc-500 border-transparent cursor-default'
                  : 'bg-zinc-800 text-zinc-400 border-white/5 hover:border-zinc-500 hover:text-white'
            }`}
          >
            <ThumbsUp size={10} className={hasVoted ? "fill-black" : ""} />
            <span>Helpful {voteCount > 0 ? `(${voteCount})` : ''}</span>
          </button>
          
          {comment.authorId === currentUserId && voteCount > 0 && (
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
              🎉 +{voteCount * 15} Rep
            </span>
          )}
        </div>
      </div>
      {currentUserId === comment.authorId && (
        <button 
          onClick={() => onDelete(comment.id)}
          className="text-red-500 opacity-50 hover:opacity-100 transition-opacity p-2 h-fit"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

export function CommentsSheet({ postId, isOpen, onClose }: CommentsSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const commentsContainerRef = React.useRef<HTMLDivElement>(null);
  const touchStartY = React.useRef(0);
  const touchCurrentY = React.useRef(0);
  const isAtTopOnStart = React.useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    
    if (commentsContainerRef.current) {
      isAtTopOnStart.current = commentsContainerRef.current.scrollTop <= 0;
    } else {
      isAtTopOnStart.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const deltaY = touchCurrentY.current - touchStartY.current;
    if (isAtTopOnStart.current && deltaY > 100) {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(fetchedComments);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });

    return unsubscribe;
  }, [postId, isOpen]);

  useEffect(() => {
    const handleCommentChange = async () => {
      const cursorPosition = inputRef.current?.selectionStart || 0;
      const textBeforeCursor = newComment.slice(0, cursorPosition);
      const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9._]*)$/);

      if (mentionMatch) {
        const searchTerm = mentionMatch[1];
        setMentionSearch(searchTerm);
        
        try {
          const usersRef = collection(db, 'users');
          const q = query(
            usersRef,
            where('usernameLower', '>=', searchTerm.toLowerCase()),
            where('usernameLower', '<=', searchTerm.toLowerCase() + '\uf8ff'),
            limit(5)
          );
          const snap = await getDocs(q);
          setSuggestedUsers(snap.docs.map(doc => doc.data() as UserProfile));
        } catch (error) {
          console.error('Error suggesting users:', error);
        }
      } else {
        setMentionSearch(null);
        setSuggestedUsers([]);
      }
    };

    handleCommentChange();
  }, [newComment]);

  const insertMention = (username: string) => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeMention = newComment.slice(0, cursorPosition).replace(/@([a-zA-Z0-9._]*)$/, `@${username} `);
    const textAfterMention = newComment.slice(cursorPosition);
    setNewComment(textBeforeMention + textAfterMention);
    setMentionSearch(null);
    setSuggestedUsers([]);
    // Refocus the input
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    const commentText = sanitizeInput(newComment.trim());
    const commentId = `${Date.now()}_${user.uid}`;
    
    try {
      await setDoc(doc(db, 'comments', commentId), {
        authorId: user.uid,
        postId: postId,
        text: commentText,
        createdAt: Date.now()
      });
      await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
      
      const postSnap = await getDoc(doc(db, 'posts', postId));
      let postAuthorId = '';
      if (postSnap.exists()) {
        postAuthorId = postSnap.data().authorId;
        if (postAuthorId !== user.uid) {
           const notifId = `${Date.now()}_${user.uid}_comment_${postId}`;
           await setDoc(doc(db, 'notifications', notifId), {
             userId: postAuthorId,
             actorId: user.uid,
             type: 'comment',
             postId: postId,
             read: false,
             createdAt: Date.now()
           });
        }
      }

      // Handle Mentions
      const mentions = commentText.match(/@([a-zA-Z0-9._]+)/g);
      if (mentions) {
        const uniqueMentions = Array.from(new Set(mentions.map(m => m.slice(1))));
        for (const username of uniqueMentions) {
          try {
            const uq = query(collection(db, 'users'), where('username', '==', username), limit(1));
            const usnap = await getDocs(uq);
            if (!usnap.empty) {
              const targetUserId = usnap.docs[0].id;
              // Don't notify yourself, and don't double notify if you are the post author (already got 'comment' notification)
              if (targetUserId !== user.uid && targetUserId !== postAuthorId) {
                const tagNotifId = `${Date.now()}_${user.uid}_tag_${targetUserId}_${postId}`;
                await setDoc(doc(db, 'notifications', tagNotifId), {
                  userId: targetUserId,
                  actorId: user.uid,
                  type: 'tag',
                  postId: postId,
                  message: 'tagged you in a comment',
                  read: false,
                  createdAt: Date.now()
                });
              }
            }
          } catch (err) {
            console.error('Error sending tag notification:', err);
          }
        }
      }

      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
      await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(-1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `comments/${commentId}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            onTouchStart={onClose}
            className="absolute inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(event, info) => {
              if (info.offset.y > 100 || info.velocity.y > 300) {
                onClose();
              }
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="absolute inset-x-0 bottom-0 top-[30%] bg-zinc-900 rounded-t-3xl z-50 flex flex-col"
          >
            {/* Grab/Drag Handle Bar */}
            <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing select-none">
              <div className="w-12 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-4 pb-4 pt-1 border-b border-white/10">
              <h3 className="font-bold text-lg">{comments.length} Comments</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div 
              ref={commentsContainerRef}
              className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4"
            >
              {loading ? (
                <div className="text-center text-zinc-500 py-4">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">Be the first to comment!</div>
              ) : (
                comments.map(comment => (
                  <CommentItem 
                    key={comment.id} 
                    comment={comment} 
                    onDelete={handleDelete} 
                    currentUserId={user?.uid} 
                  />
                ))
              )}
            </div>
            
            <div className="relative">
              <AnimatePresence>
                {mentionSearch !== null && suggestedUsers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 right-0 mx-4 mb-2 bg-zinc-800 rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-[60]"
                  >
                    {suggestedUsers.map(u => (
                      <button
                        key={u.uid}
                        onClick={() => insertMention(u.username)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700">
                          {u.profilePic && <img src={u.profilePic} alt={u.username} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">@{u.username}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{u.bio || u.username}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-zinc-800 rounded-full px-4 py-2 border-none outline-none focus:ring-1 focus:ring-white"
                />
                <button 
                  type="submit" 
                  disabled={!newComment.trim()}
                  className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center disabled:opacity-50"
                >
                  <Send size={18} className="-ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
