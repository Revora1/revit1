import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Story, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { Plus } from 'lucide-react';

interface StoriesGroup {
  authorId: string;
  author: UserProfile;
  stories: Story[];
  hasUnseen: boolean;
}

export function StoriesBar({ onSelectUser }: { onSelectUser: (userId: string | null) => void }) {
  const { user, profile, blockedUserIds } = useAuth();
  const [groupedStories, setGroupedStories] = useState<StoriesGroup[]>([]);
  const userCache = useRef<Record<string, UserProfile>>({});

  useEffect(() => {
    if (!user) return;

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const yesterday = Date.now() - ONE_DAY_MS;

    const storiesRef = collection(db, 'stories');
    const q = query(
      storiesRef,
      where('createdAt', '>=', yesterday),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const fetchStories = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Story));
        
        const groups: Record<string, Story[]> = {};
        fetchStories.forEach(story => {
          if (!groups[story.authorId]) groups[story.authorId] = [];
          groups[story.authorId].push(story);
        });

        const usersToFetch = Object.keys(groups).filter(uid => !userCache.current[uid]);
        
        // Fetch missing users in parallel
        if (usersToFetch.length > 0) {
           const userDocs = await Promise.all(
              usersToFetch.map(uid => getDoc(doc(db, 'users', uid)))
           );
           userDocs.forEach(uSnap => {
              if (uSnap.exists()) {
                 const userData = uSnap.data() as UserProfile;
                 userCache.current[uSnap.id] = userData;
              }
           });
        }

        const newGroups: StoriesGroup[] = [];
        const sortedUids = Object.keys(groups);

        for (const uid of sortedUids) {
           if (uid === user.uid) continue;
           if (blockedUserIds.includes(uid)) continue;
           if (userCache.current[uid]) {
              newGroups.push({
                 authorId: uid,
                 author: userCache.current[uid],
                 stories: groups[uid],
                 hasUnseen: true
              });
           }
        }

        let myGroup: StoriesGroup | null = null;
        if (groups[user.uid] && profile) {
           myGroup = {
              authorId: user.uid,
              author: profile,
              stories: groups[user.uid],
              hasUnseen: false
           };
        }

        const finalGroups = myGroup ? [myGroup, ...newGroups] : newGroups;
        setGroupedStories(finalGroups);

      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'stories');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stories');
    });

    return unsubscribe;
  }, [user, profile]);

  const hasMyStory = groupedStories.length > 0 && groupedStories[0].authorId === user?.uid;

  return (
    <div className="w-full h-24 pt-4 pb-2 flex items-center gap-4 px-4 overflow-x-auto scrollbar-hide">
      {profile && (
         <button 
           onClick={() => onSelectUser('create')}
           className="relative flex flex-col items-center gap-1 group flex-shrink-0"
         >
           <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden relative">
             {profile.profilePic ? (
               <img src={profile.profilePic} className="w-full h-full object-cover opacity-80" alt="me" />
             ) : (
               <div className="w-full h-full bg-zinc-700" />
             )}
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Plus size={24} className="text-white" />
             </div>
           </div>
           <span className="text-[10px] font-bold text-zinc-400">Add Story</span>
         </button>
      )}

      {groupedStories.map(group => (
         <button 
           key={group.authorId}
           onClick={() => onSelectUser(group.authorId)}
           className="flex flex-col items-center gap-1 flex-shrink-0"
           style={{  width: '56px' }}
         >
           <div className={`w-14 h-14 rounded-full p-[2px] ${group.hasUnseen ? 'bg-gradient-to-tr from-yellow-500 to-red-500' : 'bg-zinc-700'}`}>
              <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-zinc-800">
                {group.author.profilePic ? (
                  <img src={group.author.profilePic} className="w-full h-full object-cover" alt={group.author.username} />
                ) : (
                  <div className="w-full h-full bg-zinc-700" />
                )}
              </div>
           </div>
           <span className="text-[10px] font-bold whitespace-nowrap overflow-hidden text-ellipsis w-14 text-center text-white">
             {group.authorId === user?.uid ? 'Your Story' : group.author.username}
           </span>
         </button>
      ))}
    </div>
  );
}
