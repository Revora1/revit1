import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }: any) {
  const { item } = route.params;
  const isOwner = item.sellerId === auth.currentUser?.uid;

  const handleDelete = async () => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to delete this listing?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            try {
               await deleteDoc(doc(db, "marketplace", item.id));
               Alert.alert("Success", "Listing deleted.");
               navigation.goBack();
            } catch (e) {
               console.error(e);
               Alert.alert("Error", "Could not delete item.");
            }
        }}
      ]
    );
  };

  const handleFavorite = async () => {
    if (item.sellerId) {
      try {
        const sellerDoc = await getDoc(doc(db, 'users', item.sellerId));
        const pushToken = sellerDoc.data()?.pushToken;
        if (pushToken) {
          const { sendPushNotification } = await import('../lib/notifications');
          sendPushNotification(pushToken, 'New Favorite', `Someone favorited your listing for ${item.title}`);
        }
        Alert.alert('Favorited!', 'The seller has been notified.');
      } catch (err) {}
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {item.images && Array.isArray(item.images) && item.images.length > 0 ? (
          <View>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {item.images.map((imgUri: string, idx: number) => (
                <Image key={idx} source={{ uri: imgUri }} style={{ width, height: 300, resizeMode: 'cover' }} />
              ))}
            </ScrollView>
            {item.images.length > 1 && (
              <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{item.images.length} Photos</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImage}><Ionicons name="cart-outline" size={60} color="#666" /></View>
        )}
        <View style={styles.info}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <View style={{flex: 1, paddingRight: 16}}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.price}>{item.currency || '$'}{item.price}</Text>
            </View>
            {isOwner && (
              <TouchableOpacity onPress={handleDelete} style={{backgroundColor: '#e53935', padding: 10, borderRadius: 12}}>
                <Ionicons name="trash-outline" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{item.description || 'No description provided.'}</Text>
          </View>
        </View>
      </ScrollView>

      {!isOwner && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.favBtn} onPress={handleFavorite}>
            <Ionicons name="heart-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
             style={styles.messageBtn} 
             onPress={() => {
                const myId = auth.currentUser?.uid || '';
                const sellerId = item.sellerId || '';
                const chatId = myId < sellerId ? `${myId}_${sellerId}` : `${sellerId}_${myId}`;
                navigation.navigate('Chat', { chatId, otherUser: { id: sellerId, username: 'Seller' } });
             }}
          >
            <Ionicons name="chatbubbles" size={20} color="#fff" />
            <Text style={styles.messageBtnText}>Message Seller</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  noImage: { width: '100%', height: 250, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  info: { padding: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  price: { color: '#4caf50', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  section: { marginTop: 10 },
  sectionTitle: { color: '#aaa', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
  description: { color: '#fff', fontSize: 16, lineHeight: 24 },
  bottomBar: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#222', backgroundColor: '#111', gap: 12 },
  favBtn: { backgroundColor: '#333', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: 64 },
  messageBtn: { flex: 1, backgroundColor: '#e53935', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  messageBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
