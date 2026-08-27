import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Dimensions, ScrollView, Platform, ActivityIndicator, Image, TouchableOpacity, Alert, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, orderBy, getDocs, getDoc, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth, storage } from '../firebaseConfig';

export default function GroupFeedScreen({ route, navigation }: any) {
  const { groupId, groupName } = route.params;
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isMember, setIsMember] = useState(false);

  const fetchPosts = async () => {
    try {
      const q = query(
        collection(db, 'posts'),
        where('groupId', '==', groupId)
      );
      const snap = await getDocs(q);
      const fetchedPosts: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort locally since we might not have a composite index
      fetchedPosts.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

      const authorIds = [...new Set(fetchedPosts.map(p => p.authorId).filter(Boolean))];
      const usersCache: Record<string, any> = {};
      if (authorIds.length > 0) {
        const userDocs = await Promise.all(authorIds.map(id => getDoc(doc(db, 'users', id as string))));
        userDocs.forEach(uSnap => {
          if (uSnap.exists()) {
            usersCache[uSnap.id] = uSnap.data();
          }
        });
      }

      const mappedPosts = fetchedPosts.map(post => ({
        ...post,
        authorUsername: usersCache[post.authorId]?.username || post.authorUsername || `Member`
      }));

      setPosts(mappedPosts);
      
      if (auth.currentUser) {
        const memQ = query(collection(db, 'groupMembers'), where('groupId', '==', groupId), where('userId', '==', auth.currentUser.uid));
        const memSnap = await getDocs(memQ);
        setIsMember(!memSnap.empty);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [groupId]);

  const handleUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult || !permissionResult.granted) {
        Alert.alert('Permission Required', 'Photo library permission is needed to pick group post photos. You can enable photo access in device Settings.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.4,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);
        try {
          const imageUri = result.assets[0].uri;
        const blob: any = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function() { resolve(xhr.response); };
          xhr.onerror = function(e) { reject(new TypeError("Network request failed")); };
          xhr.responseType = "blob";
          xhr.open("GET", imageUri, true);
          xhr.send(null);
        });

        const filename = `groupPosts/${groupId}/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);

        await addDoc(collection(db, 'posts'), {
          groupId,
          authorId: auth.currentUser?.uid,
          authorUsername: auth.currentUser?.email?.split('@')[0] || 'Member', 
          mediaUrl: downloadUrl,
          mediaUrls: [downloadUrl],
          likesCount: 0,
          commentsCount: 0,
          createdAt: serverTimestamp()
        });
        Alert.alert('Success', 'Image posted to the club!');
        fetchPosts();
      } catch (err: any) {
        Alert.alert('Upload Error', err.message);
      } finally {
        setUploading(false);
      }
    }
  } catch (err: any) {
      console.log('Error picking group post image:', err);
      Alert.alert('Error', 'Could not open photo library: ' + (err.message || 'Permission denied'));
    }
  };

  const renderPost = ({ item }: { item: any }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.avatarPlaceholder}><Ionicons name="person" size={16} color="#666" /></View>
        <Text style={styles.authorName}>{item.authorUsername}</Text>
      </View>
      {item.mediaUrls && item.mediaUrls.length > 0 ? (
          <View style={styles.postImage}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              {item.mediaUrls.map((uri: string, idx: number) => (
                <View key={idx} style={{ width: Dimensions.get('window').width - 32, height: 300 }}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
            {item.mediaUrls.length > 1 && (
              <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="images" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{item.mediaUrls.length}</Text>
              </View>
            )}
          </View>
        ) : item.mediaUrl ? (
          <Image source={{ uri: item.mediaUrl }} style={styles.postImage} resizeMode="cover" />
        ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No posts in this club yet.</Text>}
        />
      )}
      
      {isMember && (
        <TouchableOpacity style={styles.fab} onPress={handleUpload} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#fff" /> : <Ionicons name="camera" size={24} color="#fff" />}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  listContent: { padding: 16, paddingBottom: 100 },
  postCard: { backgroundColor: '#1a1a1a', borderRadius: 12, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  authorName: { color: '#fff', fontWeight: 'bold' },
  postImage: { width: '100%', height: 300, backgroundColor: '#111' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
});
