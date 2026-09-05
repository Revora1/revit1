import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc, updateDoc, increment, getDoc, getDocs, collection, query, where, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [referredBy, setReferredBy] = useState<string | null>(null);

  useEffect(() => {
    // Check initial url for referral code
    const parseUrlForReferral = (url: string | null) => {
      if (!url) return;
      try {
        const queryPart = url.includes('?') ? url.split('?')[1] : '';
        const params = new URLSearchParams(queryPart);
        const ref = params.get('ref') || params.get('u');
        if (ref) {
          setReferredBy(ref);
        }
      } catch (e) {
        console.log('Error parsing referral link:', e);
      }
    };

    Linking.getInitialURL().then(parseUrlForReferral);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      parseUrlForReferral(url);
    });

    return () => subscription.remove();
  }, []);

  const handleAuth = async () => {
    if (isSignUp) {
      const cleanUsername = usernameInput.trim();
      if (!cleanUsername) {
        Alert.alert('Username Required', 'Please choose a username for your account.');
        return;
      }
      if (cleanUsername.length < 3 || cleanUsername.length > 20) {
        Alert.alert('Invalid Username', 'Username must be between 3 and 20 characters.');
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        Alert.alert('Invalid Username', 'Username can only contain letters, numbers, and underscores.');
        return;
      }
    }

    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    
    setLoading(true);
    try {
      if (isSignUp) {
        let initialUsername = usernameInput.trim();
        if (email.toLowerCase() === 'tonyang11552883@gmail.com' && (initialUsername === 'tonyang11552883' || initialUsername === 'tonyang1155')) {
          initialUsername = 'tony';
        }

        // Check if username is already taken before creating the user
        const qLower = query(
          collection(db, 'users'),
          where('usernameLower', '==', initialUsername.toLowerCase())
        );
        const existingSnap = await getDocs(qLower);
        if (!existingSnap.empty) {
          Alert.alert('Username Taken', `The username '@${initialUsername}' is already taken. Please choose another username.`);
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        const user = userCredential.user;
        // Create user profile
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          username: initialUsername,
          usernameLower: initialUsername.toLowerCase(),
          followersCount: 0,
          followingCount: 0,
          garage: [],
          referredBy: referredBy || null,
          createdAt: serverTimestamp(),
        });

        // Create private info document
        await setDoc(doc(db, 'users', user.uid, 'private', 'info'), {
          email: user.email,
        });

        // If user was referred by someone, increment the referrer's referral count for giveaways (NEW signups only, max 15 boost tickets)
        if (referredBy && referredBy !== user.uid) {
          try {
            let targetRef = doc(db, 'users', referredBy);
            let targetSnap = await getDoc(targetRef);

            if (!targetSnap.exists()) {
              // Try finding by username
              const q = query(collection(db, 'users'), where('username', '==', referredBy));
              const querySnap = await getDocs(q);
              if (!querySnap.empty) {
                targetRef = querySnap.docs[0].ref;
                targetSnap = querySnap.docs[0];
              }
            }

            if (targetSnap.exists()) {
              const currentData = targetSnap.data();
              const existingReferrals = currentData?.referralsCount || 0;
              const newReferralsCount = existingReferrals + 1;
              const newBoostTickets = Math.min(15, newReferralsCount);

              await updateDoc(targetRef, {
                referralsCount: newReferralsCount,
                boostTickets: newBoostTickets,
                referredUsers: arrayUnion(user.uid),
              });
            }
          } catch (refErr) {
            console.log('Error updating referrer points:', refErr);
          }
        }
        // Send Firebase email verification
        try {
          await sendEmailVerification(user);
        } catch (verErr) {
          console.log('Error sending verification email:', verErr);
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      }
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address in the field above to receive a password reset link.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Email Sent', `A password reset link has been sent to ${email.trim()}.`);
    } catch (err: any) {
      Alert.alert('Password Reset Failed', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>REVITUP</Text>
            <Text style={styles.subtitle}>FOR THE CAR COMMUNITY</Text>
          </View>
          
          <View style={styles.formContainer}>
            {isSignUp && (
              <View style={{ marginBottom: 16 }}>
                <TextInput
                  style={[styles.input, { marginBottom: 4 }]}
                  placeholder="Choose Username (e.g. Tony, BoostedGT)"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={usernameInput}
                  onChangeText={(val) => setUsernameInput(val.replace(/\s+/g, ''))}
                />
                <Text style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>
                  Your permanent username across RevItUp.
                </Text>
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            
            <TouchableOpacity style={styles.mainBtn} onPress={handleAuth} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <View style={styles.mainBtnContent}>
                  <Text style={styles.mainBtnText}>{isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}</Text>
                  {isSignUp ? (
                    <Ionicons name="person-add-outline" size={18} color="#000" style={{ marginLeft: 8 }} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#000" style={{ marginLeft: 8 }} />
                  )}
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? (
                <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="person-add-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.toggleBtnText}>
                {isSignUp ? 'ALREADY HAVE AN ACCOUNT? SIGN IN' : 'NEED AN ACCOUNT? SIGN UP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
              <Text style={styles.forgotBtnText}>FORGOT PASSWORD?</Text>
            </TouchableOpacity>
          </View>
          
        </ScrollView>
        <TouchableOpacity onPress={() => Linking.openURL('https://revitup.today/privacy-policy/')} style={{ paddingBottom: 16 }}>
          <Text style={styles.footerText}>
            By joining, you agree to our <Text style={{ textDecorationLine: 'underline', color: '#888' }}>Privacy & Cookie Policy</Text> and Terms of Service.
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoText: { fontSize: 48, fontWeight: '900', fontStyle: 'italic', color: '#fff', letterSpacing: -2 },
  subtitle: { fontSize: 13, color: '#aaa', marginTop: 8, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 'bold' },
  
  formContainer: { width: '100%' },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16
  },
  mainBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  mainBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  
  separator: { height: 1, backgroundColor: '#222', width: '100%', marginVertical: 32 },
  
  toggleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  toggleBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  forgotBtn: { alignItems: 'center' },
  forgotBtnText: { color: '#888', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },

  footerText: { color: '#555', fontSize: 12, textAlign: 'center', marginBottom: 24 }
});
