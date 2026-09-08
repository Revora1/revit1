import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Alert, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, limit, getDocs, doc, updateDoc, increment, setDoc, deleteDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function TopTunersScreen() {
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'following'>('discover');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      // Query users collection with fallback to ensure all tuners load even if followersCount is unset
      let userList: any[] = [];
      try {
        const q = query(collection(db, 'users'), limit(100));
        const snap = await getDocs(q);
        userList = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      } catch (err) {
        console.warn('Error fetching all users:', err);
      }

      // Sort descending by followersCount, then by username
      userList.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
      setUsers(userList);

      // Fetch user's following IDs from both 'follows' collection and user subcollection
      if (auth.currentUser) {
        const foundFollowing = new Set<string>();
        
        try {
          const followsQ = query(
            collection(db, 'follows'),
            where('followerId', '==', auth.currentUser.uid)
          );
          const followsSnap = await getDocs(followsQ);
          followsSnap.docs.forEach(d => {
            const data = d.data();
            if (data.followingId) foundFollowing.add(data.followingId);
          });
        } catch (e) {
          console.warn('Error fetching follows collection:', e);
        }

        try {
          const subFollowsSnap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'following'));
          subFollowsSnap.docs.forEach(d => foundFollowing.add(d.id));
        } catch (e) {
          console.warn('Error fetching user following subcollection:', e);
        }

        setFollowingIds(Array.from(foundFollowing));
      }
    } catch (err: any) {
      console.error('Error in fetchUsers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleFollow = async (targetUser: any) => {
    if (!auth.currentUser) {
      Alert.alert('Login Required', 'You must be logged in to follow tuners.');
      return;
    }
    const isFollowing = followingIds.includes(targetUser.id);
    const myId = auth.currentUser.uid;
    
    // Optimistic UI update
    if (isFollowing) {
      setFollowingIds(prev => prev.filter(id => id !== targetUser.id));
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, followersCount: Math.max(0, (u.followersCount || 0) - 1) } : u));
    } else {
      setFollowingIds(prev => [...prev, targetUser.id]);
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, followersCount: (u.followersCount || 0) + 1 } : u));
    }

    try {
      const followDocId = `${myId}_${targetUser.id}`;
      const followDocRef = doc(db, 'follows', followDocId);
      const myFollowRef = doc(db, 'users', myId, 'following', targetUser.id);
      const targetFollowerRef = doc(db, 'users', targetUser.id, 'followers', myId);
      const targetUserDoc = doc(db, 'users', targetUser.id);
      const myUserDoc = doc(db, 'users', myId);

      if (isFollowing) {
        await Promise.allSettled([
          deleteDoc(followDocRef),
          deleteDoc(myFollowRef),
          deleteDoc(targetFollowerRef),
          setDoc(targetUserDoc, { followersCount: increment(-1) }, { merge: true }),
          setDoc(myUserDoc, { followingCount: increment(-1) }, { merge: true })
        ]);
      } else {
        await Promise.allSettled([
          setDoc(followDocRef, { followerId: myId, followingId: targetUser.id, createdAt: Date.now() }),
          setDoc(myFollowRef, { followedAt: Date.now() }),
          setDoc(targetFollowerRef, { followedAt: Date.now() }),
          setDoc(targetUserDoc, { followersCount: increment(1) }, { merge: true }),
          setDoc(myUserDoc, { followingCount: increment(1) }, { merge: true })
        ]);
      }
    } catch (err: any) {
      console.error('Follow toggle error:', err);
      // Re-fetch to sync with backend on failure
      fetchUsers();
    }
  };

  const baseUsers = activeTab === 'discover'
    ? users
    : users.filter(u => followingIds.includes(u.id));

  const filteredUsers = baseUsers.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.bio && u.bio.toLowerCase().includes(q))
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
          <Text style={styles.headerTitle}>TOP TUNERS</Text>
        </View>
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
          style={[styles.tab, activeTab === 'following' && styles.activeTab]} 
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>Following</Text>
        </TouchableOpacity>
      </View>

      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#666" style={{ marginRight: 8 }} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search tuners, builders..." 
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
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((u, index) => {
            const isFollowing = followingIds.includes(u.id);
            const isMe = auth.currentUser?.uid === u.id;
            return (
              <TouchableOpacity 
                key={u.id} 
                style={styles.card}
                onPress={() => navigation.navigate('UserProfile', { userId: u.id, username: u.username })}
                activeOpacity={0.8}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                {u.profilePic || u.photoURL ? (
                  <Image source={{ uri: u.profilePic || u.photoURL }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={20} color="#888" />
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.username}>@{u.username || 'tuner'}</Text>
                  <Text style={styles.followers}>{u.followersCount || 0} Followers</Text>
                </View>
                {!isMe && (
                  <TouchableOpacity 
                    style={[styles.followBtn, isFollowing && styles.followingBtn]} 
                    onPress={() => handleToggleFollow(u)}
                  >
                    <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>
              {activeTab === 'following' ? "You aren't following any tuners yet." : "No top tuners found."}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#000' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
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
  card: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  rankBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: '#333' },
  rankText: { color: '#fff', fontWeight: '900', fontStyle: 'italic', fontSize: 13 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarImg: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  info: { flex: 1 },
  username: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  followers: { color: '#888', fontSize: 13, marginTop: 2 },
  followBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  followBtnText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  followingBtn: { backgroundColor: '#222', borderWidth: 1, borderColor: '#444' },
  followingBtnText: { color: '#fff' }
});
