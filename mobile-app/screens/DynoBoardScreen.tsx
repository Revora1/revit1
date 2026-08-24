import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function DynoBoardScreen() {
  const navigation = useNavigation<any>();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'my_runs'>('discover');
  const [showModal, setShowModal] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [hp, setHp] = useState('');
  const [tq, setTq] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = async () => {
    try {
      const q = query(collection(db, 'performance_board'), orderBy('horsepower', 'desc'), limit(50));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleAddRecord = async () => {
    if (!make || !model || !hp) return Alert.alert('Required', 'Please fill in make, model, and horsepower');
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'performance_board'), {
        ownerId: auth.currentUser?.uid,
        ownerUsername: auth.currentUser?.displayName || 'tuner',
        carMake: make,
        carModel: model,
        horsepower: parseInt(hp, 10),
        torque: tq ? parseInt(tq, 10) : null,
        status: 'verified',
        createdAt: serverTimestamp()
      });
      setShowModal(false);
      setMake(''); setModel(''); setHp(''); setTq('');
      fetchRecords();
      Alert.alert('Success', 'Dyno record submitted!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    Alert.alert('Delete Record', 'Are you sure you want to remove this dyno record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'performance_board', recordId));
          setRecords(prev => prev.filter(r => r.id !== recordId));
        } catch (err: any) {
          Alert.alert('Error', err.message);
        }
      }}
    ]);
  };

  const displayRecords = activeTab === 'discover'
    ? records
    : records.filter(r => r.ownerId === auth.currentUser?.uid);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DYNO BOARD</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={18} color="#000" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
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
          style={[styles.tab, activeTab === 'my_runs' && styles.activeTab]} 
          onPress={() => setActiveTab('my_runs')}
        >
          <Text style={[styles.tabText, activeTab === 'my_runs' && styles.activeTabText]}>My Runs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 60 }} />
        ) : displayRecords.length > 0 ? (
          displayRecords.map((record, index) => (
            <View key={record.id} style={styles.card}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.carName}>{record.carMake} {record.carModel}</Text>
                <Text style={styles.owner}>@{record.ownerUsername || 'tuner'}</Text>
              </View>
              <View style={styles.stats}>
                <Text style={styles.hp}>{record.horsepower} <Text style={{ fontSize: 13, color: '#aaa' }}>HP</Text></Text>
                {record.torque ? <Text style={styles.tq}>{record.torque} <Text style={{ fontSize: 11, color: '#888' }}>TQ</Text></Text> : null}
              </View>
              {record.ownerId === auth.currentUser?.uid && (
                <TouchableOpacity 
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteRecord(record.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#e53935" />
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>
              {activeTab === 'my_runs' ? "You haven't added any dyno runs yet." : "No dyno records found. Create one!"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Record Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Dyno Record</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalForm}>
            <TextInput style={styles.input} placeholder="Car Make (e.g. Toyota)" placeholderTextColor="#666" value={make} onChangeText={setMake} />
            <TextInput style={styles.input} placeholder="Car Model (e.g. Supra MK5)" placeholderTextColor="#666" value={model} onChangeText={setModel} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TextInput style={[styles.input, { width: '48%' }]} placeholder="Horsepower (HP)" placeholderTextColor="#666" keyboardType="numeric" value={hp} onChangeText={setHp} />
              <TextInput style={[styles.input, { width: '48%' }]} placeholder="Torque (TQ lb-ft)" placeholderTextColor="#666" keyboardType="numeric" value={tq} onChangeText={setTq} />
            </View>
            <TouchableOpacity style={styles.submitBtn} onPress={handleAddRecord} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Submit Record</Text>}
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
  card: { backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: '#333' },
  rankText: { color: '#fff', fontWeight: '900', fontStyle: 'italic', fontSize: 14 },
  info: { flex: 1 },
  carName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  owner: { color: '#888', fontSize: 13 },
  stats: { alignItems: 'flex-end', marginLeft: 8 },
  hp: { color: '#fff', fontSize: 18, fontWeight: '900', fontStyle: 'italic' },
  tq: { color: '#aaa', fontSize: 13, fontWeight: '600', marginTop: 2 },
  deleteBtn: { marginLeft: 12, padding: 8 },
  modalContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalForm: { padding: 20 },
  input: { backgroundColor: '#111', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#222', marginBottom: 16 },
  submitBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
