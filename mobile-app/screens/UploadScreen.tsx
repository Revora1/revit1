import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, Platform, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebaseConfig';

export default function UploadScreen({ navigation }: any) {
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [buildLogChecked, setBuildLogChecked] = useState(false);
  const [duoPageChecked, setDuoPageChecked] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!caption && !imageUri) {
      Alert.alert('Empty Post', 'Please add an image or caption.');
      return;
    }
    setUploading(true);
    try {
      let downloadUrl = null;
      if (imageUri) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        const filename = `posts/${auth.currentUser?.uid}/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        
        await uploadBytes(storageRef, blob);
        downloadUrl = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, 'posts'), {
        authorId: auth.currentUser?.uid,
        authorUsername: 'tuner_' + Math.floor(Math.random() * 1000), 
        caption,
        mediaUrl: downloadUrl,
        mediaUrls: downloadUrl ? [downloadUrl] : [],
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp()
      });
      Alert.alert('Success', 'Post uploaded successfully!');
      setCaption('');
      setImageUri(null);
      
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
        
        <Text style={styles.sectionLabel}>POST PHOTOS (0/10)</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={40} color="#666" style={{ marginBottom: 12 }} />
              <Text style={styles.imagePickerTitle}>Upload Photos</Text>
              <Text style={styles.imagePickerSubtitle}>Select up to 10 from your camera roll</Text>
            </>
          )}
        </TouchableOpacity>
        
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
        <View style={styles.tagsContainer}>
          <TouchableOpacity style={styles.tagPill}><Text style={styles.tagPillText}>ford focus st</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tagPill}><Text style={styles.tagPillText}>renault clio 182</Text></TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>BACKGROUND MUSIC</Text>
        <TouchableOpacity style={styles.musicBtn}>
          <View style={styles.musicIconContainer}>
            <Ionicons name="musical-notes-outline" size={20} color="#888" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.musicBtnTitle}>ADD MUSIC</Text>
            <Text style={styles.musicBtnSubtitle}>ADD A BACKGROUND SOUNDTRACK TO YOUR BUILD</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>POST OPTIONS</Text>
        <TouchableOpacity style={styles.optionRow} onPress={() => setBuildLogChecked(!buildLogChecked)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>ADD TO BUILD LOG</Text>
            <Text style={styles.optionSubtitle}>SELECT A CAR TO ENABLE BUILD LOG</Text>
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
  
  tagsContainer: { flexDirection: 'row', gap: 12 },
  tagPill: { backgroundColor: '#1a1a1a', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 20 },
  tagPillText: { color: '#aaa', fontWeight: 'bold', fontSize: 13 },

  musicBtn: { backgroundColor: '#161616', borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 16 },
  musicIconContainer: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  musicBtnTitle: { color: '#fff', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5, marginBottom: 2 },
  musicBtnSubtitle: { color: '#666', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },

  optionRow: { backgroundColor: '#111', borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12 },
  optionTitle: { color: '#fff', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5, marginBottom: 4 },
  optionSubtitle: { color: '#444', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#fff', borderColor: '#fff' },

  postButton: { backgroundColor: '#fff', borderRadius: 32, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  postButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});
