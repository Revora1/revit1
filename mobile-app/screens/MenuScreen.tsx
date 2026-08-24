import React from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function MenuScreen({ navigation }: any) {
  const menuItems = [
    { icon: 'build', title: 'Service Board', route: 'ServiceBoard', desc: 'Find mechanics & shops', featured: true },
    { icon: 'people-outline', title: 'Groups / Clubs', route: 'Groups', desc: 'Join car clubs' },
    { icon: 'cart-outline', title: 'Marketplace', route: 'Marketplace', desc: 'Buy & sell parts' },
    { icon: 'play-outline', title: 'Videos', route: 'Videos', desc: 'Watch community videos' },
    { icon: 'speedometer-outline', title: 'Dyno Board', route: 'DynoBoard', desc: 'Compare horsepower' },
    { icon: 'car-sport-outline', title: 'Battles', route: 'Battles', desc: 'Car of the Month' },
    { icon: 'trophy-outline', title: 'Top Tuners', route: 'TopTuners', desc: 'Leaderboards' },
    { icon: 'gift-outline', title: 'Giveaways', route: 'Giveaways', desc: 'Win exclusive prizes' },
    { icon: 'notifications-outline', title: 'Notifications', route: 'Notifications', desc: 'View your alerts' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EXPLORE DIRECTORY</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.gridItem, item.featured && { borderColor: '#f5d547', borderWidth: 1, backgroundColor: '#111' }]} 
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon as any} size={28} color={item.featured ? "#f5d547" : "#fff"} />
              <Text style={[styles.itemTitle, item.featured && { color: '#f5d547' }]}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1a1a1a', 
    backgroundColor: '#000' 
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  content: { flex: 1, padding: 16, paddingTop: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 40
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'flex-start'
  },
  itemTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
  itemDesc: { color: '#888', fontSize: 12, lineHeight: 16 }
});
