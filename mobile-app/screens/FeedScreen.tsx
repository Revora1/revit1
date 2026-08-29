import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Platform, ActivityIndicator, Image, TouchableOpacity, Alert, Share, Modal, TextInput, KeyboardAvoidingView, FlatList, useWindowDimensions, ScrollView , RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import mobileAds, { NativeAd, NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } from 'react-native-google-mobile-ads';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';
import { collection, deleteDoc, setDoc, where, query, orderBy, limit, getDocs, getDoc, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

const adUnitId = __DEV__ 
  ? (Platform.OS === 'ios' ? 'ca-app-pub-3940256099942544/3986624511' : 'ca-app-pub-3940256099942544/2247696110')
  : 'ca-app-pub-2103649447635694/6789922553';

export default function FeedScreen({ navigation }: any) {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [activeStories, setActiveStories] = useState<any[]>([]);

  const fetchActiveStories = async () => {
    try {
      const q = query(
        collection(db, 'stories'),
        where('expiresAt', '>', new Date()),
        orderBy('expiresAt', 'asc')
      );
      const snap = await getDocs(q);
      const storiesMap = new Map();
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (!storiesMap.has(data.userId)) {
           storiesMap.set(data.userId, { id: doc.id, ...data });
        }
      });
      setActiveStories(Array.from(storiesMap.values()));
    } catch (err) {
      console.log('Error fetching stories:', err);
    }
  };

  
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(), fetchActiveStories()]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchActiveStories();
  }, []);

  const handleAddStory = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult || !permissionResult.granted) {
        Alert.alert('Permission Required', 'Photo library permission is needed to post a story. You can enable photo access in device Settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.4,
      });
      if (!result.canceled && result.assets && result.assets[0].uri && auth.currentUser) {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const fileRef = ref(storage, `stories/${auth.currentUser.uid}/${Date.now()}`);
        await uploadBytes(fileRef, blob);
        const url = await getDownloadURL(fileRef);
        
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        await addDoc(collection(db, 'stories'), {
          userId: auth.currentUser.uid,
          authorId: auth.currentUser.uid,
          username: 'User_' + auth.currentUser.uid.substring(0, 5),
          profilePic: auth.currentUser.photoURL || null,
          mediaUrl: url,
          mediaType: 'image',
          createdAt: serverTimestamp(),
          expiresAt: expiresAt
        });
        
        fetchActiveStories();
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to upload story');
    }
  };

  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e: any) => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
      fetchPosts();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchPosts = async () => {
    try {
      const user: any = await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
          resolve(u);
          unsubscribe();
        });
      });
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(15));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const currentUid = user?.uid || auth.currentUser?.uid;
      const likedPostIds = new Set<string>();
      if (currentUid && fetched.length > 0) {
        try {
          const likeChecks = await Promise.all(
            fetched.map(p => getDoc(doc(db, 'likes', `${currentUid}_${p.id}`)))
          );
          likeChecks.forEach((lSnap, idx) => {
            if (lSnap.exists()) {
              likedPostIds.add(fetched[idx].id);
            }
          });
        } catch (e) {
          console.log('Error loading likes status:', e);
        }
      }

      const authorIds = [...new Set(fetched.map(p => p.authorId).filter(Boolean))];
      const usersCache: Record<string, any> = {};
      if (authorIds.length > 0) {
        const userDocs = await Promise.all(authorIds.map(id => getDoc(doc(db, 'users', id as string))));
        userDocs.forEach(uSnap => {
          if (uSnap.exists()) {
            usersCache[uSnap.id] = uSnap.data();
          }
        });
      }

      const mappedPosts = fetched.map(post => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
        likesCount: Number(post.likesCount) || 0,
        authorUsername: usersCache[post.authorId]?.username || post.authorUsername || `tuner_${post.authorId?.substring(0,6)}`
      }));

      setPosts(mappedPosts);
    } catch (err) {
      console.log('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let currentAd: NativeAd | null = null;
    const initAds = async () => {
      try {
        await requestTrackingPermissionsAsync().catch(() => {});
        await mobileAds().initialize().catch(() => {});

        currentAd = await NativeAd.createForAdRequest(adUnitId, {
          requestNonPersonalizedAdsOnly: true
        });
        setNativeAd(currentAd);
      } catch (err) {
        console.log('Native Ad load failed:', err);
      }
    };
    initAds();
    fetchPosts();

    return () => { currentAd?.destroy(); }
  }, []);

  const handleLike = async (postId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert('Sign In Required', 'Please sign in to like posts.');
      return;
    }

    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const wasLiked = Boolean(targetPost.isLiked);
    const currentCount = Number(targetPost.likesCount) || 0;
    const newLiked = !wasLiked;
    const newCount = wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

    // Optimistic UI update
    setPosts(current => current.map(p => 
      p.id === postId ? { ...p, isLiked: newLiked, likesCount: newCount } : p
    ));

    const likeId = `${userId}_${postId}`;
    const likeRef = doc(db, 'likes', likeId);
    const postRef = doc(db, 'posts', postId);

    try {
      if (wasLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, {
          userId: userId,
          postId: postId,
          createdAt: Date.now()
        });
        await updateDoc(postRef, { likesCount: increment(1) });

        if (targetPost.authorId && targetPost.authorId !== userId) {
          const notifId = `${Date.now()}_${userId}_like_${postId}`;
          setDoc(doc(db, 'notifications', notifId), {
            userId: targetPost.authorId,
            actorId: userId,
            type: 'like',
            postId: postId,
            read: false,
            createdAt: Date.now()
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert optimistic update
      setPosts(current => current.map(p => 
        p.id === postId ? { ...p, isLiked: wasLiked, likesCount: currentCount } : p
      ));
    }
  };

  const handleShare = async (post: any) => {
    try {
      const shareUrl = `https://revitup.today/?p=${post.id}${auth.currentUser?.uid ? `&ref=${auth.currentUser.uid}` : ''}`;
      await Share.share({
        message: `Check out this post by @${post.authorUsername || 'tuner'} on RevitUp! ${shareUrl}`,
      });
    } catch (error: any) {
      console.log('Error sharing', error);
    }
  };

  const handlePostOptions = (post: any) => {
    const isOwner = post.authorId === auth.currentUser?.uid;
    const options: any[] = [];
    if (isOwner) {
      options.push({ text: 'Delete Post', onPress: () => handleDeletePost(post), style: 'destructive' });
    } else {
      options.push({ text: 'Report Post', onPress: () => handleReport(post), style: 'destructive' });
      options.push({ text: 'Block User', onPress: () => handleBlock(post.authorId), style: 'destructive' });
    }
    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Post Options', '', options);
  };

  const handleDeletePost = async (post: any) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'posts', post.id));
            setPosts(posts.filter(p => p.id !== post.id));
            Alert.alert('Success', 'Post deleted');
          } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to delete post');
          }
      }}
    ]);
  };

  const handleReport = async (post: any) => {
    try {
      await addDoc(collection(db, 'reports'), {
        postId: post.id,
        reportedBy: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });
      Alert.alert('Reported', 'Thank you. Our team will review this post.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlock = (authorId: string) => {
    setBlockedUsers(prev => [...prev, authorId]);
    Alert.alert('Blocked', 'You will no longer see posts from this user.');
  };

  const openComments = async (post: any) => {
    setSelectedPost(post);
    setShowCommentModal(true);
    if (post.id) {
      updateDoc(doc(db, 'posts', post.id), { viewsCount: increment(1) }).catch(console.error);
      setPosts(current => current.map(p => p.id === post.id ? { ...p, viewsCount: (p.viewsCount || 0) + 1 } : p));
    }
    
    const q = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const submitComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    try {
      await addDoc(collection(db, 'posts', selectedPost.id, 'comments'), {
        text: newComment.trim(),
        authorId: auth.currentUser?.uid,
        authorUsername: 'tuner_' + auth.currentUser?.uid.substring(0,4),
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'posts', selectedPost.id), { commentsCount: increment(1) });
      
      setPosts(current => current.map(p => 
        p.id === selectedPost.id ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
      ));
      
      setComments(prev => [...prev, { id: Date.now().toString(), text: newComment.trim(), authorUsername: 'You' }]);
      setNewComment('');

      // Send Push Notification
      if (selectedPost.authorId && selectedPost.authorId !== auth.currentUser?.uid) {
        import('firebase/firestore').then(async ({ getDoc, doc }) => {
          try {
            const authorDoc = await getDoc(doc(db, 'users', selectedPost.authorId));
            const pushToken = authorDoc.data()?.pushToken;
            if (pushToken) {
              const { sendPushNotification } = await import('../lib/notifications');
              sendPushNotification(pushToken, 'New Comment', `Someone commented on your post!`);
            }
          } catch (err) {
            console.error('Error sending push notification', err);
          }
        });
      }

    } catch (e) {
      console.error(e);
    }
  };

  const visiblePostsBase = posts.filter(p => !blockedUsers.includes(p.authorId));
  const feedItems = [];
  let postCounter = 0;
  for (let i = 0; i < visiblePostsBase.length; i++) {
    feedItems.push({ ...visiblePostsBase[i], type: 'post' });
    postCounter++;
    if (postCounter % 3 === 0) {
      feedItems.push({ id: `ad_${i}`, type: 'ad' });
    }
  }

  
  const renderPost = ({ item, index }: { item: any, index: number }) => {
    if (item.type === 'ad') {
      if (!nativeAd) {
        return (
          <View style={[styles.postContainer, { height: containerHeight, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' }]}>
            <View style={{ width: '90%', padding: 20, backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#222' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="sparkles" size={20} color="#F5D547" />
                </View>
                <View>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>RevitUp Featured Partner</Text>
                  <Text style={{ color: '#F5D547', fontSize: 10, fontWeight: '900' }}>SPONSORED</Text>
                </View>
              </View>
              <Text style={{ color: '#aaa', fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
                Discover high-performance automotive tuning, parts, and local specialist services on RevitUp.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('ServiceBoard')} style={{ backgroundColor: '#F5D547', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: '#000', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' }}>EXPLORE SERVICES</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
      return (
        <View style={[styles.postContainer, { height: containerHeight, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
           <NativeAdView style={{ width: '92%', backgroundColor: '#111', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#222' }} nativeAd={nativeAd}>
              <View style={styles.adTopRow}>
                {nativeAd.icon ? (
                  <NativeAsset assetType={NativeAssetType.ICON}>
                    <Image source={{ uri: nativeAd.icon.url }} style={styles.advertiserLogo} />
                  </NativeAsset>
                ) : (
                  <View style={styles.advertiserLogoPlaceholder}>
                    <Ionicons name="megaphone-outline" size={18} color="#F5D547" />
                  </View>
                )}
                <View style={styles.advertiserTextCol}>
                  <NativeAsset assetType={NativeAssetType.HEADLINE}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }} numberOfLines={1}>{nativeAd.headline}</Text>
                  </NativeAsset>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <View style={{ backgroundColor: '#F5D547', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ color: '#000', fontSize: 9, fontWeight: '900' }}>SPONSORED</Text>
                    </View>
                    {nativeAd.advertiser ? (
                      <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                        <Text style={{ color: '#888', fontSize: 12 }} numberOfLines={1}>{nativeAd.advertiser}</Text>
                      </NativeAsset>
                    ) : null}
                    {nativeAd.store ? (
                      <NativeAsset assetType={NativeAssetType.STORE}>
                        <Text style={{ color: '#888', fontSize: 12 }}>• {nativeAd.store}</Text>
                      </NativeAsset>
                    ) : null}
                  </View>
                </View>
              </View>
              
              <NativeMediaView 
                style={{ width: '100%', height: 220, borderRadius: 10, marginBottom: 14, backgroundColor: '#0a0a0a' }} 
                resizeMode="contain" 
              />

              {nativeAd.body ? (
                <NativeAsset assetType={NativeAssetType.BODY}>
                  <Text style={{ color: '#ccc', fontSize: 14, marginBottom: 16, lineHeight: 20 }}>{nativeAd.body}</Text>
                </NativeAsset>
              ) : null}

              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <View style={{ backgroundColor: '#e53935', borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {nativeAd.callToAction || 'INSTALL'}
                  </Text>
                </View>
              </NativeAsset>
           </NativeAdView>
        </View>
      );
    }

    return (
      <View style={[styles.postContainer, { height: containerHeight }]}>

        {item.mediaUrls && item.mediaUrls.length > 0 ? (
          <View style={styles.fullScreenImage}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              {item.mediaUrls.map((uri: string, idx: number) => (
                <View key={idx} style={{ width: Dimensions.get('window').width, height: containerHeight }}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
            {item.mediaUrls.length > 1 && (
              <View style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                <Ionicons name="images" size={16} color="#fff" style={{ marginRight: 4 }} /><Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{item.mediaUrls.length}</Text>
              </View>
            )}
          </View>
        ) : item.mediaUrl ? (
          <Image source={{ uri: item.mediaUrl }} style={styles.fullScreenImage} resizeMode="cover" />
        ) : (
          <View style={[styles.fullScreenImage, { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }]}>
             <Ionicons name="car-sport" size={64} color="#333" />
          </View>
        )}
        
        

        <View style={styles.postOverlay}>
          <View style={styles.bottomContent}>
            <View style={styles.postInfo}>
              <TouchableOpacity onPress={() => navigation.navigate("UserProfile", { userId: item.authorId })}>
                <Text style={styles.postUsername}>@{item.authorUsername || `user_${item.authorId?.substring(0,6) || 'unknown'}`}</Text>
              </TouchableOpacity>
              {item.caption ? <Text style={styles.postCaption}>{item.caption}</Text> : null}
              <View style={styles.musicTicker}>
                <Ionicons name="musical-notes" size={12} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.musicText}>Original Sound - RevitUp</Text>
              </View>
            </View>

            <View style={styles.rightActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
                <Ionicons name={item.isLiked ? "heart" : "heart-outline"} size={36} color={item.isLiked ? "#e53935" : "#fff"} />
                <Text style={styles.actionText}>{item.likesCount || 0}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => openComments(item)}>
                <Ionicons name="chatbubble-ellipses" size={32} color="#fff" />
                <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item)}>
                <Ionicons name="share-social" size={32} color="#fff" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => handlePostOptions(item)}>
                <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topHeaderOverlay}>
        <Text style={styles.logoTextOverlay}>REVITUP</Text>
        <View style={styles.topHeaderRight}>
          <TouchableOpacity 
            style={{ backgroundColor: '#222', borderWidth: 1, borderColor: '#f5d547', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 8, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => navigation.navigate('ServiceBoard')}
          >
            <Ionicons name="build" size={12} color="#f5d547" style={{ marginRight: 4 }} />
            <Text style={{ color: '#f5d547', fontWeight: 'bold', fontSize: 11 }}>SERVICE</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ backgroundColor: '#ff9800', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 8, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => navigation.navigate('Giveaways')}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>🎁 GIVEAWAY</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.chatBtnTop}
            onPress={() => navigation.navigate('Inbox')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.storiesBarOverlay}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
          <View style={{ alignItems: 'center', marginRight: 16 }}>
            <TouchableOpacity style={styles.addStoryBtn} onPress={handleAddStory}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.addStoryText}>Add Story</Text>
          </View>
          
          {activeStories.map((story) => (
             <View key={story.id} style={{ alignItems: 'center', marginRight: 16 }}>
                <TouchableOpacity 
                   style={[styles.addStoryBtn, { borderColor: '#e53935', borderWidth: 2, padding: 2 }]} 
                   onPress={() => navigation.navigate('StoryViewer', { userId: story.userId, username: story.username })}
                >
                  <Image source={{ uri: story.profilePic || story.mediaUrl }} style={{ width: '100%', height: '100%', borderRadius: 28 }} />
                </TouchableOpacity>
                <Text style={styles.addStoryText}>{story.username}</Text>
             </View>
          ))}
        </ScrollView>
      </View>
      
      <View 
        style={styles.feed} 
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: '50%' }} />
        ) : feedItems.length > 0 && containerHeight > 0 ? (
          <FlatList
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" colors={["#e53935"]} />}
            ref={flatListRef}
            data={feedItems}
            keyExtractor={item => item.id}
            renderItem={renderPost}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={containerHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.y / containerHeight);
              setActiveIndex(newIndex);
            }}
          />
        ) : containerHeight > 0 ? (
          <Text style={{color: '#666', textAlign: 'center', marginTop: '50%'}}>No posts found.</Text>
        ) : null}
      </View>

      <Modal visible={showCommentModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comments</Text>
            <TouchableOpacity onPress={() => setShowCommentModal(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.commentsList}>
            {comments.map(c => (
              <View key={c.id} style={styles.commentItem}>
                <Text style={styles.commentUser}>@{c.authorUsername}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            ))}
            {comments.length === 0 && <Text style={{color: '#666', textAlign: 'center', marginTop: 40}}>Be the first to comment!</Text>}
          </ScrollView>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.commentInputRow}>
              <TextInput 
                style={styles.commentInput} 
                placeholder="Add a comment..." 
                placeholderTextColor="#666" 
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity onPress={submitComment}>
                <Ionicons name="send" size={24} color="#e53935" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  topHeaderOverlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 45 : 55,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  logoTextOverlay: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  giveawayBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6b00',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#ff6b00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  giveawayBtnTextTop: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  chatBtnTop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  storiesBarOverlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 100 : 110,
    left: 16,
    zIndex: 10,
    alignItems: 'center',
  },
  addStoryBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginBottom: 6,
  },
  addStoryText: {
    color: '#aaa',
    fontSize: 11,
  },
  
  feed: { flex: 1, backgroundColor: '#000' },
  postContainer: { width: '100%', backgroundColor: '#000', position: 'relative' },
  fullScreenImage: { width: '100%', height: '100%' },
  
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.4)', // Faux gradient
  },
  bottomContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  postInfo: { flex: 1, paddingRight: 20 },
  postUsername: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  postCaption: { color: '#fff', fontSize: 15, marginBottom: 12, lineHeight: 20 },
  musicTicker: { flexDirection: 'row', alignItems: 'center' },
  musicText: { color: '#fff', fontSize: 13 },
  
  rightActions: { alignItems: 'center', gap: 20 },
  actionButton: { alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 4 },

  /* Comments Modal Styles */
  modalContainer: { flex: 1, backgroundColor: '#111' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  commentsList: { flex: 1, padding: 16 },
  commentItem: { marginBottom: 16, backgroundColor: '#1a1a1a', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  commentUser: { color: '#aaa', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  commentText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#333', backgroundColor: '#1a1a1a' },
  commentInput: { flex: 1, backgroundColor: '#000', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', marginRight: 12, borderWidth: 1, borderColor: '#333' },

  /* Admob Overlay Styling */
  adOverlay: { position: 'absolute', top: 100, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 16 },
  adContainerWrapper: { width: '100%' },
  adTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  advertiserLogo: { width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#333' },
  advertiserLogoPlaceholder: { width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#222' },
  advertiserTextCol: { flex: 1, justifyContent: 'center' },
  advertiserName: { color: '#fff', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  sponsoredTagSmall: { backgroundColor: '#F5D547', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, marginLeft: 6 },
  sponsoredTagSmallText: { color: '#000', fontSize: 9, fontWeight: '900' },
  adCtaWhite: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  adCtaWhiteText: { color: '#000', fontSize: 14, fontWeight: '900', textTransform: 'uppercase' },
});
