import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Platform, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp, getDoc, doc, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebaseConfig';
import { compressImage } from '../lib/imageCompression';

export default function UploadScreen({ navigation }: any) {
  const [caption, setCaption] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [userCars, setUserCars] = useState<any[]>([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  const [buildLogChecked, setBuildLogChecked] = useState(false);
  const [duoPageChecked, setDuoPageChecked] = useState(false);

  const fetchUserCars = useCallback(async () => {
    if (!auth.currentUser) {
      setUserCars([]);
      setLoadingCars(false);
      return;
    }
    try {
      setLoadingCars(true);
      const uid = auth.currentUser.uid;
      const carsMap = new Map<string, any>();

      // Query by ownerId (standard)
      try {
        const q1 = query(
          collection(db, 'garage'),
          where('ownerId', '==', uid)
        );
        const snap1 = await getDocs(q1);
        snap1.docs.forEach(d => carsMap.set(d.id, { id: d.id, ...d.data() }));
      } catch (err1) {
        console.log('Error querying by ownerId:', err1);
      }

      // Also check userId in case of legacy docs
      try {
        const q2 = query(
          collection(db, 'garage'),
          where('userId', '==', uid)
        );
        const snap2 = await getDocs(q2);
        snap2.docs.forEach(d => {
          if (!carsMap.has(d.id)) {
            carsMap.set(d.id, { id: d.id, ...d.data() });
          }
        });
      } catch (_) {}

      const carsList = Array.from(carsMap.values());
      carsList.sort((a: any, b: any) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (typeof a.createdAt === 'number' ? a.createdAt : 0);
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (typeof b.createdAt === 'number' ? b.createdAt : 0);
        return tB - tA;
      });
      setUserCars(carsList);
    } catch (err) {
      console.log('Error fetching user garage cars:', err);
    } finally {
      setLoadingCars(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserCars();
    }, [fetchUserCars])
  );

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult || !permissionResult.granted) {
        Alert.alert('Permission Required', 'Photo library permission is needed to upload post photos. You can enable photo access in your device Settings.');
        return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        selectionLimit: 10,
        mediaTypes: ['images'],
        aspect: [4, 3],
        quality: 0.4,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUris([...imageUris, ...result.assets.map(a => a.uri)].slice(0, 10));
      }
    } catch (err: any) {
      console.log('Error picking image:', err);
      Alert.alert('Error', 'Could not open photo library: ' + (err.message || 'Permission denied'));
    }
  };

  const handlePost = async () => {
    if (!caption && imageUris.length === 0) {
      Alert.alert('Empty Post', 'Please add an image or caption.');
      return;
    }
    setUploading(true);
    try {
      let downloadUrls: string[] = [];
      if (imageUris.length > 0) {
        downloadUrls = await Promise.all(
          imageUris.map(async (uri, index) => {
            const compressedUri = await compressImage(uri);
            const blob: any = await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.onload = function() { resolve(xhr.response); };
              xhr.onerror = function(e) { reject(new TypeError("Network request failed")); };
              xhr.responseType = "blob";
              xhr.open("GET", compressedUri, true);
              xhr.send(null);
            });
            const filename = `posts/${auth.currentUser?.uid}/${Date.now()}_${index}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            return await getDownloadURL(storageRef);
          })
        );
      }
      let currentUsername = 'tuner';
      try {
        if (auth.currentUser?.uid) {
          if (auth.currentUser.email?.toLowerCase() === 'tonyang11552883@gmail.com') {
            currentUsername = 'tony';
          } else {
            const uSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (uSnap.exists() && uSnap.data()?.username) {
              const uname = uSnap.data().username;
              currentUsername = (uname === 'tonyang11552883' || uname === 'tonyang1155') ? 'tony' : uname;
            } else {
              currentUsername = `tuner_${auth.currentUser.uid.substring(0, 6)}`;
            }
          }
        }
      } catch (e) {
        console.log('Error fetching user username for post:', e);
      }

      const selectedCar = userCars.find(c => c.id === selectedCarId);
      const carTag = selectedCar ? `${selectedCar.make || ''} ${selectedCar.model || ''}`.trim() : null;

      const postDoc = await addDoc(collection(db, 'posts'), {
        authorId: auth.currentUser?.uid,
        authorUsername: currentUsername, 
        caption,
        mediaUrl: downloadUrls.length > 0 ? downloadUrls[0] : null,
        mediaUrls: downloadUrls,
        carTagId: selectedCarId || null,
        carTag: carTag || null,
        car: selectedCar ? {
          id: selectedCar.id,
          make: selectedCar.make || '',
          model: selectedCar.model || '',
          year: selectedCar.year || '',
          power: selectedCar.power || '',
          stage: selectedCar.stage || 'Stock',
        } : null,
        isModUpdate: !!(buildLogChecked && selectedCarId),
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp()
      });

      if (buildLogChecked && selectedCarId) {
        try {
          await addDoc(collection(db, 'garage', selectedCarId, 'build_logs'), {
            title: caption ? (caption.length > 40 ? caption.substring(0, 40) + '...' : caption) : 'Build Update',
            description: caption,
            mediaUrl: downloadUrls.length > 0 ? downloadUrls[0] : null,
            mediaUrls: downloadUrls,
            date: serverTimestamp(),
          });

          const nextBuildNumber = (selectedCar?.buildTimeline?.length || 0) + 1;
          const modEntry = {
            id: Math.random().toString(36).substring(7),
            title: `Build #${nextBuildNumber}`,
            description: caption,
            date: Date.now(),
            type: 'modification',
            postId: postDoc.id,
            mediaUrl: downloadUrls.length > 0 ? downloadUrls[0] : null
          };
          await updateDoc(doc(db, 'garage', selectedCarId), {
            buildTimeline: arrayUnion(modEntry)
          });
        } catch (timelineErr) {
          console.log('Error updating build timeline:', timelineErr);
        }
      }

      Alert.alert('Success', 'Post uploaded successfully!');
      setCaption('');
      setImageUris([]);
      setSelectedCarId(null);
      setBuildLogChecked(false);
      
      if (navigation?.navigate) {
        navigation.navigate('Home');
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SHARE BUILD</Text>
          <Text style={styles.headerSubtitle}>Show the world what's under the hood.</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation?.goBack?.()}>
          <Ionicons name="close" size={24} color="#888" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        
        {/* Replaced below */}
        <Text style={styles.sectionLabel}>POST PHOTOS ({imageUris.length}/10)</Text>
        {imageUris.length > 0 ? (
          <View style={[styles.imagePicker, { borderStyle: 'solid', borderColor: 'transparent', backgroundColor: 'transparent', padding: 0 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{width: '100%', height: '100%'}}>
              {imageUris.map((uri, index) => (
                <View key={index} style={{ width: 320, height: '100%', marginRight: 8, padding: 8 }}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
                  <TouchableOpacity 
                    style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 15, padding: 4, zIndex: 10 }}
                    onPress={() => setImageUris(imageUris.filter((_, i) => i !== index))}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {imageUris.length < 10 && (
                <TouchableOpacity style={{ width: 120, height: '100%', marginRight: 16, padding: 8, justifyContent: 'center' }} onPress={pickImage}>
                  <View style={{ flex: 1, backgroundColor: '#161616', borderRadius: 16, borderWidth: 2, borderColor: '#2a2a2a', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="add" size={32} color="#666" />
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        ) : (
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            <Ionicons name="camera-outline" size={40} color="#666" style={{ marginBottom: 12 }} />
            <Text style={styles.imagePickerTitle}>Upload Photos</Text>
            <Text style={styles.imagePickerSubtitle}>Select up to 10 from your camera roll</Text>
          </TouchableOpacity>
        )}
        
        <Text style={styles.sectionLabel}>CAPTION</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Write something about your build..." 
          placeholderTextColor="#888"
          multiline
          value={caption}
          onChangeText={setCaption}
        />
        
        <Text style={styles.sectionLabel}>TAG A CAR</Text>
        {loadingCars ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
            <ActivityIndicator size="small" color="#e53935" style={{ marginRight: 8 }} />
            <Text style={{ color: '#888', fontSize: 12 }}>Loading your garage cars...</Text>
          </View>
        ) : userCars.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsContainer}>
            {userCars.map((car) => {
              const isSelected = selectedCarId === car.id;
              const carLabel = `${car.year ? `${car.year} ` : ''}${car.make || ''} ${car.model || ''}`.trim() || 'Custom Car';
              return (
                <TouchableOpacity
                  key={car.id}
                  style={[styles.tagPill, isSelected && styles.tagPillSelected]}
                  onPress={() => {
                    const nextId = isSelected ? null : car.id;
                    setSelectedCarId(nextId);
                    if (!nextId) {
                      setBuildLogChecked(false);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={isSelected ? "checkmark-circle" : "car-sport-outline"} 
                    size={16} 
                    color={isSelected ? "#000" : "#aaa"} 
                    style={{ marginRight: 6 }} 
                  />
                  <Text style={[styles.tagPillText, isSelected && styles.tagPillTextSelected]}>
                    {carLabel}
                  </Text>
                  {car.stage ? (
                    <View style={[styles.stageBadge, isSelected && styles.stageBadgeSelected]}>
                      <Text style={[styles.stageBadgeText, isSelected && styles.stageBadgeTextSelected]}>
                        {car.stage}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.noCarsContainer}>
            <View style={styles.noCarsLeft}>
              <Ionicons name="car-outline" size={24} color="#888" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noCarsTitle}>No cars in your garage yet</Text>
                <Text style={styles.noCarsSubtitle}>Add a car to your garage to tag it in posts</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.addCarBtn}
              onPress={() => navigation?.navigate ? navigation.navigate('Garage') : null}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.addCarBtnText}>Add Car</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionLabel}>POST OPTIONS</Text>
        <TouchableOpacity 
          style={[styles.optionRow, !selectedCarId && { opacity: 0.6 }]} 
          onPress={() => {
            if (!selectedCarId) {
              Alert.alert("Tag a Car First", "Please select a car from your garage above to add this post to your build log.");
              return;
            }
            setBuildLogChecked(!buildLogChecked);
          }}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>ADD TO BUILD LOG</Text>
            <Text style={styles.optionSubtitle}>
              {selectedCarId ? 'LOG AS A MODIFICATION UPDATE IN BUILD TIMELINE' : 'SELECT ONE OF YOUR CARS ABOVE TO ENABLE'}
            </Text>
          </View>
          <View style={[styles.checkbox, buildLogChecked && styles.checkboxChecked]}>
            {buildLogChecked && <Ionicons name="checkmark" size={16} color="#000" />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionRow} onPress={() => setDuoPageChecked(!duoPageChecked)}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: '#666' }]}>ADD TO DUO PAGE</Text>
            <Text style={styles.optionSubtitle}>PARTNER LINK REQUIRED (LINK IN PROFILE SETTINGS)</Text>
          </View>
          <View style={[styles.checkbox, duoPageChecked && styles.checkboxChecked]}>
             {duoPageChecked && <Ionicons name="checkmark" size={16} color="#000" />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.postButton} onPress={handlePost} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.postButtonText}>POST MEDIA</Text>
              <Ionicons name="chevron-forward" size={18} color="#000" style={{ marginLeft: 6 }} />
            </View>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  header: { paddingVertical: 16, paddingHorizontal: 16, backgroundColor: '#000', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1 },
  headerSubtitle: { color: '#888', fontSize: 13, marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  
  content: { flex: 1, paddingHorizontal: 16 },
  sectionLabel: { color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginTop: 24, marginBottom: 12 },
  
  imagePicker: { 
    height: 350, 
    backgroundColor: '#161616', 
    borderRadius: 24, 
    borderWidth: 2, 
    borderColor: '#2a2a2a', 
    borderStyle: 'dashed', 
    alignItems: 'center', 
    justifyContent: 'center', 
    overflow: 'hidden' 
  },
  imagePickerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  imagePickerSubtitle: { color: '#666', fontSize: 13 },
  previewImage: { width: '100%', height: '100%' },
  
  input: { 
    backgroundColor: '#161616', 
    borderRadius: 16, 
    padding: 16, 
    color: '#fff', 
    fontSize: 15, 
    minHeight: 120, 
    textAlignVertical: 'top', 
  },
  
  tagsContainer: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  tagPill: { 
    backgroundColor: '#1a1a1a', 
    borderRadius: 20, 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a'
  },
  tagPillSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  tagPillText: { color: '#aaa', fontWeight: 'bold', fontSize: 13 },
  tagPillTextSelected: { color: '#000' },
  stageBadge: {
    backgroundColor: '#262626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  stageBadgeSelected: {
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  stageBadgeText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '700',
  },
  stageBadgeTextSelected: {
    color: '#000',
  },

  noCarsContainer: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242424',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noCarsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  noCarsTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  noCarsSubtitle: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  addCarBtn: {
    backgroundColor: '#e53935',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addCarBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  optionRow: { backgroundColor: '#111', borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12 },
  optionTitle: { color: '#fff', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5, marginBottom: 4 },
  optionSubtitle: { color: '#444', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#fff', borderColor: '#fff' },

  postButton: { backgroundColor: '#fff', borderRadius: 32, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  postButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});
