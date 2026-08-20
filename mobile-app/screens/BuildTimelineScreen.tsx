import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, TextInput, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

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
  const [logCurrency, setLogCurrency] = useState('$');

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
        currency: logCurrency,
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
        <Text style={styles.headerText}>Build Details</Text>
        {car?.ownerId === auth.currentUser?.uid ? (
          <TouchableOpacity onPress={() => setShowAddLog(true)} style={styles.backBtn}>
             <Ionicons name="add" size={28} color="#e53935" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#e53935" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
           
           {/* Car Image & Badge */}
           <View style={styles.imageContainer}>
             <Image 
               source={{ uri: car?.coverImage || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80' }} 
               style={styles.carImage} 
             />
             <View style={styles.badge}>
               <Text style={styles.badgeText}>{car?.stage?.toUpperCase() || 'STOCK'}</Text>
             </View>
           </View>

           <View style={styles.detailsContainer}>
              <Text style={styles.carTitle}>{car?.year} {car?.make} {car?.model}</Text>
              
              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <Ionicons name="pulse-outline" size={16} color="#888" />
                    <Text style={styles.statLabel}>ENGINE/POWER</Text>
                  </View>
                  <Text style={styles.statValue}>{car?.power || 'Unknown'}</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <Ionicons name="calendar-outline" size={16} color="#888" />
                    <Text style={styles.statLabel}>YEAR</Text>
                  </View>
                  <Text style={styles.statValue}>{car?.year || 'Unknown'}</Text>
                </View>
              </View>

              {/* Modifications List */}
              <View style={styles.sectionContainer}>
                 <View style={styles.sectionHeader}>
                    <Ionicons name="build-outline" size={20} color="#fff" />
                    <Text style={styles.sectionTitle}>Modifications List</Text>
                 </View>
                 <View style={styles.modsBox}>
                    <Text style={styles.modsText}>
                      {car?.mods || 'No modifications listed.'}
                    </Text>
                 </View>
              </View>

              {/* Timeline */}
              <View style={styles.sectionContainer}>
                 <View style={styles.sectionHeader}>
                    <Ionicons name="time-outline" size={20} color="#fff" />
                    <Text style={styles.sectionTitle}>Build Timeline</Text>
                 </View>
                 
                 <Text style={styles.totalCost}>
                    Total Invested: {(() => {
                      const totalUSD = logs.filter(l => l.currency === '$' || !l.currency).reduce((s, l) => s + (l.cost || 0), 0);
                      const totalGBP = logs.filter(l => l.currency === '£').reduce((s, l) => s + (l.cost || 0), 0);
                      const totals = [];
                      if (totalUSD > 0) totals.push(`$${totalUSD.toLocaleString()}`);
                      if (totalGBP > 0) totals.push(`£${totalGBP.toLocaleString()}`);
                      if (totals.length === 0) return '$0';
                      return totals.join(' + ');
                    })()}
                 </Text>

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
                             {log.cost > 0 && <Text style={styles.logCost}>{log.currency || '$'}{log.cost.toLocaleString()}</Text>}
                          </View>
                       </View>
                     ))
                   )}
                 </View>
              </View>
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
               
               <Text style={styles.label}>Cost</Text>
               <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                 <TouchableOpacity 
                   onPress={() => {
                     Alert.alert('Select Currency', '', [
                       { text: '$ USD', onPress: () => setLogCurrency('$') },
                       { text: '£ GBP', onPress: () => setLogCurrency('£') },
                       { text: 'Cancel', style: 'cancel' }
                     ]);
                   }} 
                   style={{ backgroundColor: '#222', padding: 16, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: '#333', justifyContent: 'center' }}>
                   <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{logCurrency} ▼</Text>
                 </TouchableOpacity>
                 <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={logCost} onChangeText={setLogCost} keyboardType="numeric" placeholderTextColor="#666" placeholder="0" />
               </View>
               
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111', backgroundColor: '#000', zIndex: 10 },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  content: { flex: 1 },
  
  imageContainer: { width: '100%', height: 250, position: 'relative' },
  carImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  badge: { position: 'absolute', top: 16, left: 16, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  badgeText: { color: '#000', fontSize: 12, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },

  detailsContainer: { padding: 16, marginTop: -20, backgroundColor: '#000', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  carTitle: { color: '#fff', fontSize: 28, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1, marginBottom: 20, textTransform: 'uppercase' },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#111', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#222' },
  statHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  statLabel: { color: '#888', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '600' },

  sectionContainer: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  modsBox: { backgroundColor: '#111', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#222' },
  modsText: { color: '#ccc', fontSize: 14, lineHeight: 22 },

  totalCost: { color: '#e53935', fontSize: 16, fontWeight: 'bold', marginBottom: 20, paddingHorizontal: 4 },
  timeline: { paddingLeft: 8 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 20 },
  logItem: { position: 'relative', paddingLeft: 30, marginBottom: 24 },
  timelineNode: { position: 'absolute', left: 0, top: 4, width: 12, height: 12, borderRadius: 6, backgroundColor: '#e53935', zIndex: 2 },
  timelineLine: { position: 'absolute', left: 5, top: 16, bottom: -24, width: 2, backgroundColor: '#333', zIndex: 1 },
  logContent: { backgroundColor: '#111', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
  logDate: { color: '#888', fontSize: 12, marginBottom: 4 },
  logTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  logDesc: { color: '#aaa', fontSize: 14, marginBottom: 8, lineHeight: 20 },
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
