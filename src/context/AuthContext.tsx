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
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileSettings: (settings: Partial<UserProfile>) => Promise<void>;
  blockedUserIds: string[];
  myBlockedIds: string[];
  blockUser: (blockedId: string) => Promise<void>;
  unblockUser: (blockedId: string) => Promise<void>;
  reportContent: (targetId: string, targetType: 'post' | 'comment' | 'user' | 'message' | 'story', reason: string, details?: string) => Promise<void>;
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

  const blockedUserIds = Array.from(new Set([...myBlockedIds, ...blockedByIds]));

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

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
                  const refId = urlParams.get('ref');
                  if (refId && refId !== user.uid) {
                    const referrerRef = doc(db, 'users', refId);
                    const referrerSnap = await getDoc(referrerRef);
                    if (referrerSnap.exists()) {
                      const currentCount = referrerSnap.data().referralsCount || 0;
                      await updateDoc(referrerRef, { referralsCount: currentCount + 1 });
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
      // 'auth/user-not-found' or 'auth/invalid-credential' means they might need a new account
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, sanitizedEmail, p);
          return;
        } catch (createErr: any) {
          console.error('Firebase createUserWithEmailAndPassword error:', createErr);
          if (createErr.code === 'auth/weak-password' || createErr.message?.includes('weak-password')) {
            setError('The password is too weak. It must be at least 6 characters long.');
          } else if (createErr.code === 'auth/email-already-in-use' || createErr.message?.includes('email-already-in-use')) {
            setError('Incorrect password. This email is already registered.');
          } else if (createErr.code === 'auth/operation-not-allowed' || createErr.message?.includes('operation-not-allowed')) {
            setError('Email/Password provider is disabled in your Firebase Console.');
          } else if (createErr.code === 'auth/invalid-email' || createErr.message?.includes('invalid-email')) {
            setError('Please enter a valid email address.');
          } else {
            setError(createErr.message || 'Failed to create account');
          }
        }
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password provider is disabled in your Firebase Console.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        console.error('Email sign in error:', err);
        setError(err.message || 'Failed to sign in with email');
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
      profile, 
      loading, 
      error, 
      isIOS, 
      signInWithEmail, 
      resetPassword,
      logout,
      updateProfileSettings,
      blockedUserIds,
      myBlockedIds,
      blockUser,
      unblockUser,
      reportContent
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
