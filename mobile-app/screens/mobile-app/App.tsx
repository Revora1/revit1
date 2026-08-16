import React, { useState, useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { registerForPushNotificationsAsync } from './lib/notifications';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

// Screens
import LoginScreen from './screens/AuthScreen';
import FeedScreen from './screens/FeedScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import UploadScreen from './screens/UploadScreen';
import ActivitiesScreen from './screens/ActivitiesScreen';
import ProfileScreen from './screens/ProfileScreen';
import GroupsScreen from './screens/GroupsScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
import AdminScreen from './screens/AdminScreen';
import GiveawaysScreen from './screens/GiveawaysScreen';
import VideosScreen from './screens/VideosScreen';
import ChatScreen from './screens/ChatScreen';
import BuildTimelineScreen from './screens/BuildTimelineScreen';
import StoryViewerScreen from './screens/StoryViewerScreen';
import InboxScreen from './screens/InboxScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import GarageScreen from './screens/GarageScreen';
import DynoBoardScreen from './screens/DynoBoardScreen';
import BattlesScreen from './screens/BattlesScreen';
import TopTunersScreen from './screens/TopTunersScreen';
import CookieConsentModal from './components/CookieConsentModal';
import MechanicBoardScreen from './screens/MechanicBoardScreen';
import CookieConsentModal from './components/CookieConsentModal';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        tabBarIcon: ({ focused, color, size }: any) => {
          if (route.name === 'Home') {
            return <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />;
          } else if (route.name === 'Search') {
            return <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />;
          } else if (route.name === 'Post') {
            return <Feather name="plus-square" size={size} color={color} />;
          } else if (route.name === 'Activities') {
            return <Ionicons name={focused ? 'file-tray' : 'file-tray-outline'} size={size} color={color} />;
          } else if (route.name === 'Profile') {
            return <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />;
          }
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#111',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={FeedScreen} />
      <Tab.Screen name="Search" component={DiscoverScreen} />
      <Tab.Screen name="Post" component={UploadScreen} />
      <Tab.Screen name="Activities" component={ActivitiesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
          </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        // tracking requested in CookieConsentModal
      } catch (e) {
        console.warn('Tracking permission request failed', e);
      }
    };
    initApp();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        await registerForPushNotificationsAsync();
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer theme={DarkTheme}>
        <Stack.Navigator screenOptions={{ 
          headerStyle: { backgroundColor: '#111' }, 
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },        
        }}>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Groups" component={GroupsScreen} options={{ title: 'Car Clubs' }} />
          <Stack.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: 'Marketplace' }} />
          <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin Panel' }} />
          <Stack.Screen name="Giveaways" component={GiveawaysScreen} options={{ title: 'Giveaways' }} />
          <Stack.Screen name="Videos" component={VideosScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Inbox" component={InboxScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={({ route }: any) => ({ title: route.params?.otherUser?.username || 'Chat' })} />
          <Stack.Screen name="UserProfile" component={ProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ headerShown: false, presentation: "fullScreenModal" }} />
          <Stack.Screen name="BuildTimeline" component={BuildTimelineScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MyGarage" component={GarageScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DynoBoard" component={DynoBoardScreen} options={{ title: 'Dyno Board' }} />
          <Stack.Screen name="Battles" component={BattlesScreen} options={{ title: 'Battles' }} />
          <Stack.Screen name="TopTuners" component={TopTunersScreen} options={{ title: 'Top Tuners' }} />
          <Stack.Screen name="ServiceBoard" component={MechanicBoardScreen} options={{ title: 'Service Board' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <CookieConsentModal userId={user?.uid} />
      <CookieConsentModal userId={user?.uid} />
    </>
  );
}
