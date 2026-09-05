import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface Props {
  user: any;
  onVerified?: () => void;
  onSignOut?: () => void;
}

export default function EmailVerificationScreen({ user, onVerified, onSignOut }: Props) {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleCheckStatus = async () => {
    setChecking(true);
    setStatusMessage(null);
    try {
      if (!auth.currentUser) return;
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        Alert.alert('Verified!', 'Your email address has been confirmed. Welcome to RevItUp!');
        if (onVerified) onVerified();
      } else {
        setStatusMessage("We haven't received your confirmation yet. Tap the link in your email and try again.");
      }
    } catch (err: any) {
      Alert.alert('Status Check Failed', err.message || 'Unable to check verification status. Please check your network.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setStatusMessage(null);

    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setCooldown(60);
        Alert.alert('Email Sent', `A new verification email was sent to ${auth.currentUser.email}. Check your inbox and spam folder.`);
      }
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        Alert.alert('Too Many Requests', 'Please wait a minute before requesting another verification email.');
        setCooldown(60);
      } else {
        Alert.alert('Error', err.message || 'Failed to resend verification email.');
      }
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (onSignOut) onSignOut();
    } catch (e) {
      console.log('Error signing out:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread" size={48} color="#e53935" />
        </View>

        {/* Title */}
        <Text style={styles.subHeader}>REVITUP SECURITY</Text>
        <Text style={styles.header}>VERIFY YOUR EMAIL</Text>

        <Text style={styles.bodyText}>
          We sent a verification link to your email address:
        </Text>

        <View style={styles.emailBadge}>
          <Text style={styles.emailText}>{user?.email || auth.currentUser?.email || 'your email'}</Text>
        </View>

        {statusMessage && (
          <View style={styles.messageBox}>
            <Ionicons name="information-circle-outline" size={16} color="#f5d547" style={{ marginRight: 6 }} />
            <Text style={styles.messageText}>{statusMessage}</Text>
          </View>
        )}

        {/* Help box */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>QUICK INSTRUCTIONS</Text>
          <Text style={styles.helpItem}>• Tap the verification link in the email from RevItUp.</Text>
          <Text style={styles.helpItem}>• Don't see it? Check your Spam or Junk folder.</Text>
          <Text style={styles.helpItem}>• Once confirmed, tap the button below to continue.</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.primaryButton, (checking || resending) && { opacity: 0.6 }]}
            onPress={handleCheckStatus}
            disabled={checking || resending}
          >
            {checking ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>I'VE VERIFIED MY EMAIL</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, (cooldown > 0 || resending) && { opacity: 0.5 }]}
            onPress={handleResend}
            disabled={cooldown > 0 || resending}
          >
            {resending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.secondaryButtonText}>
                  {cooldown > 0 ? `RESEND EMAIL (${cooldown}s)` : 'RESEND VERIFICATION EMAIL'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={16} color="#888" style={{ marginRight: 6 }} />
            <Text style={styles.signOutText}>SIGN OUT / USE DIFFERENT EMAIL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  subHeader: {
    color: '#e53935',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  header: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  bodyText: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 18,
  },
  emailBadge: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  emailText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 213, 71, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 213, 71, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  messageText: {
    color: '#f5d547',
    fontSize: 12,
    flex: 1,
  },
  helpCard: {
    width: '100%',
    backgroundColor: '#0e0e0e',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  helpTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  helpItem: {
    color: '#bbb',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#fff',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  signOutText: {
    color: '#777',
    fontSize: 11,
    fontWeight: '700',
  },
});
