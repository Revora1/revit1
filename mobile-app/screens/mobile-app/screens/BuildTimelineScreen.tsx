import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export default function BuildTimelineScreen({ route, navigation }: any) {
  const { carId } = route.params;
  const [car, setCar] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Log Modal
  const [showAddLog, setShowAddLog] = useState(false);
  const [logTitle, setLogTitle] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [logCost, setLogCost] = useState('');

  useEffect(() => {
    fetchData();
  }, [carId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const carDoc = await getDoc(doc(db, 'garage', carId));
      if (carDoc.exists()) setCar(carDoc.data());

      const q = query(
        collection(db, 'garage', carId, 'build_logs'),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const submitLog = async () => {
    if (!logTitle.trim()) return;
    try {
      await addDoc(collection(db, 'garage', carId, 'build_logs'), {
        title: logTitle,
        description: logDesc,
        cost: Number(logCost) || 0,
        date: serverTimestamp(),
      });
      setShowAddLog(false);
      setLogTitle('');
      setLogDesc('');
      setLogCost('');
      fetchData();
    } catch (e) {
      Alert.alert('Error', 'Could not add build log');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Build Timeline</Text>
        <TouchableOpacity onPress={() => setShowAddLog(true)} style={styles.backBtn}>
           <Ionicons name="add" size={28} color="#e53935" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#e53935" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ padding: 16 }}>
           <View style={styles.carHeader}>
              <Text style={styles.carTitle}>{car?.year} {car?.make} {car?.model}</Text>
              <Text style={styles.totalCost}>
                Total Invested: ${logs.reduce((sum, log) => sum + (log.cost || 0), 0).toLocaleString()}
              </Text>
           </View>

           <View style={styles.timeline}>
             {logs.length === 0 ? (
               <Text style={styles.emptyText}>No build logs yet. Track your first mod!</Text>
             ) : (
               logs.map((log, index) => (
                 <View key={log.id} style={styles.logItem}>
                    <View style={styles.timelineNode} />
                    {index !== logs.length - 1 && <View style={styles.timelineLine} />}
                    <View style={styles.logContent}>
                       <Text style={styles.logDate}>
                         {log.date?.toDate ? log.date.toDate().toLocaleDateString() : 'Just now'}
                       </Text>
                       <Text style={styles.logTitle}>{log.title}</Text>
                       {log.description ? <Text style={styles.logDesc}>{log.description}</Text> : null}
                       {log.cost > 0 && <Text style={styles.logCost}>${log.cost.toLocaleString()}</Text>}
                    </View>
                 </View>
               ))
             )}
           </View>
        </ScrollView>
      )}

      {/* Add Log Modal */}
      <Modal visible={showAddLog} animationType="slide" presentationStyle="pageSheet">
         <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Mod/Maintenance</Text>
              <TouchableOpacity onPress={() => setShowAddLog(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
               <Text style={styles.label}>Title (e.g. Coilovers Installed)</Text>
               <TextInput style={styles.input} value={logTitle} onChangeText={setLogTitle} placeholderTextColor="#666" placeholder="Mod name" />
               
               <Text style={styles.label}>Cost ($)</Text>
               <TextInput style={styles.input} value={logCost} onChangeText={setLogCost} keyboardType="numeric" placeholderTextColor="#666" placeholder="0" />
               
               <Text style={styles.label}>Details (Optional)</Text>
               <TextInput style={[styles.input, styles.textArea]} value={logDesc} onChangeText={setLogDesc} multiline placeholderTextColor="#666" placeholder="Installed at the shop, took 4 hours..." />

               <TouchableOpacity style={styles.submitBtn} onPress={submitLog}>
                  <Text style={styles.submitText}>Save Log</Text>
               </TouchableOpacity>
            </View>
         </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  content: { flex: 1 },
  carHeader: { backgroundColor: '#111', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#222' },
  carTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  totalCost: { color: '#e53935', fontSize: 16, fontWeight: 'bold' },
  timeline: { paddingLeft: 8 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 20 },
  logItem: { position: 'relative', paddingLeft: 30, marginBottom: 24 },
  timelineNode: { position: 'absolute', left: 0, top: 4, width: 12, height: 12, borderRadius: 6, backgroundColor: '#e53935', zIndex: 2 },
  timelineLine: { position: 'absolute', left: 5, top: 16, bottom: -24, width: 2, backgroundColor: '#333', zIndex: 1 },
  logContent: { backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  logDate: { color: '#888', fontSize: 12, marginBottom: 4 },
  logTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  logDesc: { color: '#ccc', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  logCost: { color: '#4caf50', fontSize: 14, fontWeight: 'bold' },
  
  modalSafeArea: { flex: 1, backgroundColor: '#111' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  label: { color: '#888', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#222', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 20 },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#e53935', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
