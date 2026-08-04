'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isIOS: boolean;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileSettings: (settings: Partial<UserProfile>) => Promise<void>;
  blockedUserIds: string[];
  myBlockedIds: string[];
  blockUser: (blockedId: string) => Promise<void>;
  unblockUser: (blockedId: string) => Promise<void>;
  reportContent: (targetId: string, targetType: 'post' | 'comment' | 'user' | 'message' | 'story', reason: string, details?: string) => Promise<void>;
  isAdmin: boolean;
  currentRole: 'admin' | 'user' | 'new_user';
  setCurrentRole: (role: 'admin' | 'user' | 'new_user') => void;
  simulatedUserCount: number;
  setSimulatedUserCount: React.Dispatch<React.SetStateAction<number>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [myBlockedIds, setMyBlockedIds] = useState<string[]>([]);
  const [blockedByIds, setBlockedByIds] = useState<string[]>([]);
  
  // Developer Mode States
  const [currentRole, setCurrentRole] = useState<'admin' | 'user' | 'new_user'>(() => {
    return (localStorage.getItem('dev_role') as 'admin' | 'user' | 'new_user') || 'admin';
  });
  const [simulatedUserCount, setSimulatedUserCount] = useState<number>(() => {
    const saved = localStorage.getItem('dev_simulated_users');
    return saved ? parseInt(saved, 10) : 4850;
  });

   useEffect(() => {
    localStorage.setItem('dev_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('dev_simulated_users', simulatedUserCount.toString());
  }, [simulatedUserCount]);

  // IsAdmin check - dynamic based on active role toggle
  const isAdmin = (user?.email?.toLowerCase() === 'tonyang11552883@gmail.com') && currentRole === 'admin';

  // Real-time synchronization of simulatedUserCount with Firestore metadata/stats document
  useEffect(() => {
    if (!user) return;
    const statsRef = doc(db, 'metadata', 'stats');
    const unsub = onSnapshot(statsRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.data().totalRegisteredUsers;
        if (typeof val === 'number') {
          setSimulatedUserCount(val);
        }
      } else {
        // If it doesn't exist yet and user is admin, seed it
        if (isAdmin) {
          setDoc(statsRef, { totalRegisteredUsers: simulatedUserCount }).catch(console.error);
        }
      }
    }, (err) => {
      console.warn("Global stats read error (using local simulated count fallback):", err);
    });
    return unsub;
  }, [user, isAdmin]);

  useEffect(() => {
    if (isAdmin && user) {
      const statsRef = doc(db, 'metadata', 'stats');
      setDoc(statsRef, { totalRegisteredUsers: simulatedUserCount }, { merge: true })
        .catch(err => console.warn("Failed syncing admin user count change:", err));
    }
  }, [simulatedUserCount, isAdmin, user]);

  // Compute active profile with simulated data if impersonating
  const activeProfile = React.useMemo(() => {
    if (!profile) return null;
    if (currentRole === 'user') {
      return {
        ...profile,
        username: 'race_enthusiast',
        displayName: 'John Enthusiast',
        bio: '🚗 Trackday builder | Living life at 9,000 RPM. Currently simulating a regular user feed.',
        followersCount: 1420,
        followingCount: 382,
        garage: ['m3_build', '911_gt3'],
        referralsCount: 12,
      };
    }
    if (currentRole === 'new_user') {
      return {
        ...profile,
        username: 'new_driver',
        displayName: 'Fresh Member',
        bio: 'Just joined RevitUp! Ready to build and share my garage.',
        followersCount: 0,
        followingCount: 0,
        garage: [],
        referralsCount: 0,
      };
    }
    return profile;
  }, [profile, currentRole]);

  const blockedUserIds = Array.from(new Set([...myBlockedIds, ...blockedByIds]));

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        sessionStorage.setItem('revit_referrer', ref);
      }
    } catch (e) {
      console.warn("Failed to check referral query parameter:", e);
    }

    // Safety timeout to ensure loading spinner does not get stuck forever (e.g. 10 seconds)
    const safetyTimeout = setTimeout(() => {
      setLoading((currLoading) => {
        if (currLoading) {
          console.warn("Auth initialization timed out after 10 seconds.");
          return false;
        }
        return currLoading;
      });
    }, 10000);

    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeMyBlocks: (() => void) | null = null;
    let unsubscribeBlockedBy: (() => void) | null = null;

    const cleanupSubscribers = () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (unsubscribeMyBlocks) {
        unsubscribeMyBlocks();
        unsubscribeMyBlocks = null;
      }
      if (unsubscribeBlockedBy) {
        unsubscribeBlockedBy();
        unsubscribeBlockedBy = null;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      cleanupSubscribers();

      if (user) {
        setLoading(true);
        setError(null);
        // Fetch or create profile
        const profileRef = doc(db, 'users', user.uid);
        
        // Use onSnapshot for real-time updates
        unsubscribeProfile = onSnapshot(profileRef, async (profileSnap) => {
          try {
            clearTimeout(safetyTimeout);
            if (profileSnap.exists()) {
              const data = profileSnap.data() as UserProfile;
              
              // Fetch private info if it's the owner (one-time fetch is fine for email)
              try {
                const privateInfoRef = doc(db, 'users', user.uid, 'private', 'info');
                const privateSnap = await getDoc(privateInfoRef);
                if (privateSnap.exists()) {
                  data.email = privateSnap.data().email;
                }
              } catch (privateErr) {
                console.warn("Failed to fetch private email profile info:", privateErr);
              }

              // Auto-migrate user tonyang11552883 to 'tony'
              if (
                (user.email?.toLowerCase() === 'tonyang11552883@gmail.com' || data.email?.toLowerCase() === 'tonyang11552883@gmail.com') &&
                data.username === 'tonyang11552883'
              ) {
                data.username = 'tony';
                data.usernameLower = 'tony';
                const { email, ...publicProfile } = data;
                await setDoc(profileRef, publicProfile, { merge: true });
              }

              if (data.username && !data.usernameLower) {
                const updatedProfile = { ...data, usernameLower: data.username.toLowerCase() };
                const { email, ...publicProfile } = updatedProfile;
                await setDoc(profileRef, publicProfile, { merge: true });
                setProfile(updatedProfile);
              } else {
                setProfile(data);
              }
            } else {
              // Logic for new user profile creation
              let baseUsername = user.email?.split('@')[0] || 'User';
              if (user.email?.toLowerCase() === 'tonyang11552883@gmail.com') {
                baseUsername = 'tony';
              }
              let newUsername = baseUsername;
              let isUnique = false;
              let counter = 1;

              const usersRef = collection(db, 'users');

              while (!isUnique) {
                try {
                  const q = query(usersRef, where('username', '==', newUsername));
                  const querySnapshot = await getDocs(q);
                  if (querySnapshot.empty) {
                    isUnique = true;
                  } else {
                    newUsername = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
                    counter++;
                  }
                } catch (loopErr) {
                  console.error("Error checking username uniqueness in signup loop:", loopErr);
                  newUsername = `${baseUsername}${Math.floor(Math.random() * 100000)}`;
                  isUnique = true;
                }
              }

              const newProfile: UserProfile = {
                uid: user.uid,
                username: newUsername,
                usernameLower: newUsername.toLowerCase(),
                followersCount: 0,
                followingCount: 0,
                garage: [],
              };
              
              const privateInfo = {
                email: user.email || ''
              };

              try {
                                await setDoc(profileRef, newProfile);
                const privateInfoRef = doc(db, 'users', user.uid, 'private', 'info');
                await setDoc(privateInfoRef, privateInfo);

                // Handle referral loop
                try {
                  const urlParams = new URLSearchParams(window.location.search);
                  let refId = urlParams.get('ref') || sessionStorage.getItem('revit_referrer');
                  if (refId && refId !== user.uid) {
                    const referrerRef = doc(db, 'users', refId);
                    const referrerSnap = await getDoc(referrerRef);
                    if (referrerSnap.exists()) {
                      const currentCount = referrerSnap.data().referralsCount || 0;
                      const newCount = currentCount + 1;
                      await updateDoc(referrerRef, { referralsCount: newCount });

                      // Increment referralBonusCount in referrer's active milestone tickets
                      try {
                        const giveawaysSnap = await getDocs(collection(db, 'giveaways'));
                        const milestoneIds = new Set(['m1', 'm2', 'm3']);
                        giveawaysSnap.forEach(gDoc => {
                          milestoneIds.add(gDoc.id);
                        });

                        for (const mId of milestoneIds) {
                          const ticketRef = doc(db, 'giveaways', mId, 'tickets', refId);
                          const ticketSnap = await getDoc(ticketRef);
                          if (ticketSnap.exists()) {
                            const ticketData = ticketSnap.data();
                            const currentBonus = ticketData.referralBonusCount || 0;
                            await updateDoc(ticketRef, {
                              referralBonusCount: currentBonus + 1
                            });
                          }
                        }
                      } catch (ticketErr) {
                        console.error('Failed to update referrer tickets:', ticketErr);
                      }
                    }
                  }
                } catch (refErr) {
                  console.error('Failed to process referral:', refErr);
                }

                // Profile state will be set by the next snapshot trigger
              } catch (err: any) {
                console.error('Failed to create user profile:', err);
                setError(`Failed to create user profile: ${err?.message || err}`);
              }
            }
          } catch (snapshotErr: any) {
            console.error("Error inside profile snap listener:", snapshotErr);
            setError(snapshotErr?.message || "Error occurred while sync-loading profile.");
          } finally {
            setLoading(false);
          }
        }, (err) => {
          console.error('Profile listener error:', err);
          clearTimeout(safetyTimeout);
          setError(`Profile Loading Error: ${err.message || err}`);
          setLoading(false);
        });

        // Real-time listener for blocks created by me
        const qMyBlocks = query(collection(db, 'blocks'), where('blockerId', '==', user.uid));
        unsubscribeMyBlocks = onSnapshot(qMyBlocks, (snap) => {
          const ids = snap.docs.map(doc => doc.data().blockedId as string);
          setMyBlockedIds(ids);
        }, (err) => {
          console.error('My blocks listener error:', err);
        });

        // Real-time listener for blocks created by others against me
        const qBlockedBy = query(collection(db, 'blocks'), where('blockedId', '==', user.uid));
        unsubscribeBlockedBy = onSnapshot(qBlockedBy, (snap) => {
          const ids = snap.docs.map(doc => doc.data().blockerId as string);
          setBlockedByIds(ids);
        }, (err) => {
          console.error('Blocked by listener error:', err);
        });

      } else {
        clearTimeout(safetyTimeout);
        setProfile(null);
        setMyBlockedIds([]);
        setBlockedByIds([]);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
      cleanupSubscribers();
    };
  }, []);

  const signInWithEmail = async (e: string, p: string) => {
    setError(null);
    const sanitizedEmail = e.trim().toLowerCase();
    try {
      await signInWithEmailAndPassword(auth, sanitizedEmail, p);
    } catch (err: any) {
      console.log('Firebase signInWithEmailAndPassword error code:', err.code, err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password provider is disabled in your Firebase Console.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Failed to sign in with email');
      }
    }
  };

  const signUpWithEmail = async (e: string, p: string) => {
    setError(null);
    const sanitizedEmail = e.trim().toLowerCase();
    try {
      await createUserWithEmailAndPassword(auth, sanitizedEmail, p);
    } catch (createErr: any) {
      console.error('Firebase createUserWithEmailAndPassword error:', createErr);
      if (createErr.code === 'auth/weak-password' || createErr.message?.includes('weak-password')) {
        setError('The password is too weak. It must be at least 6 characters long.');
      } else if (createErr.code === 'auth/email-already-in-use' || createErr.message?.includes('email-already-in-use')) {
        setError('This email is already registered.');
      } else if (createErr.code === 'auth/operation-not-allowed' || createErr.message?.includes('operation-not-allowed')) {
        setError('Email/Password provider is disabled in your Firebase Console.');
      } else if (createErr.code === 'auth/invalid-email' || createErr.message?.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(createErr.message || 'Failed to create account');
      }
    }
  };

  
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw new Error('Failed to send password reset email. Please try again.');
    }
  };

  const updateProfileSettings = async (settings: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), settings);
      setProfile(prev => prev ? { ...prev, ...settings } : prev);
    } catch (err) {
      console.error("Failed to update settings:", err);
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    await signOut(auth);
  };

  const blockUser = async (blockedId: string) => {
    if (!user) return;
    const blockId = `${user.uid}_${blockedId}`;
    try {
      await setDoc(doc(db, 'blocks', blockId), {
        blockerId: user.uid,
        blockedId,
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `blocks/${blockId}`);
    }
  };

  const unblockUser = async (blockedId: string) => {
    if (!user) return;
    const blockId = `${user.uid}_${blockedId}`;
    try {
      await deleteDoc(doc(db, 'blocks', blockId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `blocks/${blockId}`);
    }
  };

  const reportContent = async (
    targetId: string,
    targetType: 'post' | 'comment' | 'user' | 'message' | 'story',
    reason: string,
    details?: string
  ) => {
    if (!user) return;
    const reportId = `${user.uid}_${targetId}_${Date.now()}`;
    try {
      await setDoc(doc(db, 'reports', reportId), {
        reporterId: user.uid,
        targetId,
        targetType,
        reason,
        details: details || '',
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `reports/${reportId}`);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile: activeProfile, 
      loading, 
      error, 
      isIOS, 
      signInWithEmail, 
      signUpWithEmail,
      resetPassword,
      logout,
      updateProfileSettings,
      blockedUserIds,
      myBlockedIds,
      blockUser,
      unblockUser,
      reportContent,
      isAdmin,
      currentRole,
      setCurrentRole,
      simulatedUserCount,
      setSimulatedUserCount
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
