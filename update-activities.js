const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Platform, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, doc, orderBy, limit, onSnapshot, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export default function ActivitiesScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('ALERTS');
  const tabs = ['ALERTS', 'CHATS', 'GARAGE', 'RANKS'];
  
  const alerts = [
    { id: 1, user: '@apple-reviewer2269', action: 'liked your post.', date: '12/08/2026 03:40', avatarLetter: 'A', icon: 'heart', iconColor: '#ff3b30' },
    { id: 2, user: '@someone', action: 'sent you a message.', date: '05/08/2026 22:52', avatarLetter: '?', icon: 'chatbubble', iconColor: '#fff' },
    { id: 3, user: '@someone', action: 'started following you.', date: '05/08/2026 22:52', avatarLetter: '?', icon: 'person-add', iconColor: '#34c759' },
    { id: 4, user: '@lee', action: 'started following you.', date: '02/08/2026 14:48', avatarImage: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=200', icon: 'person-add', iconColor: '#34c759' },
    { id: 5, user: '@rhysdavies19', action: 'started following you.', date: '02/08/2026 13:05', avatarImage: 'https://images.unsplash.com/photo-1611821064430-0d40221e4e03?auto=format&fit=crop&q=80&w=200', icon: 'person-add', iconColor: '#34c759' },
  ];

  // Data states
  const [chats, setChats] = useState<any[]>([]);
  const [garageCars, setGarageCars] = useState<any[]>([]);
  const [ranks, setRanks] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingGarage, setLoadingGarage] = useState(false);
  const [loadingRanks, setLoadingRanks] = useState(false);

  // Fetch Chats
  useEffect(() => {
    if (activeTab === 'CHATS') {
      if (!auth.currentUser) return;
      setLoadingChats(true);
      const q = query(collection(db, 'chats'), where('participantIds', 'array-contains', auth.currentUser.uid));
      const unsubscribe = onSnapshot(q, async (snap) => {
        try {
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Get other user profiles
            const chatList = await Promise.all(fetched.map(async (chat: any) => {
                const otherId = chat.participantIds.find((id: string) => id !== auth.currentUser?.uid);
                let otherUser = { username: 'Unknown' };
                if (otherId) {
                    const uDoc = await getDoc(doc(db, 'users', otherId));
                    if (uDoc.exists()) {
                        otherUser = uDoc.data() as any;
                    }
                }
                return { ...chat, otherUser };
            }));
            setChats(chatList.sort((a, b) => (b.lastMessageAt?.toMillis() || 0) - (a.lastMessageAt?.toMillis() || 0)));
        } catch(e) {
            console.error(e);
        } finally {
            setLoadingChats(false);
        }
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

  // Fetch Garage
  useEffect(() => {
    if (activeTab === 'GARAGE') {
      setLoadingGarage(true);
      const fetchG = async () => {
        try {
            const q = query(collection(db, 'garage'), orderBy('createdAt', 'desc'), limit(50));
            const snap = await getDocs(q);
            setGarageCars(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch(e) { console.error(e); } finally { setLoadingGarage(false); }
      };
      fetchG();
    }
  }, [activeTab]);

  // Fetch Ranks
  useEffect(() => {
    if (activeTab === 'RANKS') {
      setLoadingRanks(true);
      const fetchR = async () => {
        try {
            const d = new Date();
            const currentMonthId = \`\${d.getFullYear()}_\${d.getMonth() + 1}\`;
            const q = query(collection(db, 'battles', currentMonthId, 'entries'), orderBy('votes', 'desc'), limit(20));
            const snap = await getDocs(q);
            setRanks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch(e) { console.error(e); } finally { setLoadingRanks(false); }
      };
      fetchR();
    }
  }, [activeTab]);


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.segmentControl}>
          {tabs.map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.segmentTab, activeTab === tab && styles.segmentTabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        
        {/* ALERTS TAB */}
        {activeTab === 'ALERTS' && alerts.map(alert => (
          <View key={alert.id} style={styles.alertRow}>
            <View style={styles.avatarContainer}>
              {alert.avatarImage ? (
                <Image source={{ uri: alert.avatarImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>{alert.avatarLetter}</Text>
                </View>
              )}
              <View style={styles.badgeContainer}>
                <Ionicons name={alert.icon as any} size={10} color={alert.iconColor} />
              </View>
            </View>
            <View style={styles.alertInfo}>
              <Text style={styles.alertAction}>
                <Text style={styles.alertUser}>{alert.user}</Text> {alert.action}
              </Text>
              <Text style={styles.alertDate}>{alert.date}</Text>
            </View>
          </View>
        ))}

        {/* CHATS TAB */}
        {activeTab === 'CHATS' && (
          <View>
            {loadingChats ? <ActivityIndicator size="large" color="#fff" style={{marginTop: 40}} /> : chats.map(chat => (
              <TouchableOpacity key={chat.id} style={styles.chatRow}>
                <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={24} color="#888" />
                </View>
                <View style={styles.alertInfo}>
                    <Text style={styles.alertUser}>@{chat.otherUser?.username || 'user'}</Text>
                    <Text style={styles.chatLastMessage} numberOfLines={1}>{chat.lastMessage || 'No messages yet'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#444" />
              </TouchableOpacity>
            ))}
            {!loadingChats && chats.length === 0 && (
                <Text style={styles.emptyText}>No chats found.</Text>
            )}
          </View>
        )}

        {/* GARAGE TAB */}
        {activeTab === 'GARAGE' && (
          <View>
            {loadingGarage ? <ActivityIndicator size="large" color="#fff" style={{marginTop: 40}} /> : garageCars.map(car => (
              <View key={car.id} style={styles.garageCard}>
                {car.coverImage ? (
                    <Image source={{ uri: car.coverImage }} style={styles.garageCardImage} />
                ) : (
                    <View style={styles.garageCardNoImage}>
                        <Ionicons name="car" size={40} color="#444" />
                    </View>
                )}
                <View style={styles.garageCardInfo}>
                    <Text style={styles.garageCardTitle}>{car.year} {car.make} {car.model}</Text>
                    <Text style={styles.garageCardSubtitle}>Owner: @{car.ownerUsername || 'Unknown'}</Text>
                    <View style={styles.badgeRow}>
                        <Text style={styles.powerBadge}>{car.power || '?'} HP</Text>
                    </View>
                </View>
              </View>
            ))}
            {!loadingGarage && garageCars.length === 0 && (
                <Text style={styles.emptyText}>Community garage is empty.</Text>
            )}
          </View>
        )}

        {/* RANKS TAB */}
        {activeTab === 'RANKS' && (
          <View>
            {loadingRanks ? <ActivityIndicator size="large" color="#fff" style={{marginTop: 40}} /> : ranks.map((entry, index) => (
              <View key={entry.id} style={styles.rankCard}>
                <Text style={styles.rankNumber}>#{index + 1}</Text>
                {entry.carCoverImage ? (
                    <Image source={{ uri: entry.carCoverImage }} style={styles.rankImage} />
                ) : (
                    <View style={styles.rankNoImage}>
                        <Ionicons name="car" size={30} color="#444" />
                    </View>
                )}
                <View style={styles.alertInfo}>
                    <Text style={styles.rankTitle}>{entry.carMake} {entry.carModel}</Text>
                    <Text style={styles.rankOwner}>@{entry.ownerUsername}</Text>
                </View>
                <View style={styles.rankVotes}>
                    <Ionicons name="flame" size={16} color="#e53935" />
                    <Text style={styles.rankVotesText}>{entry.votes || 0}</Text>
                </View>
              </View>
            ))}
            {!loadingRanks && ranks.length === 0 && (
                <Text style={styles.emptyText}>No battles currently active.</Text>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  header: { 
    paddingVertical: 12,
    paddingHorizontal: 16, 
    backgroundColor: '#000', 
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    padding: 4,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentTabActive: {
    backgroundColor: '#2c2c2e',
  },
  segmentText: {
    color: '#8e8e93',
    fontSize: 10,
    fontWeight: 'bold',
  },
  segmentTextActive: {
    color: '#fff',
  },
  content: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  alertRow: { 
    flexDirection: 'row', 
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1, 
    borderBottomColor: '#111', 
    alignItems: 'center' 
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#333' 
  },
  avatarPlaceholder: {
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  avatarLetter: {
    color: '#888',
    fontSize: 20,
    fontWeight: 'bold',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#000',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  alertInfo: { flex: 1 },
  alertUser: { color: '#fff', fontWeight: 'bold' },
  alertAction: { color: '#ccc', fontSize: 15, lineHeight: 20, marginBottom: 4 },
  alertDate: { color: '#666', fontSize: 12 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 14 },
  
  // Chats
  chatRow: {
    flexDirection: 'row', 
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1, 
    borderBottomColor: '#111', 
    alignItems: 'center',
    gap: 16
  },
  chatLastMessage: { color: '#aaa', fontSize: 14, marginTop: 4 },

  // Garage
  garageCard: {
    flexDirection: "row",
    backgroundColor: "#111",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#222",
    height: 100,
    marginHorizontal: 16,
    marginTop: 16
  },
  garageCardImage: { width: 120, height: "100%", resizeMode: "cover" },
  garageCardNoImage: {
    width: 120,
    height: "100%",
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  garageCardInfo: { flex: 1, padding: 12, justifyContent: "center" },
  garageCardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  garageCardSubtitle: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginBottom: 8
  },
  badgeRow: { flexDirection: 'row' },
  powerBadge: { backgroundColor: '#2a2a2a', color: '#ccc', fontSize: 10, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, textTransform: 'uppercase' },

  // Ranks
  rankCard: {
    flexDirection: "row",
    backgroundColor: "#111",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#222",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
    gap: 12
  },
  rankNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    width: 30
  },
  rankImage: { width: 60, height: 60, borderRadius: 8, resizeMode: "cover" },
  rankNoImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  rankTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2
  },
  rankOwner: {
    color: "#aaa",
    fontSize: 12,
  },
  rankVotes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1111',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4
  },
  rankVotesText: { color: '#e53935', fontWeight: 'bold' }
});
`
fs.writeFileSync('mobile-app/screens/ActivitiesScreen.tsx', code);
