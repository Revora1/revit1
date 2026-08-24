import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, ActivityIndicator, Image, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, getDocs, doc, updateDoc, increment, orderBy, getDoc, setDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function BattlesScreen() {
  const navigation = useNavigation<any>();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'my_entry'>('discover');
  const [hasJoined, setHasJoined] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [myCars, setMyCars] = useState<any[]>([]);
  const [loadingCars, setLoadingCars] = useState(false);

  const d = new Date();
  const currentMonthId = `${d.getFullYear()}_${d.getMonth() + 1}`;

  const fetchEntries = async () => {
    try {
      const q = query(collection(db, 'battles', currentMonthId, 'entries'), orderBy('votes', 'desc'));
      const snap = await getDocs(q);
      const docs = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setEntries(docs);
      
      if (auth.currentUser) {
        const joined = docs.some(entry => entry.id === auth.currentUser?.uid);
        setHasJoined(joined);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchMyCars = async () => {
    if (!auth.currentUser) return;
    setLoadingCars(true);
    try {
      const q = query(collection(db, 'garage'), where('ownerId', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      setMyCars(snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load your garage.');
    } finally {
      setLoadingCars(false);
    }
  };

  const handleOpenJoin = () => {
    if (!auth.currentUser) {
      Alert.alert('Login Required', 'You must be logged in to join battles.');
      return;
    }
    setShowJoinModal(true);
    fetchMyCars();
  };

  const handleJoin = async (car: any) => {
    if (!auth.currentUser) return;
    try {
      const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userSnap.exists() ? userSnap.data() : {};

      const entryRef = doc(db, 'battles', currentMonthId, 'entries', auth.currentUser.uid);
      await setDoc(entryRef, {
        carId: car.id,
        userId: auth.currentUser.uid,
        votes: 0,
        coverImage: car.coverImage || '',
        make: car.make || '',
        model: car.model || '',
        year: car.year || '',
        ownerUsername: userData.username || 'Anonymous',
        ownerProfilePic: userData.profilePic || '',
        createdAt: Date.now()
      });

      const monthRef = doc(db, 'battles', currentMonthId);
      await setDoc(monthRef, { active: true }, { merge: true });

      setShowJoinModal(false);
      Alert.alert('Success', 'You have entered the battle!');
      fetchEntries();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleVote = async (entryId: string) => {
    try {
      await updateDoc(doc(db, 'battles', currentMonthId, 'entries', entryId), {
        votes: increment(1)
      });
      Alert.alert('Voted!', 'Your vote has been counted.');
      fetchEntries();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const displayEntries = activeTab === 'discover'
    ? entries
    : entries.filter(e => e.userId === auth.currentUser?.uid || e.id === auth.currentUser?.uid);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CAR BATTLES</Text>
        </View>
        {!hasJoined && (
          <TouchableOpacity style={styles.createBtn} onPress={handleOpenJoin}>
            <Ionicons name="add" size={18} color="#000" />
            <Text style={styles.createBtnText}>Join Battle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]} 
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>Discover</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'my_entry' && styles.activeTab]} 
          onPress={() => setActiveTab('my_entry')}
        >
          <Text style={[styles.tabText, activeTab === 'my_entry' && styles.activeTabText]}>My Entry</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 60 }} />
        ) : displayEntries.length > 0 ? (
          displayEntries.map((entry, index) => {
            const img = entry.coverImage || entry.carCoverImage;
            const make = entry.make || entry.carMake;
            const model = entry.model || entry.carModel;
            return (
              <View key={entry.id} style={styles.card}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.image} />
                ) : (
                  <View style={styles.noImage}>
                    <Ionicons name="car-sport-outline" size={40} color="#666" />
                  </View>
                )}
                <View style={styles.info}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{make} {model}</Text>
                    <Text style={styles.owner}>@{entry.ownerUsername || 'tuner'}</Text>
                    <Text style={styles.votes}>{entry.votes || 0} Votes</Text>
                  </View>
                  <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote(entry.id)}>
                    <Ionicons name="flame" size={18} color="#000" style={{ marginRight: 4 }} />
                    <Text style={styles.voteBtnText}>Vote</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>
              {activeTab === 'my_entry' ? "You haven't entered this month's battle yet." : "No battles currently active. Enter yours!"}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showJoinModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Car to Enter</Text>
            <TouchableOpacity onPress={() => setShowJoinModal(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {loadingCars ? (
            <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
          ) : myCars.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={styles.emptyCars}>You have no cars in your garage. Add a car to your garage first!</Text>
            </View>
          ) : (
            <FlatList
              data={myCars}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.carSelectCard} onPress={() => handleJoin(item)}>
                  {item.coverImage ? (
                    <Image source={{ uri: item.coverImage }} style={styles.carSelectImg} />
                  ) : (
                    <View style={styles.noCarSelectImg}><Ionicons name="car" size={24} color="#666" /></View>
                  )}
                  <Text style={styles.carSelectText}>{item.make} {item.model}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              )}
            />
          )}
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
  image: { width: '100%', height: 200 },
  noImage: { width: '100%', height: 160, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  info: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  owner: { color: '#aaa', fontSize: 13, marginBottom: 6 },
  votes: { color: '#fff', fontSize: 15, fontWeight: '900', fontStyle: 'italic' },
  voteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  voteBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  modalContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  emptyCars: { color: '#aaa', textAlign: 'center', fontSize: 15, lineHeight: 22 },
  carSelectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  carSelectImg: { width: 54, height: 54, borderRadius: 8, marginRight: 12 },
  noCarSelectImg: { width: 54, height: 54, borderRadius: 8, marginRight: 12, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  carSelectText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
