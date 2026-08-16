import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, Image, Linking } from 'react-native';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function MechanicBoardScreen() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'mechanics'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedShops = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setShops(fetchedShops);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddShop = async () => {
    if (!companyName || !location || !specialties) {
      return Alert.alert('Required', 'Please fill in Company Name, Location, and Specialties');
    }
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'mechanics'), {
        companyName,
        specialties,
        location,
        phone,
        website,
        email,
        bannerUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=1200', // Default image for mobile
        addedBy: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      });
      
      setShowModal(false);
      setCompanyName(''); setSpecialties(''); setLocation('');
      setPhone(''); setWebsite(''); setEmail('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredShops = shops.filter(shop => {
    const term = searchQuery.toLowerCase();
    return (
      (shop.companyName && shop.companyName.toLowerCase().includes(term)) ||
      (shop.specialties && shop.specialties.toLowerCase().includes(term)) ||
      (shop.location && shop.location.toLowerCase().includes(term))
    );
  });

  return (
    <View style={styles.container}>
      {/* Search Bar & Add Button */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search shops, locations..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#EAB308" style={{ marginTop: 40 }} />
        ) : filteredShops.length > 0 ? (
          filteredShops.map((shop) => (
            <View key={shop.id} style={styles.card}>
              <Image 
                source={{ uri: shop.bannerUrl || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=1200' }} 
                style={styles.cardImage} 
              />
              <View style={styles.cardContent}>
                <Text style={styles.companyName}>{shop.companyName}</Text>
                <Text style={styles.specialties}>{shop.specialties}</Text>
                
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#999" />
                  <Text style={styles.infoText}>{shop.location}</Text>
                </View>
                
                <View style={styles.actionsRow}>
                  {shop.phone ? (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${shop.phone}`)}>
                      <Ionicons name="call" size={16} color="#EAB308" />
                      <Text style={styles.actionBtnText}>Call</Text>
                    </TouchableOpacity>
                  ) : null}
                  {shop.website ? (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(shop.website.startsWith('http') ? shop.website : `https://${shop.website}`)}>
                      <Ionicons name="globe" size={16} color="#3B82F6" />
                      <Text style={styles.actionBtnText}>Website</Text>
                    </TouchableOpacity>
                  ) : null}
                  {shop.email ? (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`mailto:${shop.email}`)}>
                      <Ionicons name="mail" size={16} color="#10B981" />
                      <Text style={styles.actionBtnText}>Email</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No shops found</Text>
        )}
      </ScrollView>

      {/* Add Shop Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Shop</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formScroll}>
              <Text style={styles.label}>Company Name *</Text>
              <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="e.g. Elite Tuning" placeholderTextColor="#666" />
              
              <Text style={styles.label}>Specialties *</Text>
              <TextInput style={styles.input} value={specialties} onChangeText={setSpecialties} placeholder="e.g. Euro, Dyno, Fabrications" placeholderTextColor="#666" />
              
              <Text style={styles.label}>Location *</Text>
              <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="City, State" placeholderTextColor="#666" />
              
              <Text style={styles.label}>Phone Number</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="(555) 123-4567" placeholderTextColor="#666" keyboardType="phone-pad" />
              
              <Text style={styles.label}>Website URL</Text>
              <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholder="www.elitetuning.com" placeholderTextColor="#666" keyboardType="url" autoCapitalize="none" />
              
              <Text style={styles.label}>Email Address</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="info@elitetuning.com" placeholderTextColor="#666" keyboardType="email-address" autoCapitalize="none" />
              
              <TouchableOpacity style={[styles.submitButton, submitting && { opacity: 0.7 }]} onPress={handleAddShop} disabled={submitting}>
                <Text style={styles.submitButtonText}>{submitting ? 'Adding...' : 'Add Shop'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', padding: 15, paddingBottom: 10, alignItems: 'center', gap: 10 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, color: '#fff', marginLeft: 10, fontSize: 14 },
  addButton: { width: 40, height: 40, backgroundColor: '#EAB308', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 15, paddingBottom: 40 },
  card: { backgroundColor: '#111', borderRadius: 12, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  cardImage: { width: '100%', height: 140, backgroundColor: '#222' },
  cardContent: { padding: 15 },
  companyName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  specialties: { color: '#EAB308', fontSize: 14, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoText: { color: '#999', fontSize: 14, marginLeft: 6 },
  actionsRow: { flexDirection: 'row', gap: 15 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, gap: 6 },
  actionBtnText: { color: '#ddd', fontSize: 13, fontWeight: '500' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  formScroll: { paddingBottom: 40 },
  label: { color: '#aaa', fontSize: 14, marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#000', borderWidth: 1, borderColor: '#333', borderRadius: 8, color: '#fff', padding: 12, fontSize: 16 },
  submitButton: { backgroundColor: '#EAB308', borderRadius: 8, padding: 15, alignItems: 'center', marginTop: 30, marginBottom: 40 },
  submitButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});
