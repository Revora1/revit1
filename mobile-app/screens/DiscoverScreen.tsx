import { db } from '../firebaseConfig';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Platform, TouchableOpacity, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DiscoverScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('POSTS');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [posts, setPosts] = useState<any[]>([]);
  const [builds, setBuilds] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const postsQ = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
        const postsSnap = await getDocs(postsQ);
        setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const buildsQ = query(collection(db, 'garage'), orderBy('createdAt', 'desc'), limit(20));
        const buildsSnap = await getDocs(buildsQ);
        setBuilds(buildsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const usersQ = query(collection(db, 'users'), limit(20));
        const usersSnap = await getDocs(usersQ);
        setUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getSearchPlaceholder = () => {
    if (activeTab === 'POSTS') return 'Search posts, car makes, models, or build tags...';
    if (activeTab === 'BUILDS') return 'Find parts, setups or builders...';
    return 'Search builders & profiles...';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.titleText}>DISCOVER</Text>
        <Text style={styles.subtitleText}>SEARCH THE GLOBAL COMMUNITY BUILD REGISTRY</Text>
        
        <TouchableOpacity style={styles.directoryBtn} onPress={() => navigation.navigate('Menu')}>
          <Ionicons name="folder-open-outline" size={20} color="#000" style={{ marginRight: 8 }} />
          <Text style={styles.directoryBtnText}>BROWSE DIRECTORY</Text>
        </TouchableOpacity>

        <View style={styles.segmentControl}>
          {['POSTS', 'BUILDS', 'USERS'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.segmentTab, activeTab === tab && styles.segmentTabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>
                {tab === 'POSTS' && <Ionicons name="sparkles-outline" size={12} />}
                {tab === 'BUILDS' && <Ionicons name="layers-outline" size={12} />}
                {tab === 'USERS' && <Ionicons name="person-outline" size={12} />}
                {' '}{tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={getSearchPlaceholder()}
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          {activeTab === 'BUILDS' && (
            <TouchableOpacity style={styles.filtersBtn}>
              <Ionicons name="options-outline" size={18} color="#aaa" style={{ marginRight: 6 }} />
              <Text style={styles.filtersBtnText}>FILTERS</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'POSTS' && (
          <View style={styles.gridContainer}>
            <View style={styles.column}>
              {posts.filter((_, i) => i % 2 === 0).map(post => (
                <PostCard 
                  key={post.id}
                  image={post.mediaUrls?.[0] || 'https://via.placeholder.com/300'} 
                  text={post.caption || ''} 
                  user={`@${post.authorUsername || 'tuner'}`} 
                  likes={post.likesCount || 0} 
                  comments={post.commentsCount || 0} 
                  onPress={() => navigation.navigate("UserProfile", { userId: post.authorId })}
                />
              ))}
            </View>
            <View style={styles.column}>
              {posts.filter((_, i) => i % 2 !== 0).map(post => (
                <PostCard 
                  key={post.id}
                  image={post.mediaUrls?.[0] || 'https://via.placeholder.com/300'} 
                  text={post.caption || ''} 
                  user={`@${post.authorUsername || 'tuner'}`} 
                  likes={post.likesCount || 0} 
                  comments={post.commentsCount || 0} 
                  onPress={() => navigation.navigate("UserProfile", { userId: post.authorId })}
                />
              ))}
              {posts.length === 0 && !loading && (
                 <View style={styles.emptyCard}><Ionicons name="help-circle-outline" size={24} color="#555" /></View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'BUILDS' && (
          <View style={styles.buildsContainer}>
            <Text style={styles.matchesText}>FOUND {builds.length} MATCHES</Text>
            <View style={styles.gridContainer}>
              <View style={styles.column}>
                {builds.filter((_, i) => i % 2 === 0).map(car => (
                  <BuildCard 
                    key={car.id}
                    image={car.coverImage || 'https://via.placeholder.com/300'} 
                    stage={car.power ? `${car.power} HP` : 'STOCK'} 
                    title={`${car.year} ${car.make} ${car.model}`} 
                    desc={car.engine || ''} 
                    user={`@${car.ownerUsername || 'tuner'}`}
                    onPress={() => navigation.navigate("UserProfile", { userId: car.ownerId })}
                  />
                ))}
              </View>
              <View style={styles.column}>
                {builds.filter((_, i) => i % 2 !== 0).map(car => (
                  <BuildCard 
                    key={car.id}
                    image={car.coverImage || 'https://via.placeholder.com/300'} 
                    stage={car.power ? `${car.power} HP` : 'STOCK'} 
                    title={`${car.year} ${car.make} ${car.model}`} 
                    desc={car.engine || ''} 
                    user={`@${car.ownerUsername || 'tuner'}`}
                    onPress={() => navigation.navigate("UserProfile", { userId: car.ownerId })}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'USERS' && (
          <View style={styles.usersContainer}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="people-outline" size={14} /> BUILDERS
            </Text>
            <View style={{ gap: 12, marginTop: 12 }}>
              {users.map(u => (
                <TouchableOpacity 
                  key={u.uid} 
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 12, borderRadius: 16 }}
                  onPress={() => navigation.navigate("UserProfile", { userId: u.uid })}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', overflow: 'hidden', marginRight: 12 }}>
                    {u.profilePic ? (
                      <Image source={{ uri: u.profilePic }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                          {u.username?.[0]?.toUpperCase() || '?'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>@{u.username || 'tuner'}</Text>
                    {u.bio && <Text style={{ color: '#aaa', fontSize: 12 }} numberOfLines={1}>{u.bio}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#555" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const PostCard = ({ image, text, user, likes, comments, onPress }: any) => (
  <TouchableOpacity style={styles.postCard} onPress={onPress}>
    <Image source={{ uri: image }} style={styles.postCardImage} />
    <View style={styles.postCardGradient}>
      <Text style={styles.postCardText} numberOfLines={3}>{text}</Text>
      <View style={styles.postCardFooter}>
        <View style={styles.postCardUser}>
          <View style={styles.postCardAvatar}><Text style={styles.postCardAvatarText}>{user.charAt(1).toUpperCase()}</Text></View>
          <Text style={styles.postCardUserText}>{user}</Text>
        </View>
        <View style={styles.postCardStats}>
          <Ionicons name="heart-outline" size={12} color="#aaa" />
          <Text style={styles.postCardStatText}>{likes}</Text>
          <Ionicons name="chatbubble-outline" size={12} color="#aaa" style={{ marginLeft: 8 }} />
          <Text style={styles.postCardStatText}>{comments}</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

const BuildCard = ({ image, stage, title, desc, user, onPress }: any) => (
  <TouchableOpacity style={styles.buildCard} onPress={onPress}>
    <Image source={{ uri: image }} style={styles.buildCardImage} />
    <View style={styles.stageTag}>
      <Text style={styles.stageTagText}>{stage}</Text>
    </View>
    <View style={styles.buildCardContent}>
      <Text style={styles.buildCardTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.buildCardDesc} numberOfLines={1}>{desc}</Text>
      <View style={styles.buildCardUser}>
        <View style={styles.postCardAvatar}><Text style={styles.postCardAvatarText}>{user.charAt(1).toUpperCase()}</Text></View>
        <Text style={styles.buildCardUserText}>{user}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  header: { 
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#000', 
  },
  titleText: { color: '#fff', fontSize: 36, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1 },
  subtitleText: { color: '#888', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginTop: 4, marginBottom: 20 },
  directoryBtn: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 24 },
  directoryBtnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  actionButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, gap: 8 },
  actionBtnWhite: { flex: 1, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 24 },
  actionBtnYellow: { flex: 1, backgroundColor: '#ffcc00', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 24 },
  actionBtnPurple: { flex: 1, backgroundColor: '#e53935', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 24 },
  actionBtnTextBlack: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  actionBtnTextWhite: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  segmentTabActive: {
    backgroundColor: '#222',
  },
  segmentText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  segmentTextActive: {
    color: '#fff',
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  filtersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
  },
  filtersBtnText: { color: '#aaa', fontWeight: 'bold', fontSize: 12 },
  
  content: { flex: 1, paddingHorizontal: 16 },
  gridContainer: { flexDirection: 'row', gap: 12 },
  column: { flex: 1, gap: 12 },

  // Posts
  postCard: { backgroundColor: '#111', borderRadius: 16, overflow: 'hidden', aspectRatio: 0.8 },
  postCardImage: { ...StyleSheet.absoluteFill, width: undefined, height: undefined },
  postCardGradient: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    padding: 12, paddingTop: 40,
    backgroundColor: 'rgba(0,0,0,0.6)' 
  },
  postCardText: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  postCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postCardUser: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  postCardAvatar: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#555', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  postCardAvatarText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  postCardUserText: { color: '#ccc', fontSize: 10, flex: 1 },
  postCardStats: { flexDirection: 'row', alignItems: 'center' },
  postCardStatText: { color: '#aaa', fontSize: 10, marginLeft: 4 },
  emptyCard: { backgroundColor: '#111', borderRadius: 16, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' },

  // Builds
  buildsContainer: { paddingTop: 16 },
  matchesText: { color: '#888', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 16 },
  buildCard: { backgroundColor: '#161616', borderRadius: 16, overflow: 'hidden' },
  buildCardImage: { width: '100%', aspectRatio: 1.2 },
  stageTag: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stageTagText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  buildCardContent: { padding: 12 },
  buildCardTitle: { color: '#fff', fontWeight: '900', fontStyle: 'italic', fontSize: 14, marginBottom: 4 },
  buildCardDesc: { color: '#666', fontSize: 11, marginBottom: 12 },
  buildCardUser: { flexDirection: 'row', alignItems: 'center' },
  buildCardUserText: { color: '#aaa', fontSize: 10 },

  // Users
  usersContainer: { paddingTop: 16 },
  sectionTitle: { color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 16 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagPill: { borderWidth: 1, borderColor: '#fff', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16 },
  tagPillText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  buildTypeCard: { backgroundColor: '#111', borderRadius: 16, aspectRatio: 1.5, padding: 16, justifyContent: 'flex-end' },
  buildTypeText: { color: '#fff', fontWeight: '900', fontStyle: 'italic', fontSize: 14 },
});
