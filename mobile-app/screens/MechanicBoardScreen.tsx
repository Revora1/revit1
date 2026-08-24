import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { compressImage } from '../lib/imageCompression';

export default function MechanicBoardScreen() {
  const navigation = useNavigation<any>();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'my_shops'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerLocalUri, setBannerLocalUri] = useState<string | null>(null);

  const imagePresets = [
    { name: 'Garage', url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=1200' },
    { name: 'Tuning', url: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&q=80&w=1200' },
    { name: 'Detailing', url: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&q=80&w=1200' },
    { name: 'Engine', url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=1200' }
  ];

  const pickBannerFromCameraRoll = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please grant photo library access to pick a photo from your camera roll.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setBannerLocalUri(uri);
        setBannerUrl(''); // override preset/manual url if camera roll image selected
      }
    } catch (err: any) {
      Alert.alert('Error picking photo', err.message || 'Could not select image from camera roll');
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'mechanics'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedShops = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
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
      let finalBannerUrl = bannerUrl;

      // Upload camera roll photo if selected
      if (bannerLocalUri) {
        const compressedUri = await compressImage(bannerLocalUri);
        const blob: any = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function() { resolve(xhr.response); };
          xhr.onerror = function(e) { reject(new TypeError("Network request failed")); };
          xhr.responseType = "blob";
          xhr.open("GET", compressedUri, true);
          xhr.send(null);
        });

        const filename = `mechanic_banners/${auth.currentUser?.uid || 'anon'}/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        finalBannerUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'mechanics'), {
        companyName,
        specialties,
        location,
        phone,
        website,
        email,
        bannerUrl: finalBannerUrl || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=1200',
        addedBy: auth.currentUser?.uid || 'anonymous',
        userId: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      });
      
      setShowModal(false);
      setCompanyName(''); setSpecialties(''); setLocation('');
      setPhone(''); setWebsite(''); setEmail(''); setBannerUrl(''); setBannerLocalUri(null);
      Alert.alert('Success', 'Shop added to Service Board!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShop = (shopId: string) => {
    Alert.alert('Delete Shop', 'Are you sure you want to remove this shop listing?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'mechanics', shopId));
        } catch (err: any) {
          Alert.alert('Error', err.message);
        }
      }}
    ]);
  };

  const handleRequestQuote = (shop: any) => {
    const currentUserId = auth.currentUser?.uid || 'anonymous';
    const providerId = shop.userId || shop.addedBy || shop.id;
    const chatId = `${currentUserId}_${providerId}`;

    navigation.navigate('Chat', {
      chatId,
      otherUser: {
        id: providerId,
        uid: providerId,
        username: shop.companyName,
        displayName: shop.companyName,
        photoURL: shop.bannerUrl || '',
        initialMessage: `Hi ${shop.companyName}, I would like to request a quote for service regarding: "${shop.specialties || 'General Service'}".`
      }
    });
  };

  const baseShops = activeTab === 'discover'
    ? shops
    : shops.filter(s => s.addedBy === auth.currentUser?.uid);

  const filteredShops = baseShops.filter(shop => {
    const term = searchQuery.toLowerCase();
    return (
      (shop.companyName && shop.companyName.toLowerCase().includes(term)) ||
      (shop.specialties && shop.specialties.toLowerCase().includes(term)) ||
      (shop.location && shop.location.toLowerCase().includes(term))
    );
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SERVICE BOARD</Text>
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
          style={[styles.tab, activeTab === 'my_shops' && styles.activeTab]} 
          onPress={() => setActiveTab('my_shops')}
        >
          <Text style={[styles.tabText, activeTab === 'my_shops' && styles.activeTabText]}>My Shops</Text>
        </TouchableOpacity>
      </View>

      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#666" style={{ marginRight: 8 }} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search shops, services, locations..." 
            placeholderTextColor="#666" 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={16} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 60 }} />
        ) : filteredShops.length > 0 ? (
          filteredShops.map((shop) => (
            <View key={shop.id} style={styles.card}>
              <View style={{ position: 'relative' }}>
                <Image 
                  source={{ uri: shop.bannerUrl || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=1200' }} 
                  style={styles.cardImage} 
                />
                <TouchableOpacity 
                  style={styles.fabQuoteBtn}
                  onPress={() => handleRequestQuote(shop)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-ellipses" size={14} color="#000" />
                  <Text style={styles.fabQuoteText}>Request Quote</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.companyName}>{shop.companyName}</Text>
                    <Text style={styles.specialties}>{shop.specialties}</Text>
                  </View>
                  {shop.addedBy === auth.currentUser?.uid && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#e53935' }]} 
                      onPress={() => handleDeleteShop(shop.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#888" />
                  <Text style={styles.infoText}>{shop.location}</Text>
                </View>
                
                <View style={styles.actionsRow}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#f5d547', flex: 1, justifyContent: 'center' }]} 
                    onPress={() => handleRequestQuote(shop)}
                  >
                    <Ionicons name="chatbubble-ellipses" size={15} color="#000" />
                    <Text style={[styles.actionBtnText, { color: '#000', fontWeight: '900' }]}>Request Quote</Text>
                  </TouchableOpacity>

                  {shop.phone ? (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${shop.phone}`)}>
                      <Ionicons name="call-outline" size={15} color="#fff" />
                      <Text style={styles.actionBtnText}>Call</Text>
                    </TouchableOpacity>
                  ) : null}
                  {shop.website ? (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(shop.website.startsWith('http') ? shop.website : `https://${shop.website}`)}>
                      <Ionicons name="globe-outline" size={15} color="#fff" />
                      <Text style={styles.actionBtnText}>Website</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>
              {activeTab === 'my_shops' ? "You haven't added any shops yet." : "No shops found. Create one!"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Shop Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Shop</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalForm}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: '#888', fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>
                Business Banner Image
              </Text>
              
              {/* Selected Image Preview (from camera roll or preset/URL) */}
              {(bannerLocalUri || bannerUrl) ? (
                <View style={{ height: 140, borderRadius: 12, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: '#333', position: 'relative' }}>
                  <Image source={{ uri: bannerLocalUri || bannerUrl }} style={{ width: '100%', height: '100%' }} />
                  <TouchableOpacity 
                    onPress={() => { setBannerLocalUri(null); setBannerUrl(''); }}
                    style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>Remove Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Primary Camera Roll Picker Button */}
              <TouchableOpacity
                onPress={pickBannerFromCameraRoll}
                style={{
                  backgroundColor: '#222',
                  borderWidth: 1.5,
                  borderColor: '#f5d547',
                  borderStyle: 'dashed',
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  marginBottom: 10
                }}
              >
                <Ionicons name="images-outline" size={22} color="#f5d547" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                  {bannerLocalUri ? 'Change Photo from Camera Roll' : 'Choose Photo from Camera Roll'}
                </Text>
              </TouchableOpacity>

              {/* Optional Stock Photo Presets */}
              <Text style={{ color: '#666', fontSize: 10, marginBottom: 6 }}>Or pick a stock banner preset:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                {imagePresets.map((item, idx) => (
                  <TouchableOpacity 
                    key={idx}
                    onPress={() => { setBannerLocalUri(null); setBannerUrl(item.url); }}
                    style={{ 
                      paddingHorizontal: 12, 
                      paddingVertical: 6, 
                      borderRadius: 16, 
                      backgroundColor: (bannerUrl === item.url && !bannerLocalUri) ? '#f5d547' : '#222',
                      borderWidth: 1,
                      borderColor: (bannerUrl === item.url && !bannerLocalUri) ? '#f5d547' : '#333'
                    }}
                  >
                    <Text style={{ color: (bannerUrl === item.url && !bannerLocalUri) ? '#000' : '#fff', fontSize: 11, fontWeight: 'bold' }}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="Company / Garage Name *" placeholderTextColor="#666" />
            <TextInput style={styles.input} value={specialties} onChangeText={setSpecialties} placeholder="Specialties (e.g. Tuning, Fabrications, Euro) *" placeholderTextColor="#666" />
            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="City, State / Address *" placeholderTextColor="#666" />
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone Number" placeholderTextColor="#666" keyboardType="phone-pad" />
            <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholder="Website URL" placeholderTextColor="#666" keyboardType="url" autoCapitalize="none" />
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email Address" placeholderTextColor="#666" keyboardType="email-address" autoCapitalize="none" />
            
            <TouchableOpacity style={styles.submitBtn} onPress={handleAddShop} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Add Shop</Text>}
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
  searchHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#000', alignItems: 'center' },
  searchContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', height: 44, borderWidth: 1, borderColor: '#222' },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  content: { flex: 1, backgroundColor: '#000' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  empty: { color: '#555', fontSize: 16 },
  card: { backgroundColor: '#111', borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  cardImage: { width: '100%', height: 150, backgroundColor: '#1a1a1a' },
  fabQuoteBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: '#f5d547', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 4, elevation: 4, shadowColor: '#f5d547', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4 },
  fabQuoteText: { color: '#000', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  cardContent: { padding: 16 },
  companyName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  specialties: { color: '#aaa', fontSize: 14, marginBottom: 8, fontStyle: 'italic' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { color: '#888', fontSize: 14, marginLeft: 6 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, gap: 6 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalForm: { padding: 20 },
  input: { backgroundColor: '#111', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#222', marginBottom: 16 },
  submitBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
