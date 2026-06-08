import React, { useState, useRef, useEffect } from 'react';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, limit, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { X, Camera, Heart, User, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { sanitizeInput, isValidUsername } from '../lib/utils';

interface EditProfileModalProps {
  onClose: () => void;
}

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    bio: profile?.bio || '',
    partnerId: profile?.partnerId || '',
  });

  // Handle body scroll lock
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerResults, setPartnerResults] = useState<UserProfile[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<UserProfile | null>(null);
  const [isSearchingPartner, setIsSearchingPartner] = useState(false);

  useEffect(() => {
    const fetchCurrentPartner = async () => {
      if (profile?.partnerId) {
        try {
          const pSnap = await getDoc(doc(db, 'users', profile.partnerId));
          if (pSnap.exists()) {
            setSelectedPartner(pSnap.data() as UserProfile);
          }
        } catch (e) {
          console.error("Error fetching current partner:", e);
        }
      }
    };
    fetchCurrentPartner();
  }, [profile?.partnerId]);

  useEffect(() => {
    const searchUsers = async () => {
      if (partnerSearch.length < 2) {
        setPartnerResults([]);
        return;
      }
      setIsSearchingPartner(true);
      try {
        const q = query(
          collection(db, 'users'), 
          where('usernameLower', '>=', partnerSearch.toLowerCase()),
          where('usernameLower', '<=', partnerSearch.toLowerCase() + '\uf8ff'),
          limit(5)
        );
        const snap = await getDocs(q);
        const results = snap.docs
          .map(d => d.data() as UserProfile)
          .filter(u => u.uid !== user?.uid);
        setPartnerResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingPartner(false);
      }
    };

    const timer = setTimeout(searchUsers, 500);
    return () => clearTimeout(timer);
  }, [partnerSearch, user?.uid]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(profile?.profilePic || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const cleanUsername = sanitizeInput(formData.username.trim());
      const cleanBio = sanitizeInput(formData.bio.trim());

      if (!isValidUsername(cleanUsername)) {
        alert('Invalid Username. It must be between 3 and 25 characters, and only contain letters, numbers, underscores, and hyphens.');
        setLoading(false);
        return;
      }

      if (cleanUsername !== profile?.username) {
        // Check if username is already taken (case-insensitive)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('usernameLower', '==', cleanUsername.toLowerCase()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          alert('This username is already taken. Please choose another one.');
          setLoading(false);
          return;
        }
      }

      let profilePicUrl = profile?.profilePic || '';

      if (imageFile) {
        const storageRef = ref(storage, `profiles/${user.uid}/avatar_${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        profilePicUrl = await getDownloadURL(snapshot.ref);
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        username: cleanUsername,
        bio: cleanBio,
        partnerId: selectedPartner?.uid || '',
        usernameLower: cleanUsername.toLowerCase(),
        profilePic: profilePicUrl,
      });
      onClose();
    } catch (error: any) {
      if (error?.message?.includes('storage/unauthorized')) {
        alert('Permission Denied: To upload images, please go to your Firebase Console -> Storage -> Rules, and allow read/write access for authenticated users.');
      } else {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="w-full max-w-lg bg-zinc-950 rounded-t-[32px] sm:rounded-3xl border border-zinc-800 p-8 pt-6 space-y-6 max-h-[90vh] flex flex-col relative shadow-2xl"
      >
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-black italic tracking-tight">EDIT PROFILE</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 pb-28 sm:pb-4">
          <form onSubmit={handleSubmit} className="space-y-6 pb-2">
            <div className="flex flex-col items-center gap-4">
             <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-zinc-800 overflow-hidden cursor-pointer relative group"
             >
                {imagePreview ? (
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <Camera size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                   <Camera size={20} />
                </div>
             </div>
             <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Change Avatar</p>
             <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Username</label>
              <input
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white outline-none transition-colors"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                placeholder="Username"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Bio</label>
              <textarea
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white outline-none transition-colors h-24 resize-none"
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about your build..."
              />
            </div>

            <div className="h-px bg-zinc-900 my-2" />

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">
                <Heart size={10} className="text-red-500" fill="currentColor" />
                Duo Partner
              </label>
              
              {selectedPartner ? (
                <div className="flex items-center justify-between p-4 bg-zinc-900 border border-red-500/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-none border border-zinc-700">
                      {selectedPartner.profilePic ? (
                        <img src={selectedPartner.profilePic} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <User size={20} className="m-auto text-zinc-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm">@{selectedPartner.username}</p>
                      <p className="text-[8px] font-black uppercase text-red-500 tracking-widest">Duo Link Active</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedPartner(null)}
                    className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-white outline-none transition-colors"
                    value={partnerSearch}
                    onChange={e => setPartnerSearch(e.target.value)}
                    placeholder="Search partner by username..."
                    onFocus={() => {}} 
                  />
                  
                  <AnimatePresence>
                    {(partnerResults.length > 0 || isSearchingPartner) && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden z-10 shadow-2xl"
                      >
                        {isSearchingPartner && (
                          <div className="p-4 text-center">
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                          </div>
                        )}
                        {partnerResults.map(res => (
                          <button
                            key={res.uid}
                            type="button"
                            onClick={() => {
                              setSelectedPartner(res);
                              setPartnerResults([]);
                              setPartnerSearch('');
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors text-left border-b border-zinc-800 last:border-0"
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 flex-none">
                              {res.profilePic && <img src={res.profilePic} className="w-full h-full object-cover" alt="" />}
                            </div>
                            <span className="font-bold text-sm">@{res.username}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <p className="text-[9px] text-zinc-600 px-1 italic">
                Linking a partner unlocks the "Duo Garage" where your cars are displayed together.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black h-14 rounded-full font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </form>
      </div>
    </motion.div>
    </div>
  );
}
