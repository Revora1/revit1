import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, deleteDoc, doc, where } from 'firebase/firestore';
import { db, auth, storage } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function GroupsScreen() {
  const navigation = useNavigation<any>();
  const [groups, setGroups] = useState<any[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'my_clubs'>('discover');

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);

  const fetchGroups = async () => {
    try {
      const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      setGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      if (auth.currentUser) {
        const memQ = query(collection(db, 'groupMembers'), where('userId', '==', auth.currentUser.uid));
        const memSnap = await getDocs(memQ);
        setJoinedGroupIds(memSnap.docs.map(doc => doc.data().groupId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleDelete = (groupId: string) => {
    Alert.alert('Delete Group', 'Are you sure you want to delete this car club?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'groups', groupId));
          setGroups(groups.filter(g => g.id !== groupId));
        } catch (err: any) {
          Alert.alert('Error', err.message);
        }
      }}
    ]);
  };

  const handleJoin = async (group: any) => {
    try {
      if (!joinedGroupIds.includes(group.id) && group.adminId !== auth.currentUser?.uid) {
        addDoc(collection(db, 'groupMembers'), {
          groupId: group.id,
          userId: auth.currentUser?.uid,
          role: 'member',
          joinedAt: serverTimestamp()
        }).catch(e => console.log('Already joined or error', e));
        
        setJoinedGroupIds(prev => [...prev, group.id]);
      }
      
      navigation.navigate('GroupFeed', { groupId: group.id, groupName: group.name });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const pickCoverImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult || !permissionResult.granted) {
        Alert.alert('Permission Required', 'Photo library permission is needed to pick a group cover image. You can enable photo access in device Settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.4,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCoverImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.log('Error picking cover image:', err);
      Alert.alert('Error', 'Could not open photo library: ' + (err.message || 'Permission denied'));
    }
  };

  const handleCreateGroup = async () => {
    if (!name) return Alert.alert('Required', 'Group name is required');
    setSubmitting(true);
    try {
      let coverImageUrl = '';
      if (coverImageUri) {
        const blob: any = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function() {
            resolve(xhr.response);
          };
          xhr.onerror = function(e) {
            console.log(e);
            reject(new TypeError("Network request failed"));
          };
          xhr.responseType = "blob";
          xhr.open("GET", coverImageUri, true);
          xhr.send(null);
        });

        const storageRef = ref(storage, 'groups/' + Date.now() + '.jpg');
        await uploadBytes(storageRef, blob);
        coverImageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'groups'), {
        name,
        description: desc,
        adminId: auth.currentUser?.uid,
        memberCount: 1,
        coverImage: coverImageUrl || null,
        createdAt: serverTimestamp()
      });

      setShowModal(false);
      setName('');
      setDesc('');
      setCoverImageUri(null);
      fetchGroups();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayGroups = activeTab === 'discover' 
    ? groups 
    : groups.filter(g => joinedGroupIds.includes(g.id) || g.adminId === auth.currentUser?.uid);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CAR CLUBS</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={18} color="#000" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]} 
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>Discover</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'my_clubs' && styles.activeTab]} 
          onPress={() => setActiveTab('my_clubs')}
        >
          <Text style={[styles.tabText, activeTab === 'my_clubs' && styles.activeTabText]}>My Clubs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 60 }} />
        ) : displayGroups.length > 0 ? (
          displayGroups.map(group => (
            <View key={group.id} style={styles.card}>
              {group.coverImage ? (
                <Image source={{ uri: group.coverImage }} style={styles.image} />
              ) : (
                <View style={styles.noImage}>
                  <Ionicons name="people" size={40} color="#666" />
                </View>
              )}
              <View style={styles.info}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{group.name}</Text>
                  <Text style={styles.desc} numberOfLines={2}>{group.description}</Text>
                  <Text style={styles.members}>{group.memberCount || 1} Members</Text>
                </View>
                {(group.adminId === auth.currentUser?.uid || !group.adminId) && (
                  <TouchableOpacity style={[styles.joinBtn, { backgroundColor: '#e53935', marginRight: 8 }]} onPress={() => handleDelete(group.id)}>
                    <Text style={[styles.joinBtnText, { color: '#fff' }]}>Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoin(group)}>
                  <Text style={styles.joinBtnText}>Open</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>No clubs found. Create one!</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Club</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalForm}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickCoverImage}>
              {coverImageUri ? (
                <Image source={{ uri: coverImageUri }} style={styles.previewImage} />
              ) : (
                <>
                  <Ionicons name="camera" size={32} color="#666" />
                  <Text style={styles.imagePickerText}>Add Club Cover Image</Text>
                </>
              )}
            </TouchableOpacity>
            <TextInput style={styles.input} placeholder="Club Name" placeholderTextColor="#666" value={name} onChangeText={setName} />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor="#666" multiline value={desc} onChangeText={setDesc} />
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateGroup} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Create Club</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#000' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  createBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  createBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14, marginLeft: 4 },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#fff' },
  tabText: { color: '#666', fontWeight: 'bold', fontSize: 15 },
  activeTabText: { color: '#fff' },
  content: { flex: 1, backgroundColor: '#000' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  empty: { color: '#555', fontSize: 16 },
  card: { backgroundColor: '#111', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
  image: { width: '100%', height: 160 },
  noImage: { width: '100%', height: 160, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  info: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  desc: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  members: { color: '#666', fontSize: 12 },
  joinBtn: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginLeft: 16 },
  joinBtnText: { color: '#000', fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  imagePicker: { height: 160, backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
  imagePickerText: { color: '#666', marginTop: 8, fontWeight: 'bold' },
  previewImage: { width: '100%', height: '100%' },
  modalForm: { padding: 20 },
  input: { backgroundColor: '#111', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#222', marginBottom: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
