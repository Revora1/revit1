'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isIOS: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setError(null);
        // Fetch or create profile
        const profileRef = doc(db, 'users', user.uid);
        
        // Use onSnapshot for real-time updates
        const unsubscribeProfile = onSnapshot(profileRef, async (profileSnap) => {
          if (profileSnap.exists()) {
            const data = profileSnap.data() as UserProfile;
            
            // Fetch private info if it's the owner (one-time fetch is fine for email)
            const privateInfoRef = doc(db, 'users', user.uid, 'private', 'info');
            const privateSnap = await getDoc(privateInfoRef);
            if (privateSnap.exists()) {
              data.email = privateSnap.data().email;
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
              const q = query(usersRef, where('username', '==', newUsername));
              const querySnapshot = await getDocs(q);
              if (querySnapshot.empty) {
                isUnique = true;
              } else {
                newUsername = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
                counter++;
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
              // Profile state will be set by the next snapshot trigger
            } catch (error) {
              console.error('Failed to create user profile:', error);
            }
          }
          setLoading(false);
        }, (err) => {
          console.error('Profile listener error:', err);
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Force user selection even if already signed in to a Google account
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign in cancelled');
      } else if (err.code === 'auth/popup-blocked') {
        setError('The sign-in popup was blocked. Please enable popups or try a different browser.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled in Firebase Console');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized in Firebase Console. Add this domain to authorized domains.');
      } else if (err.code === 'auth/internal-error' && isIOS) {
        setError('Safari on iOS may block sign-in inside iframes. Try opening in a new tab or "Settings > Safari > Prevent Cross-Site Tracking" (OFF).');
      } else {
        setError(err.message || 'Failed to sign in');
      }
    }
  };

  const logout = async () => {
    setError(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, isIOS, signIn, logout }}>
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
