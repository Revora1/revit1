import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';

export default function InboxScreen({ navigation }: any) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const chatPromises = snap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const otherUserId = data.participants.find((id: string) => id !== auth.currentUser?.uid);
        
        let otherUser = { username: 'Unknown User', profilePic: null };
        if (otherUserId) {
           try {
             // In a real app we'd fetch the user doc, for now we mock it or fetch if needed
             // To keep it light, we just return the ID if we can't fetch
             otherUser.username = "User_" + otherUserId.substring(0, 5);
           } catch (e) {}
        }
        
        return {
          id: docSnap.id,
          ...data,
          otherUser,
          otherUserId
        };
      });
      
      const resolvedChats = await Promise.all(chatPromises);
      setChats(resolvedChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Inbox</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
      ) : chats.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color="#333" />
          <Text style={styles.emptyStateText}>No messages yet.</Text>
          <Text style={styles.emptyStateSub}>When you message someone, it will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
               style={styles.chatRow}
               onPress={() => navigation.navigate('Chat', { otherUser: { id: item.otherUserId, username: item.otherUser?.username } })}
            >
              <View style={styles.avatar}>
                 <Ionicons name="person" size={24} color="#666" />
              </View>
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{item.otherUser?.username}</Text>
                <Text style={styles.chatMessage} numberOfLines={1}>
                  {item.lastMessage || 'Tap to chat'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#333" />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyStateText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptyStateSub: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 8 },
  chatRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#111' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  chatInfo: { flex: 1 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  chatMessage: { color: '#888', fontSize: 14 },
});
