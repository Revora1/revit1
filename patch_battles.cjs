const fs = require('fs');

const code = `import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, ActivityIndicator, Image, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { collection, query, getDocs, doc, updateDoc, increment, orderBy, getDoc, setDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function BattlesScreen() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [myCars, setMyCars] = useState<any[]>([]);
  const [loadingCars, setLoadingCars] = useState(false);

  const d = new Date();
  const currentMonthId = \`\${d.getFullYear()}_\${d.getMonth() + 1}\`;

  const fetchEntries = async () => {
    try {
      const q = query(collection(db, 'battles', currentMonthId, 'entries'), orderBy('votes', 'desc'));
      const snap = await getDocs(q);
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      const q = query(collection(db, 'garage'), where('userId', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      setMyCars(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Battle of the Month</Text>
        {!loading && !hasJoined && auth.currentUser && (
          <TouchableOpacity style={styles.joinBtn} onPress={handleOpenJoin}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.joinBtnText}>Join Battle</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#e53935" style={{ marginTop: 40 }} />
        ) : entries.length > 0 ? (
          entries.map(entry => {
            const img = entry.coverImage || entry.carCoverImage;
            const make = entry.make || entry.carMake;
            const model = entry.model || entry.carModel;
            return (
              <View key={entry.id} style={styles.card}>
                {img ? <Image source={{ uri: img }} style={styles.image} /> : <View style={styles.noImage}><Ionicons name="car" size={40} color="#666" /></View>}
                <View style={styles.info}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{make} {model}</Text>
                    <Text style={styles.owner}>@{entry.ownerUsername}</Text>
                    <Text style={styles.votes}>{entry.votes || 0} Votes</Text>
                  </View>
                  <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote(entry.id)}>
                    <Ionicons name="flame" size={20} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.voteBtnText}>Vote</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.empty}>No battles currently active.</Text>
        )}
      </ScrollView>

      <Modal visible={showJoinModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Car to Enter</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {loadingCars ? (
              <ActivityIndicator size="large" color="#e53935" style={{ marginTop: 20 }} />
            ) : myCars.length === 0 ? (
              <Text style={styles.emptyCars}>You have no cars in your garage. Add a car first!</Text>
            ) : (
              <FlatList
                data={myCars}
                keyExtractor={item => item.id}
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  joinBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e53935', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  content: { flex: 1 },
  scrollContent: { padding: 16 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  image: { width: '100%', height: 200 },
  noImage: { width: '100%', height: 200, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  info: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  owner: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  votes: { color: '#e53935', fontSize: 16, fontWeight: 'bold' },
  voteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e53935', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  voteBtnText: { color: '#fff', fontWeight: 'bold' },
  empty: { color: '#666', textAlign: 'center', marginTop: 40 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  emptyCars: { color: '#aaa', textAlign: 'center', padding: 20 },
  carSelectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', padding: 12, borderRadius: 12, marginBottom: 12 },
  carSelectImg: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  noCarSelectImg: { width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  carSelectText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '500' }
});
`;
fs.writeFileSync('/app/applet/mobile-app/screens/BattlesScreen.tsx', code);
