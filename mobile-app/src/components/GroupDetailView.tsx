import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, orderBy, onSnapshot, getDoc, deleteDoc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Group, GroupMember, Post, UserProfile } from '../types';
import { ArrowLeft, Users, Shield, User, Plus, MoreVertical, Trash2, Check, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PostCard } from './PostCard';
import { UploadView } from './UploadView';

interface GroupDetailViewProps {
  groupId: string;
  onBack: () => void;
  onNavigateProfile: (uid: string) => void;
}

export function GroupDetailView({ groupId, onBack, onNavigateProfile }: GroupDetailViewProps) {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'pending' | 'requests' | 'blocked'>('posts');
  
  const [posts, setPosts] = useState<(Post & { authorProfile?: UserProfile })[]>([]);
  const [pendingPosts, setPendingPosts] = useState<(Post & { authorProfile?: UserProfile })[]>([]);
  const [members, setMembers] = useState<(GroupMember & { profile?: UserProfile })[]>([]);
  
  const [showUpload, setShowUpload] = useState(false);
  
  useEffect(() => {
    if (!groupId) return;
    const unsubGroup = onSnapshot(doc(db, 'groups', groupId), (snap) => {
      if (snap.exists()) {
        const g = { id: snap.id, ...snap.data() } as Group;
        setGroup(g);
        if (user) {
          setIsAdmin(g.adminId === user.uid);
        }
      } else {
        onBack();
      }
    });

    return () => unsubGroup();
  }, [groupId, user]);

  useEffect(() => {
    if (!user || !groupId) return;
    const unsubMember = onSnapshot(doc(db, 'groupMembers', `${groupId}_${user.uid}`), (snap) => {
      setIsMember(snap.exists());
    });
    return () => unsubMember();
  }, [groupId, user]);

  // Load Posts
  useEffect(() => {
    if (!groupId) return;
    const qPosts = query(
      collection(db, 'posts'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );
    
    const unsub = onSnapshot(qPosts, async (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as Post));
      
      const approved = fetched.filter(p => p.groupStatus === 'approved');
      const pending = fetched.filter(p => p.groupStatus === 'pending');
      
      // Fetch authors
      const authorsMap: Record<string, UserProfile> = {};
      const loadAuthors = async (postList: Post[]) => {
        for (const p of postList) {
          if (!authorsMap[p.authorId]) {
            const uSnap = await getDoc(doc(db, 'users', p.authorId));
            if (uSnap.exists()) {
              authorsMap[p.authorId] = { uid: uSnap.id, ...uSnap.data() } as UserProfile;
            }
          }
        }
      };
      
      await loadAuthors(approved);
      await loadAuthors(pending);
      
      setPosts(approved.map(p => ({ ...p, authorProfile: authorsMap[p.authorId] })));
      setPendingPosts(pending.map(p => ({ ...p, authorProfile: authorsMap[p.authorId] })));
    });

    return () => unsub();
  }, [groupId]);

  const [requestProfiles, setRequestProfiles] = useState<UserProfile[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<UserProfile[]>([]);
  const hasRequested = user && group?.joinRequests?.includes(user.uid);
  const isBlocked = user && group?.blockedUsers?.includes(user.uid);

  // Load Blocked Users
  useEffect(() => {
    if (!group?.blockedUsers || group.blockedUsers.length === 0 || activeTab !== 'blocked') {
      setBlockedProfiles([]);
      return;
    }
    const loadBlocked = async () => {
      const profiles = await Promise.all(group.blockedUsers!.map(async uid => {
        const uSnap = await getDoc(doc(db, 'users', uid));
        return uSnap.exists() ? { uid: uSnap.id, ...uSnap.data() } as UserProfile : null;
      }));
      setBlockedProfiles(profiles.filter(p => p !== null) as UserProfile[]);
    };
    loadBlocked();
  }, [group?.blockedUsers, activeTab]);

  // Load Join Requests
  useEffect(() => {
    if (!group?.joinRequests || group.joinRequests.length === 0 || activeTab !== 'requests') {
      setRequestProfiles([]);
      return;
    }
    const loadRequests = async () => {
      const profiles = await Promise.all(group.joinRequests!.map(async uid => {
        const uSnap = await getDoc(doc(db, 'users', uid));
        return uSnap.exists() ? { uid: uSnap.id, ...uSnap.data() } as UserProfile : null;
      }));
      setRequestProfiles(profiles.filter(p => p !== null) as UserProfile[]);
    };
    loadRequests();
  }, [group?.joinRequests, activeTab]);

  // Load Members
  useEffect(() => {
    if (!groupId || activeTab !== 'members') return;
    const qMembers = query(collection(db, 'groupMembers'), where('groupId', '==', groupId));
    const unsub = onSnapshot(qMembers, async (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupMember));
      
      const membersWithProfile = await Promise.all(fetched.map(async m => {
        const uSnap = await getDoc(doc(db, 'users', m.userId));
        return {
          ...m,
          profile: uSnap.exists() ? { uid: uSnap.id, ...uSnap.data() } as UserProfile : undefined
        };
      }));
      setMembers(membersWithProfile);
    });
    return () => unsub();
  }, [groupId, activeTab]);

  const handleJoin = async () => {
    if (!user || !group) return;
    if (group.isPrivate) {
      try {
        await updateDoc(doc(db, 'groups', groupId), {
          joinRequests: arrayUnion(user.uid)
        });
      } catch (e) {
        console.error(e);
        handleFirestoreError(e, OperationType.UPDATE, 'groups');
      }
      return;
    }
    try {
      await setDoc(doc(db, 'groupMembers', `${groupId}_${user.uid}`), {
        groupId,
        userId: user.uid,
        role: 'member',
        createdAt: Date.now()
      });
      await updateDoc(doc(db, 'groups', groupId), { memberCount: increment(1) });
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.WRITE, 'groupMembers');
    }
  };

  const handleCancelRequest = async () => {
    if (!user || !group) return;
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        joinRequests: arrayRemove(user.uid)
      });
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.UPDATE, 'groups');
    }
  };

  const handleAcceptRequest = async (requestUid: string) => {
    try {
      await setDoc(doc(db, 'groupMembers', `${groupId}_${requestUid}`), {
        groupId,
        userId: requestUid,
        role: 'member',
        createdAt: Date.now()
      });
      await updateDoc(doc(db, 'groups', groupId), { 
        memberCount: increment(1),
        joinRequests: arrayRemove(requestUid)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDenyRequest = async (requestUid: string) => {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        joinRequests: arrayRemove(requestUid)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleBlockUser = async (targetUid: string) => {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        blockedUsers: arrayUnion(targetUid)
      });
      // Try to remove them from members if they are one
      await deleteDoc(doc(db, 'groupMembers', `${groupId}_${targetUid}`));
      await updateDoc(doc(db, 'groups', groupId), { memberCount: increment(-1) });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnblockUser = async (targetUid: string) => {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        blockedUsers: arrayRemove(targetUid)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeave = async () => {
    if (!user || !group) return;
    if (isAdmin) {
      console.warn("As the admin, you cannot leave the group. You can delete the group instead.");
      return;
    }
    try {
      await deleteDoc(doc(db, 'groupMembers', `${groupId}_${user.uid}`));
      await updateDoc(doc(db, 'groups', groupId), { memberCount: increment(-1) });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGroup = async () => {
    if (!user || !group || !isAdmin) return;
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      const q = query(collection(db, 'groupMembers'), where('groupId', '==', groupId));
      const snapshot = await getDocs(q);
      snapshot.forEach((d) => {
        deleteDoc(d.ref);
      });
      onBack();
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.DELETE, 'groups');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!isAdmin || userId === user?.uid) return;
    try {
      await deleteDoc(doc(db, 'groupMembers', `${groupId}_${userId}`));
      await updateDoc(doc(db, 'groups', groupId), { memberCount: increment(-1) });
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprovePost = async (postId: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'posts', postId), { groupStatus: 'approved' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (e) {
      console.error(e);
    }
  };

  if (!group) return <div className="p-8 text-center text-zinc-500 bg-black h-full">Loading...</div>;

  if (isBlocked) {
    return (
      <div className="flex flex-col h-full bg-black text-white items-center justify-center p-8">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-zinc-500 text-center mb-6">You have been blocked from this car club.</p>
        <button onClick={onBack} className="bg-white text-black px-6 py-2 rounded-full font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white relative">
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-900/60 flex items-center justify-between p-4 pt-[calc(16px+env(safe-area-inset-top,0px))]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-white/80 hover:text-white rounded-full">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-black italic tracking-tighter line-clamp-1">{group.name}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="relative h-48 sm:h-64 bg-zinc-900 border-b border-zinc-900">
          {group.coverImage ? (
            <img src={group.coverImage} alt={group.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
              <Users size={48} className="mb-2" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black italic">{group.name}</h2>
              <div className="flex items-center gap-3 text-sm text-zinc-300 mt-1">
                <span className="flex items-center gap-1 font-medium"><Users size={14} /> {group.memberCount} members</span>
                {isAdmin && <span className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><Shield size={12} /> Admin</span>}
              </div>
            </div>
            
            {user && !isAdmin && (
              <button 
                onClick={isMember ? handleLeave : (hasRequested ? handleCancelRequest : handleJoin)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold active:scale-95 transition-transform ${isMember ? 'bg-zinc-800 text-white border border-zinc-700' : hasRequested ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-white text-black'}`}
              >
                {isMember ? 'Joined' : (hasRequested ? 'Requested' : 'Join')}
              </button>
            )}
            {user && isAdmin && (
              showConfirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeleteGroup}
                    className="px-4 py-1.5 rounded-full text-sm font-bold bg-red-600 text-white active:scale-95 transition-transform"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-4 py-1.5 rounded-full text-sm font-bold bg-zinc-800 text-white active:scale-95 transition-transform"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="px-4 py-1.5 rounded-full text-sm font-bold bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30 active:scale-95 transition-transform flex items-center gap-1"
                >
                  <Trash2 size={14} /> Delete Club
                </button>
              )
            )}
          </div>
        </div>
        
        <div className="p-4 border-b border-zinc-900">
          <p className="text-sm text-zinc-300">{group.description}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-900/60 sticky top-0 bg-black/90 backdrop-blur-md z-30">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'posts' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'members' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
          >
            Members
          </button>
          {isAdmin && group.isPrivate && (
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-1 ${activeTab === 'requests' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
            >
              Requests {group.joinRequests && group.joinRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{group.joinRequests.length}</span>}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-1 ${activeTab === 'pending' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
            >
              Pending {pendingPosts.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingPosts.length}</span>}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('blocked')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-1 ${activeTab === 'blocked' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
            >
              Blocked
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 pb-[100px]">
          {activeTab === 'posts' && (
            <div className="space-y-6">
              {isMember && (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowUpload(true)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left text-zinc-500 flex items-center gap-2 hover:bg-zinc-800/80 transition-colors"
                  >
                    <Plus size={20} /> Create a post in {group.name}...
                  </button>
                </div>
              )}
              {posts.length === 0 ? (
                <div className="text-center p-8 text-zinc-500">No posts yet.</div>
              ) : (
                posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    isActive={true}
                    isGroupAdmin={isAdmin}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-3">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => member.profile && onNavigateProfile(member.profile.uid)}>
                    {member.profile?.profilePic ? (
                      <img src={member.profile.profilePic} alt={member.profile.username} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User size={20} className="text-zinc-500" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        {member.profile?.username || 'Unknown User'}
                        {member.role === 'admin' && <Shield size={12} className="text-blue-500" />}
                      </div>
                      <div className="text-xs text-zinc-500">Joined {new Date(member.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  {isAdmin && member.userId !== user?.uid && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleRemoveMember(member.userId)}
                        className="text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Remove
                      </button>
                      <button 
                        onClick={() => handleBlockUser(member.userId)}
                        className="text-red-500 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Block
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'requests' && isAdmin && (
            <div className="space-y-3">
              {requestProfiles.length === 0 ? (
                <div className="text-center p-8 text-zinc-500">No pending join requests.</div>
              ) : (
                requestProfiles.map(profile => (
                  <div key={profile.uid} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigateProfile(profile.uid)}>
                      {profile.profilePic ? (
                        <img src={profile.profilePic} alt={profile.username} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                          <User size={20} className="text-zinc-500" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold flex items-center gap-1.5">{profile.username}</div>
                        <div className="text-xs text-zinc-500">Requested to join</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleAcceptRequest(profile.uid)}
                        className="bg-white text-black hover:bg-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button 
                        onClick={() => handleDenyRequest(profile.uid)}
                        className="text-zinc-400 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <X size={14} /> Deny
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'pending' && isAdmin && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-3 rounded-xl text-sm flex items-start gap-2 mb-4">
                <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                <p>Pending posts require admin approval before they appear in the club feed.</p>
              </div>
              
              {pendingPosts.length === 0 ? (
                <div className="text-center p-8 text-zinc-500">No pending posts.</div>
              ) : (
                pendingPosts.map(post => (
                  <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {post.authorProfile?.profilePic ? (
                        <img src={post.authorProfile.profilePic} alt="Author" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800" />
                      )}
                      <div>
                        <div className="font-bold text-sm">{post.authorProfile?.username || 'Unknown'}</div>
                        <div className="text-xs text-zinc-500">{new Date(post.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    {post.mediaUrls && post.mediaUrls[0] && (
                      <img src={post.mediaUrls[0]} alt="Post media" className="w-full h-48 object-cover rounded-lg mb-3" />
                    )}
                    
                    <p className="text-sm mb-4">{post.caption}</p>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleApprovePost(post.id)}
                        className="flex-1 bg-white text-black py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                      >
                        <Check size={16} /> Approve
                      </button>
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'blocked' && isAdmin && (
            <div className="space-y-3">
              {blockedProfiles.length === 0 ? (
                <div className="text-center p-8 text-zinc-500">No blocked users.</div>
              ) : (
                blockedProfiles.map(profile => (
                  <div key={profile.uid} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigateProfile(profile.uid)}>
                      {profile.profilePic ? (
                        <img src={profile.profilePic} alt={profile.username} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                          <User size={20} className="text-zinc-500" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold flex items-center gap-1.5">{profile.username}</div>
                        <div className="text-xs text-zinc-500">Blocked User</div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleUnblockUser(profile.uid)}
                      className="bg-white text-black hover:bg-zinc-200 px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      
      {showUpload && (
        <div className="fixed inset-0 z-[100] bg-black">
          <UploadView 
            onClose={() => setShowUpload(false)} 
            groupId={groupId} 
          />
        </div>
      )}
    </div>
  );
}
