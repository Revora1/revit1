import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function TopTunersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('followersCount', 'desc'), limit(20));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleFollow = async (userId: string) => {
    try {
      await addDoc(collection(db, 'follows'), {
        followerId: auth.currentUser?.uid,
        followingId: userId,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'users', userId), {
        followersCount: increment(1)
      });
      Alert.alert('Followed', 'You are now following this tuner.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
        ) : users.length > 0 ? (
          users.map((u, index) => (
            <View key={u.id} style={styles.row}>
              <Text style={styles.rank}>{index + 1}</Text>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#666" />
              </View>
              <View style={styles.info}>
                <Text style={styles.username}>@{u.username}</Text>
                <Text style={styles.followers}>{u.followersCount || 0} Followers</Text>
              </View>
              <TouchableOpacity style={styles.followBtn} onPress={() => handleFollow(u.id)}>
                <Text style={styles.followBtnText}>Follow</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No top tuners found.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1 },
  scrollContent: { padding: 16 },
  row: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  rank: { color: '#888', fontSize: 18, fontWeight: 'bold', width: 30 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  info: { flex: 1 },
  username: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  followers: { color: '#aaa', fontSize: 14 },
  followBtn: { backgroundColor: '#e53935', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  followBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  empty: { color: '#666', textAlign: 'center', marginTop: 40 }
});
