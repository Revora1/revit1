import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Platform, ActivityIndicator, Image, TouchableOpacity, Alert } from 'react-native';
import { collection, query, getDocs, doc, updateDoc, increment, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function BattlesScreen() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const d = new Date();
  const currentMonthId = `${d.getFullYear()}_${d.getMonth() + 1}`;

  const fetchEntries = async () => {
    try {
      const q = query(collection(db, 'battles', currentMonthId, 'entries'), orderBy('votes', 'desc'));
      const snap = await getDocs(q);
      setEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleVote = async (entryId: string) => {
    try {
      await updateDoc(doc(db, 'battles', currentMonthId, 'entries', entryId), {
        votes: increment(1)
      });
      Alert.alert('Voted!', 'Your vote has been counted.');
      fetchEntries(); // Refresh counts
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
        ) : entries.length > 0 ? (
          entries.map(entry => (
            <View key={entry.id} style={styles.card}>
              {entry.carCoverImage ? <Image source={{ uri: entry.carCoverImage }} style={styles.image} /> : <View style={styles.noImage}><Ionicons name="car" size={40} color="#666" /></View>}
              <View style={styles.info}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{entry.carMake} {entry.carModel}</Text>
                  <Text style={styles.owner}>@{entry.ownerUsername}</Text>
                  <Text style={styles.votes}>{entry.votes || 0} Votes</Text>
                </View>
                <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote(entry.id)}>
                  <Ionicons name="flame" size={20} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.voteBtnText}>Vote</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No battles currently active.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
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
  empty: { color: '#666', textAlign: 'center', marginTop: 40 }
});
