import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Image, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function GarageScreen({ navigation }: any) {
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // Form State
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [power, setPower] = useState('');
  const [stage, setStage] = useState('Stock');
  const [mods, setMods] = useState('');

  const fetchCars = async () => {
    try {
      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            resolve(user);
            unsubscribe();
          }
        });
      });
      
      if (!auth.currentUser) return;
      
      const q = query(
        collection(db, 'garage'),
        where('ownerId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCars(fetched);
    } catch (error) {
      console.error('Error fetching garage:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      import('react-native').then(rn => rn.Alert.alert('Permission needed', 'Allow camera roll access to pick photos.'));
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.4,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleAddCar = async () => {
    if (!make || !model || !year) {
      Alert.alert('Missing Fields', 'Please enter at least the Year, Make, and Model.');
      return;
    }

    setUploading(true);
    try {
      let downloadUrl = null;

      if (imageUri) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const filename = `garage/${auth.currentUser?.uid}/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        downloadUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'garage'), {
        ownerId: auth.currentUser?.uid,
        year,
        make,
        model,
        power: power ? `${power} HP` : '',
        stage,
        mods,
        coverImage: downloadUrl,
        createdAt: serverTimestamp()
      });

      // Reset form
      setYear('');
      setMake('');
      setModel('');
      setPower('');
      setStage('Stock');
      setMods('');
      setImageUri(null);
      setShowAddModal(false);
      
      // Refresh list
      fetchCars();
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerText}>My Garage</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
        ) : cars.length > 0 ? (
          cars.map(car => (
            <View key={car.id} style={styles.carCard}>
              {car.coverImage ? (
                <Image source={{ uri: car.coverImage }} style={styles.carImage} />
              ) : (
                <View style={styles.noImage}>
                  <Ionicons name="car-sport" size={60} color="#333" />
                </View>
              )}
              <View style={styles.carInfo}>
                <Text style={styles.carName}>{car.year} {car.make} {car.model}</Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.stageBadge}>{car.stage || 'Stock'}</Text>
                  {car.power ? <Text style={styles.powerBadge}>{car.power}</Text> : null}
                </View>
                {car.mods ? (
                  <View style={styles.modsContainer}>
                    <Text style={styles.modsLabel}>MODIFICATIONS</Text>
                    <Text style={styles.modsText}>{car.mods}</Text>
                  </View>
                ) : null}
                <TouchableOpacity 
                   style={{ marginTop: 16, backgroundColor: '#333', padding: 12, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                   onPress={() => navigation.navigate('BuildTimeline', { carId: car.id })}
                >
                   <Ionicons name="time" size={16} color="#fff" style={{ marginRight: 8 }} />
                   <Text style={{ color: '#fff', fontWeight: 'bold' }}>View Build Timeline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.placeholderCard}>
            <Ionicons name="car-sport-outline" size={64} color="#444" style={{ marginBottom: 16 }} />
            <Text style={styles.placeholderTitle}>Your Garage is Empty</Text>
            <Text style={styles.placeholderDesc}>Add your first vehicle to start tracking your build and sharing it with the community.</Text>
            <TouchableOpacity style={styles.ctaButton} onPress={() => setShowAddModal(true)}>
              <Text style={styles.ctaButtonText}>Add a Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Car Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Vehicle</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 40 }}>
              
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={48} color="#666" />
                    <Text style={styles.imagePickerText}>Add Cover Photo</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 0.4 }]}>
                  <Text style={styles.inputLabel}>Year</Text>
                  <TextInput style={styles.input} placeholder="2023" placeholderTextColor="#555" keyboardType="numeric" value={year} onChangeText={setYear} />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Make</Text>
                  <TextInput style={styles.input} placeholder="BMW" placeholderTextColor="#555" value={make} onChangeText={setMake} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Model</Text>
                <TextInput style={styles.input} placeholder="M3 Competition" placeholderTextColor="#555" value={model} onChangeText={setModel} />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Stage</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stageScroll}>
                    {['Stock', 'Stage 1', 'Stage 2', 'Stage 3', 'Custom'].map(s => (
                      <TouchableOpacity key={s} onPress={() => setStage(s)} style={[styles.stageSelectBtn, stage === s && styles.stageSelectBtnActive]}>
                        <Text style={[styles.stageSelectText, stage === s && styles.stageSelectTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Estimated Power (HP)</Text>
                <TextInput style={styles.input} placeholder="503" placeholderTextColor="#555" keyboardType="numeric" value={power} onChangeText={setPower} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Modifications List</Text>
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  placeholder="Intake, Downpipe, Tune..." 
                  placeholderTextColor="#555" 
                  multiline 
                  value={mods} 
                  onChangeText={setMods} 
                />
              </View>

              <TouchableOpacity style={[styles.submitButton, uploading && { opacity: 0.7 }]} onPress={handleAddCar} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitButtonText}>Save Vehicle</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  header: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 20, backgroundColor: '#111', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#333' },
  headerText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  // Card
  carCard: { backgroundColor: '#111', borderRadius: 20, marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  carImage: { width: '100%', height: 220, resizeMode: 'cover' },
  noImage: { width: '100%', height: 220, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  carInfo: { padding: 20 },
  carName: { color: '#fff', fontSize: 24, fontWeight: '900', fontStyle: 'italic', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  stageBadge: { backgroundColor: '#e53935', color: '#fff', fontSize: 12, fontWeight: '900', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 10, textTransform: 'uppercase', letterSpacing: 1 },
  powerBadge: { backgroundColor: '#2a2a2a', color: '#ccc', fontSize: 12, fontWeight: '900', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, textTransform: 'uppercase', letterSpacing: 1 },
  modsContainer: { backgroundColor: '#1a1a1a', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#222' },
  modsLabel: { color: '#666', fontSize: 10, fontWeight: 'bold', marginBottom: 4, letterSpacing: 1 },
  modsText: { color: '#bbb', fontSize: 14, lineHeight: 22 },
  
  // Empty State
  placeholderCard: { backgroundColor: '#111', padding: 40, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#333', marginTop: 40 },
  placeholderTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  placeholderDesc: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  ctaButton: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24 },
  ctaButtonText: { color: '#000', fontSize: 15, fontWeight: 'bold' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222', backgroundColor: '#111' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalContent: { padding: 20 },
  imagePicker: { height: 200, backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 24, overflow: 'hidden' },
  imagePickerText: { color: '#666', marginTop: 8, fontWeight: 'bold' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: '#888', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: '#111', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#222' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  stageScroll: { flexDirection: 'row' },
  stageSelectBtn: { backgroundColor: '#111', borderWidth: 1, borderColor: '#333', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginRight: 8 },
  stageSelectBtnActive: { backgroundColor: '#e53935', borderColor: '#e53935' },
  stageSelectText: { color: '#aaa', fontWeight: 'bold' },
  stageSelectTextActive: { color: '#fff' },
  submitButton: { backgroundColor: '#fff', borderRadius: 24, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  submitButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
});
