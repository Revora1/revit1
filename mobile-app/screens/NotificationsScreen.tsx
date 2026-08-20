import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator , RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function NotificationsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Ionicons name="heart" size={24} color="#e53935" />;
      case 'comment': return <Ionicons name="chatbubble" size={24} color="#3498db" />;
      case 'follow': return <Ionicons name="person-add" size={24} color="#2ecc71" />;
      default: return <Ionicons name="notifications" size={24} color="#f1c40f" />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Notifications</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={64} color="#333" />
          <Text style={styles.emptyStateText}>No notifications</Text>
        </View>
      ) : (
        <FlatList refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" colors={["#e53935"]} />}
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.notifRow} onPress={() => {
               if (item.type === 'follow') {
                  navigation.navigate('UserProfile', { userId: item.senderId });
               } else if (item.postId) {
                  // Could navigate to single post view here
               }
            }}>
              <View style={styles.iconContainer}>
                 {getIcon(item.type)}
              </View>
              <View style={styles.notifInfo}>
                <Text style={styles.notifText}>
                  <Text style={{ fontWeight: 'bold' }}>{item.senderUsername || 'Someone'}</Text> {item.body || item.text || 'interacted with you'}
                </Text>
                <Text style={styles.timeText}>
                  {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}
                </Text>
              </View>
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
  emptyStateText: { color: '#666', fontSize: 16, marginTop: 16 },
  notifRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#111' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  notifInfo: { flex: 1 },
  notifText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  timeText: { color: '#666', fontSize: 12, marginTop: 4 },
});
