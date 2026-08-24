import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Image, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { compressImage } from '../lib/imageCompression';

const CARD_WIDTH = Dimensions.get('window').width - 32;

export default function MarketplaceScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'my_listings'>('discover');
  const [showModal, setShowModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, price_asc, price_desc
  const [appliedFilters, setAppliedFilters] = useState({ minPrice: '', maxPrice: '', sortBy: 'newest' });
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [currency, setCurrency] = useState('$');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = async () => {
    try {
      const q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to delete this listing?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            try {
               await deleteDoc(doc(db, "marketplace", itemId));
               setItems(prev => prev.filter(item => item.id !== itemId));
               Alert.alert("Success", "Listing deleted.");
            } catch (e) {
               console.error(e);
               Alert.alert("Error", "Could not delete item.");
            }
        }}
      ]
    );
  };

  const pickImage = async () => {
    if (imageUris.length >= 10) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 10 images.');
      return;
    }
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission needed', 'Allow camera roll access to pick photos.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - imageUris.length,
      quality: 0.4,
    });
    if (!result.canceled) {
      const selectedUris = result.assets.map(asset => asset.uri);
      setImageUris(prev => [...prev, ...selectedUris].slice(0, 10));
    }
  };

  const handleCreateItem = async () => {
    if (!title || !price) {
      Alert.alert('Required', 'Please enter a title and price.');
      return;
    }
    setSubmitting(true);
    try {
      const uploadPromises = imageUris.map(async (originalUri, index) => {
        const compressedUri = await compressImage(originalUri);
        const response = await fetch(compressedUri);
        const blob = await response.blob();
        const filename = `marketplace/${auth.currentUser?.uid}/${Date.now()}_${index}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        return getDownloadURL(storageRef);
      });
      const downloadUrls = await Promise.all(uploadPromises);

      await addDoc(collection(db, 'marketplace'), {
        title,
        price: parseFloat(price),
        currency,
        description: desc,
        images: downloadUrls,
        sellerId: auth.currentUser?.uid,
        status: 'available',
        createdAt: serverTimestamp()
      });
      setShowModal(false);
      setTitle('');
      setPrice('');
      setDesc('');
      setImageUris([]);
      fetchItems();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const baseItems = activeTab === 'discover'
    ? items
    : items.filter(item => item.sellerId === auth.currentUser?.uid);

  const filteredItems = baseItems.filter(item => {
    const queryLower = searchQuery.toLowerCase();
    const matchesSearch = item.title?.toLowerCase().includes(queryLower) || item.description?.toLowerCase().includes(queryLower);
    const itemPrice = item.price || 0;
    const matchesMin = appliedFilters.minPrice ? itemPrice >= parseFloat(appliedFilters.minPrice) : true;
    const matchesMax = appliedFilters.maxPrice ? itemPrice <= parseFloat(appliedFilters.maxPrice) : true;
    return matchesSearch && matchesMin && matchesMax;
  }).sort((a, b) => {
    if (appliedFilters.sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
    if (appliedFilters.sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
    return 0;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MARKETPLACE</Text>
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
          style={[styles.tab, activeTab === 'my_listings' && styles.activeTab]} 
          onPress={() => setActiveTab('my_listings')}
        >
          <Text style={[styles.tabText, activeTab === 'my_listings' && styles.activeTabText]}>My Listings</Text>
        </TouchableOpacity>
      </View>

      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#666" style={{ marginRight: 8 }} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search parts, cars..." 
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
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="options" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" colors={["#fff"]} />} 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 60 }} />
        ) : filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <View key={item.id} style={styles.card}>
              {item.images && item.images.length > 0 ? (
                <View>
                  <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: CARD_WIDTH, height: 200 }}>
                    {item.images.map((imgUri: string, idx: number) => (
                      <Image key={idx} source={{ uri: imgUri }} style={{ width: CARD_WIDTH, height: 200, resizeMode: 'cover' }} />
                    ))}
                  </ScrollView>
                  {item.images.length > 1 && (
                    <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{item.images.length} Photos</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.noImage}>
                  <Ionicons name="cart-outline" size={40} color="#666" />
                </View>
              )}
              <View style={styles.info}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.price}>{item.currency || '$'}{item.price}</Text>
                  </View>
                  {item.sellerId === auth.currentUser?.uid ? (
                    <TouchableOpacity 
                      style={[styles.messageBtn, { backgroundColor: '#e53935' }]} 
                      onPress={() => handleDeleteItem(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity 
                        style={[styles.messageBtn, { backgroundColor: '#222' }]} 
                        onPress={async () => {
                          if (item.sellerId) {
                            import('firebase/firestore').then(async ({ getDoc, doc }) => {
                              try {
                                const sellerDoc = await getDoc(doc(db, 'users', item.sellerId));
                                const pushToken = sellerDoc.data()?.pushToken;
                                if (pushToken) {
                                  const { sendPushNotification } = await import('../lib/notifications');
                                  sendPushNotification(pushToken, 'New Favorite', `Someone favorited your listing for ${item.title}`);
                                }
                                Alert.alert('Favorited!', 'The seller has been notified.');
                              } catch (err) {}
                            });
                          }
                        }}
                      >
                        <Ionicons name="heart-outline" size={18} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.messageBtn} 
                        onPress={() => {
                          const myId = auth.currentUser?.uid || '';
                          const sellerId = item.sellerId || '';
                          const chatId = myId < sellerId ? `${myId}_${sellerId}` : `${sellerId}_${myId}`;
                          navigation.navigate('Chat', { chatId, otherUser: { id: sellerId, username: 'Seller' } });
                        }}
                      >
                        <Ionicons name="chatbubbles" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <Text style={styles.location}>{item.description || 'No description'}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>
              {activeTab === 'my_listings' ? "You haven't listed any items yet." : "No listings found. Create one!"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent={true}>
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters & Sorting</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.sortRow}>
                {['newest', 'price_asc', 'price_desc'].map(sort => (
                  <TouchableOpacity 
                    key={sort} 
                    style={[styles.sortBtn, sortBy === sort && styles.sortBtnActive]}
                    onPress={() => setSortBy(sort)}
                  >
                    <Text style={[styles.sortBtnText, sortBy === sort && styles.sortBtnTextActive]}>
                      {sort === 'newest' ? 'Newest' : sort === 'price_asc' ? 'Price: Low-High' : 'Price: High-Low'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Price Range</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Min" placeholderTextColor="#666" keyboardType="numeric" value={minPrice} onChangeText={setMinPrice} />
                <Text style={{ color: '#fff', marginHorizontal: 12 }}>to</Text>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Max" placeholderTextColor="#666" keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} />
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 40 }}>
                <TouchableOpacity 
                  style={[styles.submitBtn, { flex: 1, marginRight: 8, backgroundColor: '#333' }]} 
                  onPress={() => { setMinPrice(''); setMaxPrice(''); setSortBy('newest'); setAppliedFilters({ minPrice: '', maxPrice: '', sortBy: 'newest' }); setShowFilterModal(false); }}
                >
                  <Text style={[styles.submitBtnText, { color: '#fff' }]}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitBtn, { flex: 1, marginLeft: 8 }]} 
                  onPress={() => { setAppliedFilters({ minPrice, maxPrice, sortBy }); setShowFilterModal(false); }}
                >
                  <Text style={styles.submitBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Listing Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>List an Item</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalForm}>
            <View style={{ marginBottom: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                {imageUris.map((uri, index) => (
                  <View key={index} style={{ position: 'relative', marginRight: 12 }}>
                    <Image source={{ uri }} style={{ width: 120, height: 120, borderRadius: 12 }} />
                    <TouchableOpacity 
                      style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 }}
                      onPress={() => setImageUris(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {imageUris.length < 10 && (
                  <TouchableOpacity style={styles.addMorePhotosBtn} onPress={pickImage}>
                    <Ionicons name="camera-outline" size={32} color="#666" />
                    <Text style={styles.imagePickerText}>{imageUris.length === 0 ? "Add Photos" : "Add More"}</Text>
                    <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>{10 - imageUris.length} left</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
            <TextInput style={styles.input} placeholder="Part Name or Vehicle" placeholderTextColor="#666" value={title} onChangeText={setTitle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity 
                onPress={() => {
                  Alert.alert('Select Currency', '', [
                    { text: '$ USD', onPress: () => setCurrency('$') },
                    { text: '£ GBP', onPress: () => setCurrency('£') },
                    { text: 'Cancel', style: 'cancel' }
                  ]);
                }} 
                style={{ backgroundColor: '#111', padding: 16, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: '#222', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{currency} ▼</Text>
              </TouchableOpacity>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Price" placeholderTextColor="#666" keyboardType="numeric" value={price} onChangeText={setPrice} />
            </View>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor="#666" multiline value={desc} onChangeText={setDesc} />
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateItem} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Post Listing</Text>}
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
  filterBtn: { marginLeft: 12, width: 44, height: 44, backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#222', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, backgroundColor: '#000' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  empty: { color: '#555', fontSize: 16 },
  card: { backgroundColor: '#111', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
  image: { width: '100%', height: 200 },
  noImage: { width: '100%', height: 160, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  info: { padding: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  price: { color: '#fff', fontSize: 17, fontWeight: '900', fontStyle: 'italic', marginBottom: 6 },
  location: { color: '#aaa', fontSize: 14, lineHeight: 20 },
  messageBtn: { backgroundColor: '#333', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalForm: { padding: 20 },
  input: { backgroundColor: '#111', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#222', marginBottom: 16 },
  textArea: { height: 120, textAlignVertical: 'top' },
  addMorePhotosBtn: { width: 120, height: 120, backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  imagePickerText: { color: '#666', marginTop: 6, fontSize: 13, fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  filterModalContent: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  filterLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 12 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  sortBtn: { backgroundColor: '#1a1a1a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  sortBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
  sortBtnText: { color: '#aaa', fontWeight: 'bold' },
  sortBtnTextActive: { color: '#000' }
});
