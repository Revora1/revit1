import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

export default function MenuScreen({ navigation }: any) {
  const handleLogout = () => {
    signOut(auth);
  };

  const menuItems = [
    { icon: 'cart-outline', title: 'Marketplace', route: 'Marketplace', desc: 'Buy & sell parts' },
    { icon: 'people-outline', title: 'Groups', route: 'Groups', desc: 'Join car clubs' },
    { icon: 'speedometer-outline', title: 'Dyno Board', route: 'DynoBoard', desc: 'Compare horsepower' },
    { icon: 'trophy-outline', title: 'Top Tuners', route: 'TopTuners', desc: 'Leaderboards' },
    { icon: 'car-sport-outline', title: 'Battles', route: 'Battles', desc: 'Car of the Month' },
    { icon: 'gift-outline', title: 'Giveaways', route: 'Giveaways', desc: 'Win free gear' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Explore</Text>
      </View>
      <ScrollView style={styles.content}>
        
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.gridItem} onPress={() => navigation.navigate(item.route)}>
              <Ionicons name={item.icon as any} size={32} color="#fff" />
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  header: { 
    paddingVertical: 16,
    paddingHorizontal: 20, 
    backgroundColor: '#111', 
    borderBottomWidth: 1, 
    borderBottomColor: '#333' 
  },
  headerText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'flex-start'
  },
  itemTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 4 },
  itemDesc: { color: '#888', fontSize: 12, lineHeight: 16 },
  logoutBtn: {
    backgroundColor: '#222',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#333'
  },
  logoutBtnText: { color: '#e53935', fontSize: 16, fontWeight: 'bold' }
});
