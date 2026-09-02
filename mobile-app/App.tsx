import React, { useState, useEffect, Component, ReactNode } from 'react';
import { TouchableOpacity, Platform, View, Text } from 'react-native';
import { NavigationContainer, DarkTheme, getStateFromPath } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { registerForPushNotificationsAsync } from './lib/notifications';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

const linking: any = {
  prefixes: [
    'revitup://',
    'https://revitup.today',
    'http://revitup.today',
  ],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'feed',
          Search: 'search',
          Post: 'create',
          Activities: 'activities',
          Profile: 'me',
        },
      },
      UserProfile: 'user/:username',
      BuildTimeline: 'car/:carId',
      Giveaways: 'giveaways',
      Videos: 'videos',
      Marketplace: 'marketplace',
      Groups: 'groups',
      Battles: 'battles',
      DynoBoard: 'dyno',
      TopTuners: 'toptuners',
      ServiceBoard: 'mechanics',
      Inbox: 'inbox',
      Notifications: 'notifications',
    },
  },
  getStateFromPath: (path: string, options: any) => {
    try {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const url = new URL(`https://revitup.today${normalizedPath}`);
      const searchParams = url.searchParams;

      const username = searchParams.get('ref') || searchParams.get('u') || searchParams.get('username');
      const carId = searchParams.get('car') || searchParams.get('carId') || searchParams.get('c');
      const postId = searchParams.get('p') || searchParams.get('postId');
      const giveaways = searchParams.get('giveaways');

      if (username) {
        return {
          routes: [
            {
              name: 'UserProfile',
              params: { username, userId: username },
            },
          ],
        };
      }
      if (carId) {
        return {
          routes: [
            {
              name: 'BuildTimeline',
              params: { carId },
            },
          ],
        };
      }
      if (postId) {
        return {
          routes: [
            {
              name: 'MainTabs',
              state: {
                routes: [
                  {
                    name: 'Home',
                    params: { targetPostId: postId },
                  },
                ],
              },
            },
          ],
        };
      }
      if (giveaways) {
        return {
          routes: [
            {
              name: 'Giveaways',
            },
          ],
        };
      }
    } catch (e) {
      // fallback
    }
    return getStateFromPath(path, options);
  },
};

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.log('App ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="warning-outline" size={48} color="#f5d547" style={{ marginBottom: 16 }} />
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>Something went wrong</Text>
          <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
            An unexpected error occurred. Please restart the app.
          </Text>
          <TouchableOpacity 
            onPress={() => this.setState({ hasError: false })}
            style={{ backgroundColor: '#f5d547', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 14 }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// Screens
import LoginScreen from './screens/LoginScreen';
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
import MenuScreen from './screens/MenuScreen';
import GroupChatScreen from './screens/GroupChatScreen';
import GroupFeedScreen from './screens/GroupFeedScreen';

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
      <ErrorBoundary>
        <StatusBar style="light" />
        <LoginScreen />
        <CookieConsentModal />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <NavigationContainer theme={DarkTheme} linking={linking}>
        <Stack.Navigator screenOptions={{ 
          headerStyle: { backgroundColor: '#111' }, 
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },        
        }}>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Groups" component={GroupsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Marketplace" component={MarketplaceScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Admin" component={AdminScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Giveaways" component={GiveawaysScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Videos" component={VideosScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Inbox" component={InboxScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={({ route }: any) => ({ title: route.params?.otherUser?.username || 'Chat' })} />
          <Stack.Screen name="UserProfile" component={ProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ headerShown: false, presentation: "fullScreenModal" }} />
          <Stack.Screen name="BuildTimeline" component={BuildTimelineScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MyGarage" component={GarageScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DynoBoard" component={DynoBoardScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Battles" component={BattlesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TopTuners" component={TopTunersScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ServiceBoard" component={MechanicBoardScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Menu" component={MenuScreen} options={{ headerShown: false }} />
          <Stack.Screen name="GroupChat" component={GroupChatScreen} options={({ route }: any) => ({ title: (route.params?.groupName || 'Group') + ' Chat' })} />
          <Stack.Screen name="GroupFeed" component={GroupFeedScreen} options={({ route, navigation }: any) => ({ 
            title: route.params?.groupName || 'Club Feed',
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate('GroupChat', route.params)} style={{ marginRight: 16 }}>
                <Ionicons name="chatbubbles" size={24} color="#fff" />
              </TouchableOpacity>
            )
          })} />
        </Stack.Navigator>
      </NavigationContainer>
      <CookieConsentModal userId={user?.uid} />
    </ErrorBoundary>
  );
}
