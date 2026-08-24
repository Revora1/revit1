import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { setAudioModeAsync } from 'expo-audio';
import { useEventListener } from 'expo';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import mobileAds, { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';

const { width } = Dimensions.get('window');

// RevitUp TV Interstitial Ad Unit ID
const INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-2103649447635694/1878039475';

// Create global or singleton interstitial instance
let interstitial: InterstitialAd = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
  requestNonPersonalizedAdsOnly: true,
});

export default function VideosScreen({ navigation }: any) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'landscape' | 'portrait' | 'featured'>('all');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [globalLayoutMode, setGlobalLayoutMode] = useState<'auto' | 'landscape' | 'portrait'>('auto');

  // Keep a callback ref to resume video playback after interstitial closes
  const onAdClosedCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    fetchVideos();

    const initAndLoadAds = async () => {
      try {
        await requestTrackingPermissionsAsync();
        await mobileAds().initialize();
      } catch (err) {
        console.log('Mobile ads init:', err);
      }
      loadInterstitialAd();
    };

    initAndLoadAds();

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setAdLoaded(false);
      // Run callback if waiting for post-ad action
      if (onAdClosedCallbackRef.current) {
        const cb = onAdClosedCallbackRef.current;
        onAdClosedCallbackRef.current = null;
        cb();
      }
      // Re-load next interstitial for subsequent rolls
      loadInterstitialAd();
    });

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('Interstitial ad error:', error);
      setAdLoaded(false);
      if (onAdClosedCallbackRef.current) {
        const cb = onAdClosedCallbackRef.current;
        onAdClosedCallbackRef.current = null;
        cb();
      }
    });

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  const loadInterstitialAd = () => {
    try {
      interstitial.load();
    } catch (e) {
      console.log('Failed to call interstitial.load():', e);
    }
  };

  const showInterstitialIfAvailable = (onFinished: () => void): boolean => {
    if (adLoaded && interstitial.loaded) {
      onAdClosedCallbackRef.current = onFinished;
      try {
        interstitial.show();
        return true;
      } catch (e) {
        console.log('Failed to show interstitial:', e);
        onAdClosedCallbackRef.current = null;
        onFinished();
        return false;
      }
    } else {
      // Ad wasn't loaded, continue uninterrupted
      onFinished();
      loadInterstitialAd();
      return false;
    }
  };

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

  const displayedVideos = videos.filter(v => {
    if (activeTab === 'featured') return v.featured === true;
    if (activeTab === 'landscape') return v.orientation === 'landscape' || !v.orientation;
    if (activeTab === 'portrait') return v.orientation === 'portrait';
    return true;
  });

  const renderVideoItem = ({ item }: { item: any }) => {
    return (
      <VideoItem 
        item={item} 
        isActive={activeVideoId === item.id}
        globalLayoutMode={globalLayoutMode}
        onPlay={() => setActiveVideoId(item.id)}
        showInterstitial={showInterstitialIfAvailable}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>REVITUP TV</Text>
            <Text style={styles.headerSubtitle}>Landscape & Portrait Community Feeds</Text>
          </View>
        </View>

        {/* Global Aspect Ratio Switcher */}
        <View style={styles.layoutToggleContainer}>
          <TouchableOpacity 
            style={[styles.layoutBtn, globalLayoutMode === 'auto' && styles.activeLayoutBtn]}
            onPress={() => setGlobalLayoutMode('auto')}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={[styles.layoutBtnText, globalLayoutMode === 'auto' && styles.activeLayoutBtnText]}>Auto</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.layoutBtn, globalLayoutMode === 'landscape' && styles.activeLayoutBtn]}
            onPress={() => setGlobalLayoutMode('landscape')}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons name="tv-outline" size={14} color={globalLayoutMode === 'landscape' ? '#000' : '#888'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.layoutBtn, globalLayoutMode === 'portrait' && styles.activeLayoutBtn]}
            onPress={() => setGlobalLayoutMode('portrait')}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons name="phone-portrait-outline" size={14} color={globalLayoutMode === 'portrait' ? '#000' : '#888'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'landscape' && styles.activeTab]} 
          onPress={() => setActiveTab('landscape')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="camera-outline" size={15} color={activeTab === 'landscape' ? '#fff' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'landscape' && styles.activeTabText]}>Landscape (Camera)</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'portrait' && styles.activeTab]} 
          onPress={() => setActiveTab('portrait')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="phone-portrait-outline" size={14} color={activeTab === 'portrait' ? '#fff' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'portrait' && styles.activeTabText]}>Portrait (Phone)</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'featured' && styles.activeTab]} 
          onPress={() => setActiveTab('featured')}
        >
          <Text style={[styles.tabText, activeTab === 'featured' && styles.activeTabText]}>Featured</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 60 }} />
      ) : displayedVideos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-outline" size={56} color="#444" />
          <Text style={styles.empty}>No {activeTab !== 'all' ? activeTab : ''} videos available</Text>
          <Text style={styles.emptySub}>Upload videos in Landscape (Camera) or Portrait in the Admin panel.</Text>
        </View>
      ) : (
        <FlatList
          data={displayedVideos}
          keyExtractor={v => v.id}
          renderItem={renderVideoItem}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function VideoItem({
  item,
  isActive,
  globalLayoutMode,
  onPlay,
  showInterstitial,
}: {
  item: any;
  isActive: boolean;
  globalLayoutMode: 'auto' | 'landscape' | 'portrait';
  onPlay: () => void;
  showInterstitial: (onFinished: () => void) => boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayedPreRoll, setHasPlayedPreRoll] = useState(false);
  const [hasPlayedMidRoll, setHasPlayedMidRoll] = useState(false);
  const [hasPlayedEndRoll, setHasPlayedEndRoll] = useState(false);
  const [localOrientation, setLocalOrientation] = useState<'landscape' | 'portrait'>(
    item.orientation === 'portrait' ? 'portrait' : 'landscape'
  );

  // Determine current effective orientation based on item, global mode, or local override
  const currentOrientation = globalLayoutMode === 'auto' ? localOrientation : globalLayoutMode;

  const player = useVideoPlayer(item.videoUrl, (p: any) => {
    p.loop = false;
  });
  
  useEventListener(player, 'playingChange', (event) => {
    setIsPlaying(event.isPlaying);
  });

  // Mid-roll and End-roll event listeners
  useEffect(() => {
    const timeUpdateSub = player.addListener('timeUpdate', (event: any) => {
      const durationMillis = (player.duration || 0) * 1000;
      const positionMillis = event.currentTime * 1000;
      
      // Trigger Mid-Roll at 50% midpoint of the video
      if (durationMillis > 6000 && positionMillis > (durationMillis / 2)) {
        if (!hasPlayedMidRoll) {
          setHasPlayedMidRoll(true);
          player.pause();
          showInterstitial(() => {
            player.play();
          });
        }
      }
    });
    
    // Trigger End-Roll when video finishes
    const playToEndSub = player.addListener('playToEnd', () => {
      if (!hasPlayedEndRoll) {
        setHasPlayedEndRoll(true);
        showInterstitial(() => {
          // Video finished
        });
      }
    });
    
    return () => {
      timeUpdateSub.remove();
      playToEndSub.remove();
    };
  }, [player, hasPlayedMidRoll, hasPlayedEndRoll, showInterstitial]);

  useEffect(() => {
    if (isActive) {
      if (hasPlayedPreRoll) {
        player.play();
      }
    } else {
      player.pause();
    }
  }, [isActive, hasPlayedPreRoll, player]);

  const handlePlayPress = () => {
    if (!isActive) {
      onPlay();
    }
    
    // Trigger Pre-Roll before video starts
    if (!hasPlayedPreRoll) {
      setHasPlayedPreRoll(true);
      player.pause();
      showInterstitial(() => {
        player.play();
      });
    } else {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }
  };

  const isPortrait = currentOrientation === 'portrait';
  const containerHeight = isPortrait 
    ? Math.min(Dimensions.get('window').height * 0.58, (width - 32) * (16 / 9)) 
    : (width - 32) * (9 / 16);

  return (
    <View style={styles.videoCard}>
      {/* Top Bar on Card: Orientation Badge & Quick Ratio Toggle */}
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <View style={[styles.orientationBadge, isPortrait ? styles.portraitBadge : styles.landscapeBadge]}>
            <Ionicons 
              name={isPortrait ? "phone-portrait" : "camera"} 
              size={12} 
              color={isPortrait ? "#a855f7" : "#06b6d4"} 
            />
            <Text style={[styles.badgeText, isPortrait ? styles.portraitBadgeText : styles.landscapeBadgeText]}>
              {isPortrait ? '9:16 PORTRAIT (PHONE)' : '16:9 LANDSCAPE (CAMERA)'}
            </Text>
          </View>
          {item.cameraModel && (
            <View style={styles.cameraModelBadge}>
              <Ionicons name="videocam-outline" size={11} color="#888" />
              <Text style={styles.cameraModelText}>{item.cameraModel}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.ratioSwitchBtn}
          onPress={() => setLocalOrientation(prev => prev === 'landscape' ? 'portrait' : 'landscape')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="sync-outline" size={13} color="#ccc" />
          <Text style={styles.ratioSwitchText}>{isPortrait ? 'Switch to 16:9' : 'Switch to 9:16'}</Text>
        </TouchableOpacity>
      </View>

      {/* Video Box with adaptive height & letterbox protection */}
      <View style={[styles.videoContainer, { height: containerHeight }]}>
        {isActive ? (
          <VideoView
            player={player}
            style={styles.video}
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture
            contentFit="contain"
            nativeControls
          />
        ) : (
          <Image 
            source={{ uri: item.thumbnailUrl || 'https://images.unsplash.com/photo-1611016186353-9af58c69a533?w=800' }} 
            style={styles.video} 
            resizeMode="cover"
          />
        )}
        
        <TouchableOpacity style={styles.playOverlay} onPress={handlePlayPress} activeOpacity={0.8}>
          {!isPlaying && (
            <View style={styles.playBtn}>
              <Ionicons name="play" size={28} color="#000" />
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.videoDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.footerRow}>
          <Text style={styles.videoDate}>
            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'New'}
          </Text>
          <Text style={styles.fpsText}>
            {item.fps ? `${item.fps} FPS • ` : ''}{item.resolution || (isPortrait ? '1080x1920' : '4K / 1080p HD')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  headerSubtitle: { color: '#888', fontSize: 11, fontWeight: '500' },
  layoutToggleContainer: { flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: '#27272a' },
  layoutBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  activeLayoutBtn: { backgroundColor: '#fff' },
  layoutBtnText: { color: '#888', fontSize: 11, fontWeight: '700' },
  activeLayoutBtnText: { color: '#000' },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a', backgroundColor: '#09090b' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#fff' },
  tabText: { color: '#666', fontWeight: 'bold', fontSize: 12 },
  activeTabText: { color: '#fff' },
  videoCard: { marginBottom: 20, backgroundColor: '#0d0d0e', borderWidth: 1, borderColor: '#1f1f23', marginHorizontal: 14, borderRadius: 14, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#121214', borderBottomWidth: 1, borderBottomColor: '#1c1c20' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  orientationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  landscapeBadge: { backgroundColor: 'rgba(6, 182, 212, 0.12)', borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.3)' },
  portraitBadge: { backgroundColor: 'rgba(168, 85, 247, 0.12)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)' },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  landscapeBadgeText: { color: '#06b6d4' },
  portraitBadgeText: { color: '#a855f7' },
  cameraModelBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#18181b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cameraModelText: { color: '#aaa', fontSize: 10, fontWeight: '600' },
  ratioSwitchBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#222226', borderRadius: 6 },
  ratioSwitchText: { color: '#ccc', fontSize: 10, fontWeight: '700' },
  videoContainer: { width: '100%', backgroundColor: '#000', position: 'relative', overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', paddingLeft: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 8 },
  videoInfo: { padding: 14 },
  videoTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 22 },
  videoDesc: { color: '#aaa', fontSize: 12, marginTop: 4, lineHeight: 16 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  videoDate: { color: '#71717a', fontSize: 11 },
  fpsText: { color: '#71717a', fontSize: 11, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 24 },
  empty: { color: '#aaa', fontSize: 16, fontWeight: '700', marginTop: 16 },
  emptySub: { color: '#555', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 }
});
