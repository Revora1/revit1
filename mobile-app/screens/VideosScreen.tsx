import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { setAudioModeAsync } from 'expo-audio';
import { useEventListener } from 'expo';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

const { width } = Dimensions.get('window');

// We use test IDs for development
const adUnitId = __DEV__ 
  ? TestIds.INTERSTITIAL 
  : 'ca-app-pub-3940256099942544/1033173712'; // Test ID used as fallback

const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

export default function VideosScreen({ navigation }: any) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    fetchVideos();
    
    // Pre-load interstitial
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('Interstitial ad loaded');
    });
    
    interstitial.load();

    return () => {
      unsubscribeLoaded();
    };
  }, []);

  const fetchVideos = async () => {
    try {
      const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.log('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderVideoItem = ({ item }: { item: any }) => {
    return (
      <VideoItem 
        item={item} 
        isActive={activeVideoId === item.id}
        onPlay={() => setActiveVideoId(item.id)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>REVITUP TV</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#e53935" style={{ marginTop: 40 }} />
      ) : videos.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="videocam-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No videos available</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={v => v.id}
          renderItem={renderVideoItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function VideoItem({ item, isActive, onPlay }: { item: any, isActive: boolean, onPlay: () => void }) {
  // Ad tracking states
  const [hasPlayedPreRoll, setHasPlayedPreRoll] = useState(false);
  const [hasPlayedMidRoll, setHasPlayedMidRoll] = useState(false);
  const [hasPlayedEndRoll, setHasPlayedEndRoll] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(item.videoUrl, p => {
    p.loop = false;
  });
  
  
  useEventListener(player, 'playingChange', (event) => {
    setIsPlaying(event.isPlaying);
  });


  useEffect(() => {
    const timeUpdateSub = player.addListener('timeUpdate', (event) => {
      const durationMillis = (player.duration || 0) * 1000;
      const positionMillis = event.currentTime * 1000;
      
      // Check for mid-roll (around 50% mark)
      if (durationMillis > 0 && positionMillis > (durationMillis / 2)) {
        if (!hasPlayedMidRoll) {
          setHasPlayedMidRoll(true);
          player.pause();
          if (interstitial.loaded) {
            interstitial.show();
          } else {
            player.play();
          }
        }
      }
    });
    
    const playToEndSub = player.addListener('playToEnd', () => {
      if (!hasPlayedEndRoll) {
        setHasPlayedEndRoll(true);
        if (interstitial.loaded) {
          interstitial.show();
        }
      }
    });
    
    return () => {
      timeUpdateSub.remove();
      playToEndSub.remove();
    };
  }, [player, hasPlayedMidRoll, hasPlayedEndRoll]);

  useEffect(() => {
    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      // Resume video after ad is closed
      interstitial.load(); // preload next
      if (isActive && player) {
        player.play();
      }
    });
    return () => {
      unsubscribeClosed();
    };
  }, [isActive, player]);

  useEffect(() => {
    if (isActive) {
      if (hasPlayedPreRoll || !interstitial.loaded) {
         player.play();
      }
    } else {
      player.pause();
    }
  }, [isActive, player]);

  const handlePlayPress = async () => {
    if (!isActive) {
      onPlay();
    }
    
    if (!hasPlayedPreRoll) {
      setHasPlayedPreRoll(true);
      if (interstitial.loaded) {
        interstitial.show();
      } else {
        // If ad not ready, just play
        player.play();
      }
    } else {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }
  };

  return (
    <View style={styles.videoCard}>
      <View style={styles.videoContainer}>
        {isActive ? (
          <VideoView
            player={player}
            style={styles.video}
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture
            contentFit="cover"
            nativeControls
          />
        ) : (
          <Image 
            source={{ uri: item.thumbnailUrl || 'https://images.unsplash.com/photo-1611016186353-9af58c69a533?w=800' }} 
            style={styles.video} 
          />
        )}
        
        {/* Custom Play/Pause Overlay */}
        <TouchableOpacity style={styles.playOverlay} onPress={handlePlayPress} activeOpacity={0.8}>
          {!isPlaying && (
            <View style={styles.playBtn}>
              <Ionicons name="play" size={32} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{item.title}</Text>
        <Text style={styles.videoDate}>
          {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'New'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  backBtn: { marginRight: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  
  videoCard: { marginBottom: 24 },
  videoContainer: { width, height: width * (9/16), backgroundColor: '#111', position: 'relative' },
  video: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(229,57,53,0.8)', justifyContent: 'center', alignItems: 'center' },
  
  videoInfo: { padding: 16 },
  videoTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  videoDate: { color: '#888', fontSize: 12, marginTop: 4 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { color: '#888', fontSize: 16, marginTop: 16 }
});
