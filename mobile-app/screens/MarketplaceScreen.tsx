import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Platform, Image, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert , RefreshControl } from 'react-native';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function MarketplaceScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      const q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'), limit(20));
      const snap = await getDocs(q);
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreateItem = async () => {
    if (!title || !price) {
      Alert.alert('Required', 'Please enter a title and price.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'marketplace'), {
        title,
        price: parseFloat(price),
        description: desc,
        sellerId: auth.currentUser?.uid,
        status: 'available',
        createdAt: serverTimestamp()
      });
      setShowModal(false);
      setTitle('');
      setPrice('');
      setDesc('');
      fetchItems();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" colors={["#e53935"]} />} style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
        ) : items.length > 0 ? (
          items.map(item => (
            <View key={item.id} style={styles.card}>
              {item.images?.[0] ? <Image source={{ uri: item.images[0] }} style={styles.image} /> : <View style={styles.noImage}><Ionicons name="cart-outline" size={40} color="#666" /></View>}
              <View style={styles.info}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.price}>${item.price}</Text>
                <Text style={styles.location}>{item.description || 'No description'}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No marketplace items found.</Text>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>List an Item</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalForm}>
            <TextInput style={styles.input} placeholder="Part Name or Vehicle" placeholderTextColor="#666" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="Price ($)" placeholderTextColor="#666" keyboardType="numeric" value={price} onChangeText={setPrice} />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor="#666" multiline value={desc} onChangeText={setDesc} />
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateItem} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Post Listing</Text>}
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
  image: { width: '100%', height: 200 },
  noImage: { width: '100%', height: 150, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  info: { padding: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  price: { color: '#4caf50', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  location: { color: '#888', fontSize: 14 },
  empty: { color: '#666', textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#111' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalForm: { padding: 20 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 16 },
  textArea: { height: 120, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
