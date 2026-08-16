import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MenuScreen({ navigation }: any) {
  const menuItems = [
    { icon: 'people-outline', title: 'Groups / Clubs', route: 'Groups', desc: 'Join car clubs' },
    { icon: 'cart-outline', title: 'Marketplace', route: 'Marketplace', desc: 'Buy & sell parts' },
    { icon: 'play-outline', title: 'Videos', route: 'Videos', desc: 'Watch community videos' },
    { icon: 'build-outline', title: 'Service Board', route: 'ServiceBoard', desc: 'Find mechanics & shops' },
    { icon: 'speedometer-outline', title: 'Dyno Board', route: 'DynoBoard', desc: 'Compare horsepower' },
    { icon: 'car-sport-outline', title: 'Battles', route: 'Battles', desc: 'Car of the Month' },
    { icon: 'trophy-outline', title: 'Top Tuners', route: 'TopTuners', desc: 'Leaderboards' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, padding: 16, paddingTop: 24 },
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
  itemDesc: { color: '#888', fontSize: 12, lineHeight: 16 }
});
