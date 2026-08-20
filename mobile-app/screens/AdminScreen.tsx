import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
import { collection, query, orderBy, getDocs, deleteDoc, doc, limit, where, getDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'giveaways' | 'videos'>('reports');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [giveawayTickets, setGiveawayTickets] = useState<any[]>([]);
  const [adminVideos, setAdminVideos] = useState<any[]>([]);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoThumbnail, setNewVideoThumbnail] = useState('');
  const [milestonesConfig, setMilestonesConfig] = useState<any[]>([
    { target: '10000', prize: '£50 Giftcard', image: '', carMake: '', carModel: '', carYear: '', carPower: '' },
    { target: '100000', prize: '£1000 Cash', image: '', carMake: '', carModel: '', carYear: '', carPower: '' },
    { target: '1000000', prize: 'A Brand New Car', image: '', carMake: '', carModel: '', carYear: '', carPower: '' }
  ]);
  const [savingMilestones, setSavingMilestones] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === 'users') {
        const q = query(collection(db, 'users'), limit(50));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === 'giveaways') {
        // Fetch Tickets
        const ticketsQ = query(collection(db, 'giveaways', 'community_milestone_1', 'tickets'));
        const ticketsSnap = await getDocs(ticketsQ);
        
        const userPromises = ticketsSnap.docs.map(async (docSnap) => {
           const userId = docSnap.id;
           const carQ = query(collection(db, 'garage'), where('ownerId', '==', userId), limit(1));
           const carSnap = await getDocs(carQ);
           if (carSnap.empty) return null;
           
           const postQ = query(collection(db, 'posts'), where('authorId', '==', userId), limit(1));
           const postSnap = await getDocs(postQ);
           if (postSnap.empty) return null;
           
           const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
           if (!userDoc.empty) {
              const userData = userDoc.docs[0].data();
              return { userId, username: userData.username, ...docSnap.data() };
           }
           return { userId, username: 'Unknown', ...docSnap.data() };
        });
        
        let tickets = await Promise.all(userPromises);
        tickets = tickets.filter(t => t !== null);
        setGiveawayTickets(tickets);
        
        // Fetch Config
        const configSnap = await getDoc(doc(db, 'giveaways', 'config'));
        if (configSnap.exists() && configSnap.data().milestones) {
          // ensure fields are string for inputs
          const mapped = configSnap.data().milestones.map((m: any) => ({
            ...m,
            target: m.target ? String(m.target) : '',
            carYear: m.carYear ? String(m.carYear) : '',
          }));
          setMilestonesConfig(mapped);
        }
      } else if (activeTab === 'videos') {
        const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setAdminVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (err) {
      console.log('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // -- Handlers --
  
  const resolveReport = async (reportId: string) => {
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      Alert.alert('Error', 'Failed to resolve report.');
    }
  };

  const deleteUser = async (userId: string) => {
    Alert.alert(
      "Delete User",
      "Are you sure you want to permanently delete this user account? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', userId));
              setUsers(prev => prev.filter(u => u.uid !== userId && u.id !== userId));
              Alert.alert('Success', 'User deleted.');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete user.');
            }
          }
        }
      ]
    );
  };

  const handleMilestoneChange = (index: number, field: string, value: string) => {
    const newM = [...milestonesConfig];
    newM[index][field] = value;
    setMilestonesConfig(newM);
  };

  const saveMilestones = async () => {
    setSavingMilestones(true);
    try {
      // parse back to numbers if needed
      const payload = milestonesConfig.map(m => ({
        ...m,
        target: Number(m.target) || 0
      }));
      await setDoc(doc(db, 'giveaways', 'config'), { milestones: payload }, { merge: true });
      Alert.alert('Success', 'Milestones saved!');
    } catch (e) {
      Alert.alert('Error', 'Failed to save milestones.');
    }
    setSavingMilestones(false);
  };

  const handleDrawWinner = async (idx: number) => {
    if (giveawayTickets.length === 0) return Alert.alert('Error', 'No tickets found');
    const winner = giveawayTickets[Math.floor(Math.random() * giveawayTickets.length)];
    const updatedMilestones = [...milestonesConfig];
    updatedMilestones[idx].winnerUsername = winner.username;
    updatedMilestones[idx].winnerId = winner.userId;
    updatedMilestones[idx].status = 'drawn';
    setMilestonesConfig(updatedMilestones);
    try {
      await setDoc(doc(db, 'giveaways', 'config'), { milestones: updatedMilestones }, { merge: true });
      Alert.alert('Winner Drawn!', `Winner: ${winner.username}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to save winner.');
    }
  };

  const addVideo = async () => {
    if (!newVideoTitle || !newVideoUrl) {
      return Alert.alert('Error', 'Title and Video are required');
    }
    setSavingMilestones(true);
    try {
      let videoDownloadUrl = newVideoUrl;
      let thumbnailDownloadUrl = newVideoThumbnail;

      if (newVideoUrl.startsWith('file://') || newVideoUrl.startsWith('content://')) {
        const response = await fetch(newVideoUrl);
        const blob = await response.blob();
        const filename = `videos/${Date.now()}.mp4`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        videoDownloadUrl = await getDownloadURL(storageRef);
      }

      if (newVideoThumbnail && (newVideoThumbnail.startsWith('file://') || newVideoThumbnail.startsWith('content://'))) {
        const response = await fetch(newVideoThumbnail);
        const blob = await response.blob();
        const filename = `thumbnails/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        thumbnailDownloadUrl = await getDownloadURL(storageRef);
      }

      const docRef = await addDoc(collection(db, 'videos'), {
        title: newVideoTitle,
        videoUrl: videoDownloadUrl,
        thumbnailUrl: thumbnailDownloadUrl,
        createdAt: serverTimestamp(),
      });
      setAdminVideos(prev => [{ id: docRef.id, title: newVideoTitle, videoUrl: videoDownloadUrl, thumbnailUrl: thumbnailDownloadUrl, createdAt: new Date() }, ...prev]);
      setNewVideoTitle('');
      setNewVideoUrl('');
      setNewVideoThumbnail('');
      Alert.alert('Success', 'Video added successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to add video');
    }
    setSavingMilestones(false);
  };

  const pickVideo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission needed', 'Allow camera roll access to pick videos.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setNewVideoUrl(result.assets[0].uri);
    }
  };

  const pickThumbnail = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission needed', 'Allow camera roll access to pick photos.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setNewVideoThumbnail(result.assets[0].uri);
    }
  };

  const deleteVideo = async (videoId: string) => {
    Alert.alert("Delete Video", "Are you sure you want to delete this video?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteDoc(doc(db, 'videos', videoId));
            setAdminVideos(prev => prev.filter(v => v.id !== videoId));
            Alert.alert('Success', 'Video deleted.');
          } catch (err) {
            Alert.alert('Error', 'Failed to delete video.');
          }
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
      </View>
      
      <View style={styles.tabContainer}>
        {(['reports', 'users', 'giveaways', 'videos'] as const).map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
        ) : (
          <>
            {activeTab === 'reports' && (
              reports.length > 0 ? (
                reports.map(report => (
                  <View key={report.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="warning" size={20} color="#e53935" />
                      <Text style={styles.dateText}>
                        {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString() : 'Just now'}
                      </Text>
                    </View>
                    <Text style={styles.infoText}>Target Type: <Text style={styles.boldText}>{report.targetType || 'Post'}</Text></Text>
                    <Text style={styles.infoText}>Target ID: <Text style={styles.boldText}>{report.targetId || report.postId}</Text></Text>
                    <Text style={styles.infoText}>Reason: {report.reason}</Text>
                    <Text style={styles.infoText}>Reporter: {report.reporterId || report.reportedBy}</Text>
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.dangerBtn} onPress={() => resolveReport(report.id)}>
                        <Text style={styles.dangerBtnText}>DELETE REPORT</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={64} color="#4caf50" />
                  <Text style={styles.emptyText}>All Clear!</Text>
                  <Text style={styles.emptySubtext}>There are no pending reports to review.</Text>
                </View>
              )
            )}

            {activeTab === 'users' && (
              users.length > 0 ? (
                users.map(u => (
                  <View key={u.id || u.uid} style={styles.userCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.boldText}>{u.username || 'Unknown'}</Text>
                      <Text style={styles.infoText}>UID: {u.uid || u.id}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteUser(u.uid || u.id)} style={styles.iconBtn}>
                      <Ionicons name="trash" size={20} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySubtext}>No users found.</Text>
              )
            )}

            {activeTab === 'giveaways' && (
              <View style={styles.giveawayContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Milestone Config</Text>
                  <TouchableOpacity 
                    style={styles.saveBtn} 
                    onPress={saveMilestones} 
                    disabled={savingMilestones}
                  >
                    <Text style={styles.saveBtnText}>{savingMilestones ? 'Saving...' : 'SAVE'}</Text>
                  </TouchableOpacity>
                </View>

                {milestonesConfig.map((m, idx) => (
                  <View key={idx} style={styles.card}>
                    <Text style={styles.milestoneLabel}>Milestone {idx + 1}</Text>
                    
                    <View style={styles.inputRow}>
                      <View style={{flex: 1, marginRight: 8}}>
                        <Text style={styles.inputLabel}>TARGET USERS</Text>
                        <TextInput style={styles.input} value={m.target} onChangeText={(t) => handleMilestoneChange(idx, 'target', t)} keyboardType="numeric" />
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.inputLabel}>PRIZE NAME</Text>
                        <TextInput style={styles.input} value={m.prize} onChangeText={(t) => handleMilestoneChange(idx, 'prize', t)} />
                      </View>
                    </View>

                    <View style={styles.inputRow}>
                      <View style={{flex: 1, marginRight: 8}}>
                        <Text style={styles.inputLabel}>MAKE</Text>
                        <TextInput style={styles.input} value={m.carMake} onChangeText={(t) => handleMilestoneChange(idx, 'carMake', t)} placeholder="BMW" placeholderTextColor="#555" />
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.inputLabel}>MODEL</Text>
                        <TextInput style={styles.input} value={m.carModel} onChangeText={(t) => handleMilestoneChange(idx, 'carModel', t)} placeholder="M3" placeholderTextColor="#555" />
                      </View>
                    </View>

                    <View style={styles.inputRow}>
                      <View style={{flex: 1, marginRight: 8}}>
                        <Text style={styles.inputLabel}>YEAR</Text>
                        <TextInput style={styles.input} value={m.carYear} onChangeText={(t) => handleMilestoneChange(idx, 'carYear', t)} placeholder="2023" placeholderTextColor="#555" />
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.inputLabel}>POWER (HP)</Text>
                        <TextInput style={styles.input} value={m.carPower} onChangeText={(t) => handleMilestoneChange(idx, 'carPower', t)} placeholder="500 HP" placeholderTextColor="#555" />
                      </View>
                    </View>

                    <TouchableOpacity style={styles.drawBtn} onPress={() => handleDrawWinner(idx)}>
                      <Text style={styles.drawBtnText}>DRAW WINNER</Text>
                    </TouchableOpacity>
                    
                    {m.winnerUsername && (
                      <Text style={styles.winnerText}>Winner: {m.winnerUsername}</Text>
                    )}
                  </View>
                ))}

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Active Milestone Entries</Text>
                  <Text style={styles.infoText}>Total Entries: {giveawayTickets.length}</Text>
                </View>

                {giveawayTickets.map(t => (
                  <View key={t.userId} style={styles.userCard}>
                    <Text style={styles.boldText}>{t.username || t.userId}</Text>
                    <Text style={styles.accentText}>{t.referralBonusCount || 0} bonuses</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'videos' && (
              <View style={styles.giveawayContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Add New Video</Text>
                  <TouchableOpacity 
                    style={styles.saveBtn} 
                    onPress={addVideo} 
                    disabled={savingMilestones}
                  >
                    <Text style={styles.saveBtnText}>{savingMilestones ? 'Adding...' : 'ADD VIDEO'}</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.card}>
                  <Text style={styles.inputLabel}>VIDEO TITLE</Text>
                  <TextInput style={[styles.input, {marginBottom: 12}]} value={newVideoTitle} onChangeText={setNewVideoTitle} placeholder="e.g., Track Day VLOG" placeholderTextColor="#555" />
                  
                  <Text style={styles.inputLabel}>VIDEO FILE</Text>
                  <TouchableOpacity onPress={pickVideo} style={[styles.input, {marginBottom: 12, justifyContent: 'center'}]}>
                    <Text style={{color: newVideoUrl ? '#4caf50' : '#555'}}>{newVideoUrl ? 'Video Selected' : 'Tap to select video from camera roll'}</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.inputLabel}>THUMBNAIL IMAGE (OPTIONAL)</Text>
                  <TouchableOpacity onPress={pickThumbnail} style={[styles.input, {justifyContent: 'center'}]}>
                    <Text style={{color: newVideoThumbnail ? '#4caf50' : '#555'}}>{newVideoThumbnail ? 'Thumbnail Selected' : 'Tap to select thumbnail from camera roll'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Manage Videos</Text>
                  <Text style={styles.infoText}>{adminVideos.length} Videos</Text>
                </View>

                {adminVideos.map(v => (
                  <View key={v.id} style={styles.userCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.boldText}>{v.title || 'Untitled'}</Text>
                      <Text style={[styles.infoText, {fontSize: 10}]} numberOfLines={1}>{v.videoUrl}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteVideo(v.id)} style={styles.iconBtn}>
                      <Ionicons name="trash" size={20} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  header: { padding: 16, paddingBottom: 0 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#e53935' },
  tabText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  tabTextActive: { color: '#fff' },

  content: { flex: 1, padding: 16 },
  
  card: { backgroundColor: '#111', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dateText: { color: '#aaa', fontSize: 12, marginLeft: 8 },
  infoText: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  boldText: { fontWeight: 'bold', color: '#fff' },
  
  actionRow: { flexDirection: 'row', marginTop: 16, justifyContent: 'flex-end' },
  dangerBtn: { backgroundColor: '#e53935', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  dangerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },
  
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(229,57,53,0.1)', borderRadius: 8 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#ff9800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  saveBtnText: { color: '#000', fontWeight: 'bold', fontSize: 12 },

  giveawayContainer: { paddingBottom: 20 },
  milestoneLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  inputRow: { flexDirection: 'row', marginBottom: 12 },
  inputLabel: { color: '#888', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  input: { backgroundColor: '#1a1a1a', color: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333', fontSize: 14 },
  
  drawBtn: { backgroundColor: '#ff9800', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  drawBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  winnerText: { color: '#ff9800', fontWeight: 'bold', textAlign: 'center', marginTop: 12 },
  accentText: { color: '#ff9800', fontWeight: 'bold', fontSize: 12 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptySubtext: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 20 }
});
