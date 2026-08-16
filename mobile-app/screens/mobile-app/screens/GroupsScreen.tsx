import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Platform, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchGroups = async () => {
    try {
      const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'), limit(20));
      const snap = await getDocs(q);
      setGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleJoin = async (groupId: string) => {
    try {
      await addDoc(collection(db, 'groupMembers'), {
        groupId,
        userId: auth.currentUser?.uid,
        role: 'member',
        joinedAt: serverTimestamp()
      });
      Alert.alert('Success', 'You have joined the group!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleCreateGroup = async () => {
    if (!name) return Alert.alert('Required', 'Group name is required');
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'groups'), {
        name,
        description: desc,
        adminId: auth.currentUser?.uid,
        memberCount: 1,
        createdAt: serverTimestamp()
      });
      setShowModal(false);
      setName('');
      setDesc('');
      fetchGroups();
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
        ) : groups.length > 0 ? (
          groups.map(group => (
            <View key={group.id} style={styles.card}>
              {group.coverImage ? <Image source={{ uri: group.coverImage }} style={styles.image} /> : <View style={styles.noImage}><Ionicons name="people" size={40} color="#666" /></View>}
              <View style={styles.info}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{group.name}</Text>
                  <Text style={styles.desc} numberOfLines={2}>{group.description}</Text>
                  <Text style={styles.members}>{group.memberCount || 1} Members</Text>
                </View>
                <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoin(group.id)}>
                  <Text style={styles.joinBtnText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No groups found.</Text>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalForm}>
            <TextInput style={styles.input} placeholder="Group Name" placeholderTextColor="#666" value={name} onChangeText={setName} />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor="#666" multiline value={desc} onChangeText={setDesc} />
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateGroup} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Create Group</Text>}
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
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  image: { width: '100%', height: 150 },
  noImage: { width: '100%', height: 150, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  info: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  desc: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  members: { color: '#666', fontSize: 12 },
  joinBtn: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginLeft: 16 },
  joinBtnText: { color: '#000', fontWeight: 'bold' },
  empty: { color: '#666', textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#111' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalForm: { padding: 20 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
