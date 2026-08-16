import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Ionicons } from '@expo/vector-icons';

export default function CookieConsentModal({ userId }: { userId?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId) {
      setShow(false);
      return;
    }
    
    const checkConsent = async () => {
      try {
        const consent = await AsyncStorage.getItem('gdpr-consent');
        if (consent !== 'accepted') {
          setShow(true);
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkConsent();
  }, [userId]);

  const handleConsent = async (accepted: boolean) => {
    try {
      if (accepted) {
        await AsyncStorage.setItem('gdpr-consent', 'accepted');
        // Request ATT immediately if accepted
        if (Platform.OS === 'ios') {
          await requestTrackingPermissionsAsync();
        }
      } else {
        await AsyncStorage.removeItem('gdpr-consent');
      }
    } catch (e) {
      console.error(e);
    }
    setShow(false);
  };

  return (
    <Modal visible={show} transparent={true} animationType="fade">
      <SafeAreaView style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={styles.title}>Privacy First</Text>
              <Text style={styles.message}>
                We use cookies and share data with third-party advertising partners (like Google AdMob) to analyze app usage and deliver personalized advertisements. By clicking "Accept", you consent to this tracking and data sharing.
              </Text>
            </View>
          </View>
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.declineButton} onPress={() => handleConsent(false)}>
              <Text style={styles.declineText}>DECLINE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptButton} onPress={() => handleConsent(true)}>
              <Ionicons name="checkmark" size={16} color="#000" style={{ marginRight: 6 }} />
              <Text style={styles.acceptText}>ACCEPT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#111',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: '#333',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  message: {
    color: '#999',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#222',
    alignItems: 'center',
    marginRight: 6,
  },
  declineText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  acceptText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  }
});
