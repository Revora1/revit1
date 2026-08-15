import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

export default function StoryViewerScreen({ route, navigation }: any) {
  const { userId, username } = route.params;
  const [stories, setStories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const q = query(
          collection(db, 'stories'),
          where('userId', '==', userId),
          where('expiresAt', '>', new Date()),
          orderBy('expiresAt', 'asc')
        );
        const snap = await getDocs(q);
        setStories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, [userId]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    );
  }

  if (stories.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: '#fff' }}>No active stories found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
           <Text style={{ color: '#e53935' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentStory = stories[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressRow}>
         {stories.map((_, i) => (
           <View key={i} style={[styles.progressBar, { opacity: i <= currentIndex ? 1 : 0.3 }]} />
         ))}
      </View>
      <View style={styles.header}>
         <Text style={styles.username}>@{username || 'User'}</Text>
         <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#fff" />
         </TouchableOpacity>
      </View>

      <Image source={{ uri: currentStory.mediaUrl }} style={styles.storyImage} />

      <TouchableOpacity style={styles.leftTap} onPress={handlePrev} />
      <TouchableOpacity style={styles.rightTap} onPress={handleNext} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  progressRow: { position: 'absolute', top: 50, left: 10, right: 10, flexDirection: 'row', zIndex: 10, gap: 4 },
  progressBar: { flex: 1, height: 2, backgroundColor: '#fff', borderRadius: 1 },
  header: { position: 'absolute', top: 60, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  username: { color: '#fff', fontWeight: 'bold', fontSize: 16, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  storyImage: { width: width, height: height, resizeMode: 'cover' },
  leftTap: { position: 'absolute', top: 0, left: 0, bottom: 0, width: width / 2, zIndex: 5 },
  rightTap: { position: 'absolute', top: 0, right: 0, bottom: 0, width: width / 2, zIndex: 5 },
});
