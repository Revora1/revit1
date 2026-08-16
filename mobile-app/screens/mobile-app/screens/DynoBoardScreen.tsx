import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function DynoBoardScreen() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [hp, setHp] = useState('');
  const [tq, setTq] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = async () => {
    try {
      const q = query(collection(db, 'performance_board'), orderBy('horsepower', 'desc'), limit(20));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
        ) : records.length > 0 ? (
          records.map((record, index) => (
            <View key={record.id} style={styles.row}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <View style={styles.info}>
                <Text style={styles.carName}>{record.carMake} {record.carModel}</Text>
                <Text style={styles.owner}>@{record.ownerUsername || 'tuner'}</Text>
              </View>
              <View style={styles.stats}>
                <Text style={styles.hp}>{record.horsepower} HP</Text>
                {record.torque && <Text style={styles.tq}>{record.torque} TQ</Text>}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No dyno records found.</Text>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Dyno Record</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalForm}>
            <TextInput style={styles.input} placeholder="Car Make (e.g. Toyota)" placeholderTextColor="#666" value={make} onChangeText={setMake} />
            <TextInput style={styles.input} placeholder="Car Model (e.g. Supra)" placeholderTextColor="#666" value={model} onChangeText={setModel} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TextInput style={[styles.input, { width: '48%' }]} placeholder="HP" placeholderTextColor="#666" keyboardType="numeric" value={hp} onChangeText={setHp} />
              <TextInput style={[styles.input, { width: '48%' }]} placeholder="Torque" placeholderTextColor="#666" keyboardType="numeric" value={tq} onChangeText={setTq} />
            </View>
            <TouchableOpacity style={styles.submitBtn} onPress={handleAddRecord} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Submit Record</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  row: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  rank: { color: '#e53935', fontSize: 20, fontWeight: 'bold', width: 40 },
  info: { flex: 1 },
  carName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  owner: { color: '#888', fontSize: 14 },
  stats: { alignItems: 'flex-end' },
  hp: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  tq: { color: '#aaa', fontSize: 14 },
  empty: { color: '#666', textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#111' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalForm: { padding: 20 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 16 },
  submitBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
