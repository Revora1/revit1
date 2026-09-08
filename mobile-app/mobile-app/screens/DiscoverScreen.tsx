import { db } from '../firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Platform, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type SearchTab = 'ALL' | 'POSTS' | 'BUILDS' | 'TUNERS' | 'MARKET' | 'CLUBS' | 'SHOPS' | 'DYNO';

export default function DiscoverScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<SearchTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [posts, setPosts] = useState<any[]>([]);
  const [builds, setBuilds] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [dynoRecords, setDynoRecords] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time subscriptions across all collections so anything newly added is instantly searchable
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    try {
      // 1. Posts (Live)
      const postsQ = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(80));
      const unsubPosts = onSnapshot(postsQ, (snap) => {
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, (err) => console.log('Posts sync error:', err));
      unsubs.push(unsubPosts);

      // 2. Builds / Garage (Live)
      const buildsQ = query(collection(db, 'garage'), orderBy('createdAt', 'desc'), limit(80));
      const unsubBuilds = onSnapshot(buildsQ, (snap) => {
        setBuilds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.log('Builds sync error:', err));
      unsubs.push(unsubBuilds);

      // 3. Users / Tuners (Live)
      const usersQ = query(collection(db, 'users'), limit(80));
      const unsubUsers = onSnapshot(usersQ, (snap) => {
        setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      }, (err) => console.log('Users sync error:', err));
      unsubs.push(unsubUsers);

      // 4. Marketplace Listings (Live)
      const marketQ = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'), limit(60));
      const unsubMarket = onSnapshot(marketQ, (snap) => {
        setMarketplaceItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.log('Marketplace sync error:', err));
      unsubs.push(unsubMarket);

      // 5. Car Clubs / Groups (Live)
      const groupsQ = query(collection(db, 'groups'), limit(60));
      const unsubGroups = onSnapshot(groupsQ, (snap) => {
        setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.log('Groups sync error:', err));
      unsubs.push(unsubGroups);

      // 6. Mechanics & Shops (Live)
      const mechanicsQ = query(collection(db, 'mechanics'), limit(60));
      const unsubMechanics = onSnapshot(mechanicsQ, (snap) => {
        setMechanics(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.log('Mechanics sync error:', err));
      unsubs.push(unsubMechanics);

      // 7. Dyno & Performance Records (Live)
      const dynoQ = query(collection(db, 'performance_board'), limit(60));
      const unsubDyno = onSnapshot(dynoQ, (snap) => {
        setDynoRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.log('Dyno sync error:', err));
      unsubs.push(unsubDyno);

    } catch (e) {
      console.warn('Error setting up search subscriptions:', e);
      setLoading(false);
    }

    return () => {
      unsubs.forEach(unsub => {
        try { unsub(); } catch (e) { /* silent */ }
      });
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Comprehensive Search Matching
  const cleanQ = searchQuery.toLowerCase().trim();
  const searchTerms = cleanQ.length > 0 ? cleanQ.split(/\s+/) : [];

  const matchesAllTerms = (targetText: string) => {
    if (searchTerms.length === 0) return true;
    const lower = targetText.toLowerCase();
    return searchTerms.every(term => lower.includes(term));
  };

  const filteredPosts = useMemo(() => {
    if (!cleanQ) return posts;
    return posts.filter(p => {
      const text = `${p.caption || ''} ${p.authorUsername || ''} ${p.carTag || ''} ${p.tags ? p.tags.join(' ') : ''}`;
      return matchesAllTerms(text);
    });
  }, [posts, cleanQ]);

  const filteredBuilds = useMemo(() => {
    if (!cleanQ) return builds;
    return builds.filter(b => {
      const text = `${b.year || ''} ${b.make || ''} ${b.model || ''} ${b.trim || ''} ${b.engine || ''} ${b.modifications || ''} ${b.power || ''} ${b.ownerUsername || ''} ${b.name || ''}`;
      return matchesAllTerms(text);
    });
  }, [builds, cleanQ]);

  const filteredUsers = useMemo(() => {
    if (!cleanQ) return users;
    return users.filter(u => {
      const text = `${u.username || ''} ${u.displayName || ''} ${u.bio || ''} ${u.city || ''}`;
      return matchesAllTerms(text);
    });
  }, [users, cleanQ]);

  const filteredMarket = useMemo(() => {
    if (!cleanQ) return marketplaceItems;
    return marketplaceItems.filter(m => {
      const text = `${m.title || ''} ${m.description || ''} ${m.category || ''} ${m.sellerUsername || ''} ${m.brand || ''}`;
      return matchesAllTerms(text);
    });
  }, [marketplaceItems, cleanQ]);

  const filteredGroups = useMemo(() => {
    if (!cleanQ) return groups;
    return groups.filter(g => {
      const text = `${g.name || ''} ${g.description || ''} ${g.location || ''} ${g.category || ''}`;
      return matchesAllTerms(text);
    });
  }, [groups, cleanQ]);

  const filteredMechanics = useMemo(() => {
    if (!cleanQ) return mechanics;
    return mechanics.filter(m => {
      const text = `${m.companyName || ''} ${m.specialties || ''} ${m.location || ''} ${m.phone || ''} ${m.website || ''}`;
      return matchesAllTerms(text);
    });
  }, [mechanics, cleanQ]);

  const filteredDyno = useMemo(() => {
    if (!cleanQ) return dynoRecords;
    return dynoRecords.filter(d => {
      const text = `${d.vehicle || ''} ${d.carModel || ''} ${d.horsepower || ''} ${d.torque || ''} ${d.tuner || ''} ${d.ownerUsername || ''} ${d.dynoShop || ''}`;
      return matchesAllTerms(text);
    });
  }, [dynoRecords, cleanQ]);

  const totalResultsCount = filteredPosts.length + filteredBuilds.length + filteredUsers.length + 
    filteredMarket.length + filteredGroups.length + filteredMechanics.length + filteredDyno.length;

  const quickPills = ['Honda', 'BMW', 'Turbo', 'Miata', 'Civic', 'V8', 'JDM', 'Tuning', 'Exhaust', 'Track'];

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'POSTS': return 'Search posts, captions, hashtags...';
      case 'BUILDS': return 'Search car make, model, HP, engine...';
      case 'TUNERS': return 'Search tuners, builders, usernames...';
      case 'MARKET': return 'Search parts, cars, wheels, turbos...';
      case 'CLUBS': return 'Search car clubs, meets, locations...';
      case 'SHOPS': return 'Search mechanics, tuning shops, services...';
      case 'DYNO': return 'Search dyno runs, high horsepower builds...';
      default: return 'Search everything in RevitUp...';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.titleText}>DISCOVER</Text>
            <Text style={styles.subtitleText}>UNIVERSAL SEARCH & COMMUNITY REGISTRY</Text>
          </View>
          <TouchableOpacity 
            style={styles.directoryIconBtn}
            onPress={() => {
              const parent = navigation.getParent();
              if (parent) { parent.navigate('Menu'); } else { navigation.navigate('Menu'); }
            }}
          >
            <Ionicons name="folder-open-outline" size={18} color="#fff" />
            <Text style={styles.directoryIconBtnText}>DIRECTORY</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Nav Shortcuts */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }} contentContainerStyle={{ paddingRight: 16 }}>
          <TouchableOpacity 
            style={[styles.quickNavBtn, { backgroundColor: '#f5d547' }]}
            onPress={() => navigation.navigate('ServiceBoard')}
          >
            <Ionicons name="build" size={13} color="#000" style={{ marginRight: 6 }} />
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 11 }}>SERVICE BOARD</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickNavBtn}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Ionicons name="cart-outline" size={13} color="#fff" style={{ marginRight: 6 }} />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>MARKETPLACE</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickNavBtn}
            onPress={() => navigation.navigate('Groups')}
          >
            <Ionicons name="people-outline" size={13} color="#fff" style={{ marginRight: 6 }} />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>CAR CLUBS</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickNavBtn}
            onPress={() => navigation.navigate('DynoBoard')}
          >
            <Ionicons name="speedometer-outline" size={13} color="#fff" style={{ marginRight: 6 }} />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>DYNO</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Universal Search Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={getPlaceholder()}
              placeholderTextColor="#777"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color="#888" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Tabs with live count badges */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {(['ALL', 'POSTS', 'BUILDS', 'TUNERS', 'MARKET', 'CLUBS', 'SHOPS', 'DYNO'] as SearchTab[]).map((tab) => {
            let count: number | null = null;
            if (cleanQ.length > 0) {
              if (tab === 'ALL') count = totalResultsCount;
              else if (tab === 'POSTS') count = filteredPosts.length;
              else if (tab === 'BUILDS') count = filteredBuilds.length;
              else if (tab === 'TUNERS') count = filteredUsers.length;
              else if (tab === 'MARKET') count = filteredMarket.length;
              else if (tab === 'CLUBS') count = filteredGroups.length;
              else if (tab === 'SHOPS') count = filteredMechanics.length;
              else if (tab === 'DYNO') count = filteredDyno.length;
            }

            return (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabChipText, activeTab === tab && styles.tabChipTextActive]}>
                  {tab}
                </Text>
                {count !== null && (
                  <View style={[styles.tabCountBadge, activeTab === tab && styles.tabCountBadgeActive]}>
                    <Text style={[styles.tabCountBadgeText, activeTab === tab && styles.tabCountBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f5d547" />}
      >
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#f5d547" />
            <Text style={{ color: '#888', marginTop: 12, fontSize: 13 }}>Syncing registry...</Text>
          </View>
        ) : (
          <>
            {/* Quick Suggestions when search is empty */}
            {cleanQ.length === 0 && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>POPULAR SEARCHES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {quickPills.map(tag => (
                    <TouchableOpacity 
                      key={tag} 
                      style={styles.quickPill}
                      onPress={() => setSearchQuery(tag)}
                    >
                      <Text style={styles.quickPillText}>#{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Active search header summary */}
            {cleanQ.length > 0 && (
              <View style={styles.searchStatsRow}>
                <Text style={styles.searchStatsText}>
                  FOUND <Text style={{ color: '#f5d547', fontWeight: '900' }}>{totalResultsCount}</Text> {totalResultsCount === 1 ? 'MATCH' : 'MATCHES'} FOR "{cleanQ.toUpperCase()}"
                </Text>
                {totalResultsCount === 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text style={{ color: '#f5d547', fontSize: 12, fontWeight: 'bold' }}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ZERO RESULTS IN WHOLE APP */}
            {cleanQ.length > 0 && totalResultsCount === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#444" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Results Found</Text>
                <Text style={styles.emptyDesc}>
                  We couldn't find anything matching "{searchQuery}". Try searching for a car make, model, user handle, or part name.
                </Text>
              </View>
            )}

            {/* TAB: ALL */}
            {activeTab === 'ALL' && (
              <View style={{ paddingBottom: 40 }}>
                {/* 1. Builds / Garage Section */}
                {filteredBuilds.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>
                        <Ionicons name="layers-outline" size={14} color="#f5d547" /> BUILDS & GARAGE ({filteredBuilds.length})
                      </Text>
                      {filteredBuilds.length > 4 && (
                        <TouchableOpacity onPress={() => setActiveTab('BUILDS')}>
                          <Text style={styles.seeAllText}>VIEW ALL</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.gridContainer}>
                      {filteredBuilds.slice(0, 4).map(car => (
                        <View key={car.id} style={{ width: '48%' }}>
                          <BuildCard 
                            image={car.coverImage || car.imageUrls?.[0] || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400'} 
                            stage={car.power ? `${car.power} HP` : (car.stage || 'STOCK')} 
                            title={`${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim() || 'Custom Build'} 
                            desc={car.engine || car.modifications || ''} 
                            user={`@${car.ownerUsername || 'tuner'}`}
                            onPress={() => navigation.navigate("UserProfile", { userId: car.ownerId })}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 2. Posts Section */}
                {filteredPosts.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>
                        <Ionicons name="sparkles-outline" size={14} color="#f5d547" /> POSTS & UPDATES ({filteredPosts.length})
                      </Text>
                      {filteredPosts.length > 4 && (
                        <TouchableOpacity onPress={() => setActiveTab('POSTS')}>
                          <Text style={styles.seeAllText}>VIEW ALL</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.gridContainer}>
                      {filteredPosts.slice(0, 4).map(post => (
                        <View key={post.id} style={{ width: '48%' }}>
                          <PostCard 
                            image={post.mediaUrls?.[0] || post.imageUrl || 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=400'} 
                            text={post.caption || ''} 
                            user={`@${post.authorUsername || 'tuner'}`} 
                            likes={post.likesCount || 0} 
                            comments={post.commentsCount || 0} 
                            onPress={() => navigation.navigate("UserProfile", { userId: post.authorId })}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 3. Tuners / Users Section */}
                {filteredUsers.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>
                        <Ionicons name="person-outline" size={14} color="#f5d547" /> TUNERS & BUILDERS ({filteredUsers.length})
                      </Text>
                      {filteredUsers.length > 4 && (
                        <TouchableOpacity onPress={() => setActiveTab('TUNERS')}>
                          <Text style={styles.seeAllText}>VIEW ALL</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={{ gap: 8 }}>
                      {filteredUsers.slice(0, 4).map(u => (
                        <UserRow key={u.uid} user={u} onPress={() => navigation.navigate("UserProfile", { userId: u.uid })} />
                      ))}
                    </View>
                  </View>
                )}

                {/* 4. Marketplace Section */}
                {filteredMarket.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>
                        <Ionicons name="cart-outline" size={14} color="#f5d547" /> MARKETPLACE ({filteredMarket.length})
                      </Text>
                      <TouchableOpacity onPress={() => navigation.navigate('Marketplace', { searchQuery })}>
                        <Text style={styles.seeAllText}>OPEN MARKET</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ gap: 10 }}>
                      {filteredMarket.slice(0, 3).map(item => (
                        <MarketRow 
                          key={item.id} 
                          item={item} 
                          onPress={() => navigation.navigate('Marketplace', { searchQuery: item.title })} 
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* 5. Car Clubs / Groups Section */}
                {filteredGroups.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>
                        <Ionicons name="people-outline" size={14} color="#f5d547" /> CAR CLUBS ({filteredGroups.length})
                      </Text>
                      <TouchableOpacity onPress={() => navigation.navigate('Groups')}>
                        <Text style={styles.seeAllText}>ALL CLUBS</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ gap: 10 }}>
                      {filteredGroups.slice(0, 3).map(group => (
                        <GroupRow 
                          key={group.id} 
                          group={group} 
                          onPress={() => navigation.navigate('GroupFeed', { groupId: group.id, groupName: group.name })} 
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* 6. Mechanics & Shops Section */}
                {filteredMechanics.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>
                        <Ionicons name="build-outline" size={14} color="#f5d547" /> SHOPS & SERVICES ({filteredMechanics.length})
                      </Text>
                      <TouchableOpacity onPress={() => navigation.navigate('ServiceBoard')}>
                        <Text style={styles.seeAllText}>SERVICE BOARD</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ gap: 10 }}>
                      {filteredMechanics.slice(0, 3).map(shop => (
                        <MechanicRow 
                          key={shop.id} 
                          shop={shop} 
                          onPress={() => navigation.navigate('ServiceBoard')} 
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* 7. Dyno Board Section */}
                {filteredDyno.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>
                        <Ionicons name="speedometer-outline" size={14} color="#f5d547" /> DYNO RECORDS ({filteredDyno.length})
                      </Text>
                      <TouchableOpacity onPress={() => navigation.navigate('DynoBoard')}>
                        <Text style={styles.seeAllText}>DYNO BOARD</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ gap: 10 }}>
                      {filteredDyno.slice(0, 3).map(record => (
                        <DynoRow 
                          key={record.id} 
                          record={record} 
                          onPress={() => navigation.navigate('DynoBoard')} 
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* TAB: POSTS */}
            {activeTab === 'POSTS' && (
              <View style={{ paddingBottom: 40 }}>
                {filteredPosts.length === 0 ? (
                  <CategoryEmpty tabName="posts" onClear={() => setSearchQuery('')} />
                ) : (
                  <View style={styles.gridContainer}>
                    {filteredPosts.map(post => (
                      <View key={post.id} style={{ width: '48%' }}>
                        <PostCard 
                          image={post.mediaUrls?.[0] || post.imageUrl || 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=400'} 
                          text={post.caption || ''} 
                          user={`@${post.authorUsername || 'tuner'}`} 
                          likes={post.likesCount || 0} 
                          comments={post.commentsCount || 0} 
                          onPress={() => navigation.navigate("UserProfile", { userId: post.authorId })}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* TAB: BUILDS */}
            {activeTab === 'BUILDS' && (
              <View style={{ paddingBottom: 40 }}>
                {filteredBuilds.length === 0 ? (
                  <CategoryEmpty tabName="builds" onClear={() => setSearchQuery('')} />
                ) : (
                  <View style={styles.gridContainer}>
                    {filteredBuilds.map(car => (
                      <View key={car.id} style={{ width: '48%' }}>
                        <BuildCard 
                          image={car.coverImage || car.imageUrls?.[0] || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400'} 
                          stage={car.power ? `${car.power} HP` : (car.stage || 'STOCK')} 
                          title={`${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim() || 'Custom Build'} 
                          desc={car.engine || car.modifications || ''} 
                          user={`@${car.ownerUsername || 'tuner'}`}
                          onPress={() => navigation.navigate("UserProfile", { userId: car.ownerId })}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* TAB: TUNERS */}
            {activeTab === 'TUNERS' && (
              <View style={{ paddingBottom: 40, gap: 10 }}>
                {filteredUsers.length === 0 ? (
                  <CategoryEmpty tabName="tuners" onClear={() => setSearchQuery('')} />
                ) : (
                  filteredUsers.map(u => (
                    <UserRow key={u.uid} user={u} onPress={() => navigation.navigate("UserProfile", { userId: u.uid })} />
                  ))
                )}
              </View>
            )}

            {/* TAB: MARKET */}
            {activeTab === 'MARKET' && (
              <View style={{ paddingBottom: 40, gap: 10 }}>
                {filteredMarket.length === 0 ? (
                  <CategoryEmpty tabName="marketplace listings" onClear={() => setSearchQuery('')} />
                ) : (
                  filteredMarket.map(item => (
                    <MarketRow 
                      key={item.id} 
                      item={item} 
                      onPress={() => navigation.navigate('Marketplace', { searchQuery: item.title })} 
                    />
                  ))
                )}
              </View>
            )}

            {/* TAB: CLUBS */}
            {activeTab === 'CLUBS' && (
              <View style={{ paddingBottom: 40, gap: 10 }}>
                {filteredGroups.length === 0 ? (
                  <CategoryEmpty tabName="car clubs" onClear={() => setSearchQuery('')} />
                ) : (
                  filteredGroups.map(group => (
                    <GroupRow 
                      key={group.id} 
                      group={group} 
                      onPress={() => navigation.navigate('GroupFeed', { groupId: group.id, groupName: group.name })} 
                    />
                  ))
                )}
              </View>
            )}

            {/* TAB: SHOPS */}
            {activeTab === 'SHOPS' && (
              <View style={{ paddingBottom: 40, gap: 10 }}>
                {filteredMechanics.length === 0 ? (
                  <CategoryEmpty tabName="shops & mechanics" onClear={() => setSearchQuery('')} />
                ) : (
                  filteredMechanics.map(shop => (
                    <MechanicRow 
                      key={shop.id} 
                      shop={shop} 
                      onPress={() => navigation.navigate('ServiceBoard')} 
                    />
                  ))
                )}
              </View>
            )}

            {/* TAB: DYNO */}
            {activeTab === 'DYNO' && (
              <View style={{ paddingBottom: 40, gap: 10 }}>
                {filteredDyno.length === 0 ? (
                  <CategoryEmpty tabName="dyno records" onClear={() => setSearchQuery('')} />
                ) : (
                  filteredDyno.map(record => (
                    <DynoRow 
                      key={record.id} 
                      record={record} 
                      onPress={() => navigation.navigate('DynoBoard')} 
                    />
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ----------------------------------------------------------------------
// Reusable Search Components
// ----------------------------------------------------------------------

const PostCard = ({ image, text, user, likes, comments, onPress }: any) => (
  <TouchableOpacity style={styles.postCard} onPress={onPress} activeOpacity={0.85}>
    <Image source={{ uri: image }} style={styles.postCardImage} />
    <View style={styles.postCardGradient}>
      <Text style={styles.postCardText} numberOfLines={2}>{text || 'Community Build Update'}</Text>
      <View style={styles.postCardFooter}>
        <View style={styles.postCardUser}>
          <View style={styles.postCardAvatar}>
            <Text style={styles.postCardAvatarText}>{user.charAt(1).toUpperCase()}</Text>
          </View>
          <Text style={styles.postCardUserText} numberOfLines={1}>{user}</Text>
        </View>
        <View style={styles.postCardStats}>
          <Ionicons name="heart" size={11} color="#f5d547" />
          <Text style={styles.postCardStatText}>{likes}</Text>
          <Ionicons name="chatbubble" size={11} color="#888" style={{ marginLeft: 6 }} />
          <Text style={styles.postCardStatText}>{comments}</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

const BuildCard = ({ image, stage, title, desc, user, onPress }: any) => (
  <TouchableOpacity style={styles.buildCard} onPress={onPress} activeOpacity={0.85}>
    <Image source={{ uri: image }} style={styles.buildCardImage} />
    <View style={styles.stageTag}>
      <Text style={styles.stageTagText}>{stage}</Text>
    </View>
    <View style={styles.buildCardContent}>
      <Text style={styles.buildCardTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.buildCardDesc} numberOfLines={1}>{desc || 'Custom Project'}</Text>
      <View style={styles.buildCardUser}>
        <View style={styles.postCardAvatar}>
          <Text style={styles.postCardAvatarText}>{user.charAt(1).toUpperCase()}</Text>
        </View>
        <Text style={styles.buildCardUserText} numberOfLines={1}>{user}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const UserRow = ({ user, onPress }: any) => (
  <TouchableOpacity style={styles.userRow} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.userAvatar}>
      {user.profilePic ? (
        <Image source={{ uri: user.profilePic }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
          {user.username?.[0]?.toUpperCase() || '?'}
        </Text>
      )}
    </View>
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={styles.userName}>@{user.username || 'tuner'}</Text>
        {user.isVerified && <Ionicons name="checkmark-circle" size={14} color="#f5d547" />}
      </View>
      {user.displayName && <Text style={styles.userSubName} numberOfLines={1}>{user.displayName}</Text>}
      {user.bio && <Text style={styles.userBio} numberOfLines={1}>{user.bio}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={18} color="#555" />
  </TouchableOpacity>
);

const MarketRow = ({ item, onPress }: any) => (
  <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.8}>
    <Image 
      source={{ uri: item.imageUris?.[0] || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=200' }} 
      style={styles.itemThumb} 
    />
    <View style={{ flex: 1 }}>
      <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.itemSubtitle} numberOfLines={1}>
        {item.category ? item.category.toUpperCase() : 'PART'} • @{item.sellerUsername || 'seller'}
      </Text>
      <Text style={styles.itemPrice}>
        {item.currency || '$'}{Number(item.price || 0).toLocaleString()}
      </Text>
    </View>
    <Ionicons name="arrow-forward-circle-outline" size={22} color="#f5d547" />
  </TouchableOpacity>
);

const GroupRow = ({ group, onPress }: any) => (
  <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.8}>
    <Image 
      source={{ uri: group.bannerUrl || group.avatarUrl || 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&q=80&w=200' }} 
      style={styles.itemThumb} 
    />
    <View style={{ flex: 1 }}>
      <Text style={styles.itemTitle} numberOfLines={1}>{group.name}</Text>
      <Text style={styles.itemSubtitle} numberOfLines={1}>
        {group.location ? `${group.location} • ` : ''}{group.membersCount || 1} members
      </Text>
      {group.description && <Text style={styles.itemBio} numberOfLines={1}>{group.description}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={18} color="#555" />
  </TouchableOpacity>
);

const MechanicRow = ({ shop, onPress }: any) => (
  <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.8}>
    <Image 
      source={{ uri: shop.bannerUrl || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=200' }} 
      style={styles.itemThumb} 
    />
    <View style={{ flex: 1 }}>
      <Text style={styles.itemTitle} numberOfLines={1}>{shop.companyName}</Text>
      <Text style={styles.itemSubtitle} numberOfLines={1}>
        <Ionicons name="location-outline" size={11} color="#aaa" /> {shop.location || 'Local Shop'}
      </Text>
      <Text style={styles.itemHighlight} numberOfLines={1}>{shop.specialties || 'Automotive Services'}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#555" />
  </TouchableOpacity>
);

const DynoRow = ({ record, onPress }: any) => (
  <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.dynoBadge}>
      <Text style={styles.dynoBadgeText}>{record.horsepower || '---'}</Text>
      <Text style={styles.dynoBadgeSub}>HP</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.itemTitle} numberOfLines={1}>{record.vehicle || record.carModel || 'Custom Dyno Run'}</Text>
      <Text style={styles.itemSubtitle} numberOfLines={1}>
        {record.torque ? `${record.torque} lb-ft • ` : ''}@{record.ownerUsername || 'tuner'}
      </Text>
      {record.quarterMile && (
        <Text style={styles.itemHighlight} numberOfLines={1}>
          1/4 Mile: {record.quarterMile}s
        </Text>
      )}
    </View>
    <Ionicons name="chevron-forward" size={18} color="#555" />
  </TouchableOpacity>
);

const CategoryEmpty = ({ tabName, onClear }: { tabName: string; onClear: () => void }) => (
  <View style={styles.emptyState}>
    <Ionicons name="search-outline" size={40} color="#444" style={{ marginBottom: 8 }} />
    <Text style={styles.emptyTitle}>No matching {tabName}</Text>
    <Text style={styles.emptyDesc}>Try adjusting your search terms or clearing filters.</Text>
    <TouchableOpacity onPress={onClear} style={styles.clearFilterBtn}>
      <Text style={styles.clearFilterBtnText}>Clear Search</Text>
    </TouchableOpacity>
  </View>
);

// ----------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#000', 
    paddingTop: Platform.OS === 'android' ? 25 : 0 
  },
  header: { 
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleText: { 
    color: '#fff', 
    fontSize: 28, 
    fontWeight: '900', 
    fontStyle: 'italic', 
    letterSpacing: -1 
  },
  subtitleText: { 
    color: '#777', 
    fontSize: 9, 
    fontWeight: 'bold', 
    letterSpacing: 1, 
    marginTop: 2 
  },
  directoryIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  directoryIconBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  quickNavBtn: { 
    backgroundColor: '#1c1c1c', 
    borderWidth: 1, 
    borderColor: '#2a2a2a', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 14, 
    marginRight: 6, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },

  // Search input row
  searchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4,
    marginBottom: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#242424',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  // Tabs / Chips
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 6,
    gap: 6,
  },
  tabChipActive: {
    backgroundColor: '#f5d547',
    borderColor: '#f5d547',
  },
  tabChipText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '800',
  },
  tabChipTextActive: {
    color: '#000',
  },
  tabCountBadge: {
    backgroundColor: '#222',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabCountBadgeActive: {
    backgroundColor: '#000',
  },
  tabCountBadgeText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabCountBadgeTextActive: {
    color: '#f5d547',
  },

  // Content scroll
  content: { 
    flex: 1, 
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Suggestions
  suggestionsContainer: {
    marginBottom: 16,
  },
  suggestionsTitle: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  quickPill: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickPillText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },

  // Search stats
  searchStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
  },
  searchStatsText: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Section Blocks in ALL mode
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  seeAllText: {
    color: '#f5d547',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Grids
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    rowGap: 12 
  },

  // Post Card
  postCard: { 
    backgroundColor: '#111', 
    borderRadius: 14, 
    overflow: 'hidden', 
    aspectRatio: 0.85,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  postCardImage: { ...StyleSheet.absoluteFillObject },
  postCardGradient: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 10, 
    paddingTop: 30,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  postCardText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 12, 
    marginBottom: 6,
    lineHeight: 15,
  },
  postCardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  postCardUser: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  postCardAvatar: { 
    width: 16, 
    height: 16, 
    borderRadius: 8, 
    backgroundColor: '#333', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 4 
  },
  postCardAvatarText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  postCardUserText: { color: '#bbb', fontSize: 10, flex: 1 },
  postCardStats: { flexDirection: 'row', alignItems: 'center' },
  postCardStatText: { color: '#ccc', fontSize: 10, marginLeft: 2 },

  // Build Card
  buildCard: { 
    backgroundColor: '#141414', 
    borderRadius: 14, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#202020',
  },
  buildCardImage: { width: '100%', aspectRatio: 1.3 },
  stageTag: { 
    position: 'absolute', 
    top: 8, 
    left: 8, 
    backgroundColor: 'rgba(0,0,0,0.75)', 
    borderWidth: 1,
    borderColor: '#f5d547',
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 6 
  },
  stageTagText: { color: '#f5d547', fontSize: 9, fontWeight: '900' },
  buildCardContent: { padding: 10 },
  buildCardTitle: { color: '#fff', fontWeight: '900', fontSize: 13, marginBottom: 2 },
  buildCardDesc: { color: '#777', fontSize: 11, marginBottom: 8 },
  buildCardUser: { flexDirection: 'row', alignItems: 'center' },
  buildCardUserText: { color: '#999', fontSize: 10 },

  // User Row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#202020',
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#222',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  userName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  userSubName: { color: '#aaa', fontSize: 11, marginTop: 1 },
  userBio: { color: '#777', fontSize: 11, marginTop: 2 },

  // Generic List Row (Market, Group, Shop, Dyno)
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    gap: 12,
  },
  itemThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#222',
  },
  itemTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  itemSubtitle: { color: '#888', fontSize: 11, marginTop: 2 },
  itemPrice: { color: '#f5d547', fontSize: 13, fontWeight: '900', marginTop: 2 },
  itemBio: { color: '#777', fontSize: 11, marginTop: 2 },
  itemHighlight: { color: '#f5d547', fontSize: 11, fontWeight: '600', marginTop: 2 },

  dynoBadge: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#1c1800',
    borderWidth: 1,
    borderColor: '#f5d547',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dynoBadgeText: { color: '#f5d547', fontSize: 16, fontWeight: '900' },
  dynoBadgeSub: { color: '#f5d547', fontSize: 9, fontWeight: 'bold' },

  // Empty state
  emptyState: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptyDesc: {
    color: '#777',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  clearFilterBtn: {
    marginTop: 16,
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  clearFilterBtnText: {
    color: '#f5d547',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

