import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

export default function InboxScreen({ navigation }: any) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const currentUid = auth.currentUser.uid;
    const q = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', currentUid)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      try {
        const chatPromises = snap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const list = data.participantIds || data.participants || [];
          const otherUserId = list.find((id: string) => id !== currentUid) || '';
          
          let otherUser: { username: string; profilePic: string | null } = {
            username: otherUserId ? `User_${otherUserId.substring(0, 5)}` : 'Direct Message',
            profilePic: null
          };

          if (otherUserId) {
            try {
              const uSnap = await getDoc(doc(db, 'users', otherUserId));
              if (uSnap.exists()) {
                const uData = uSnap.data();
                if (uData.username) otherUser.username = uData.username;
                if (uData.profilePic) otherUser.profilePic = uData.profilePic;
              }
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
        resolvedChats.sort((a, b) => {
          const aTime = a.updatedAt || a.lastMessageAt || 0;
          const bTime = b.updatedAt || b.lastMessageAt || 0;
          return bTime - aTime;
        });

        setChats(resolvedChats);
      } catch (err) {
        console.error('Error in inbox:', err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Error listening to inbox chats:', error);
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
               onPress={() => navigation.navigate('Chat', {
                 chatId: item.id,
                 otherUser: {
                   id: item.otherUserId,
                   uid: item.otherUserId,
                   username: item.otherUser?.username,
                   profilePic: item.otherUser?.profilePic
                 }
               })}
            >
              <View style={styles.avatar}>
                {item.otherUser?.profilePic ? (
                  <Image source={{ uri: item.otherUser.profilePic }} style={{ width: 50, height: 50, borderRadius: 25 }} />
                ) : (
                  <Ionicons name="person" size={24} color="#666" />
                )}
              </View>
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{item.otherUser?.username}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {item.lastSenderId === auth.currentUser?.uid && (
                    item.lastMessageRead ? (
                      <Ionicons name="checkmark-done" size={14} color="#0284c7" />
                    ) : (
                      <Ionicons name="checkmark" size={13} color="#71717a" />
                    )
                  )}
                  <Text style={[styles.chatMessage, { flex: 1 }]} numberOfLines={1}>
                    {item.lastSenderId === auth.currentUser?.uid ? 'You: ' : ''}{item.lastMessage || 'Tap to chat'}
                  </Text>
                </View>
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
