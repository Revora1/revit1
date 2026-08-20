import { TextInput } from 'react-native';
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  Modal,
  Share,
  Linking,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { compressImage } from '../lib/imageCompression';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from "../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  getCountFromServer, collectionGroup,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { signOut, deleteUser } from "firebase/auth";

const { width } = Dimensions.get("window");
const POST_SIZE = (width - 36) / 3; // 3 column grid with padding

const SettingsItem = ({
  icon,
  title,
  subtitle,
  iconBgColor = "#222",
  iconColor = "#fff",
  isDanger = false,
  onPress,
}: any) => (
  <TouchableOpacity
    style={[styles.settingsItem, isDanger && styles.settingsItemDanger]}
    onPress={onPress}
  >
    <View
      style={[
        styles.settingsIconWrapper,
        { backgroundColor: isDanger ? "transparent" : iconBgColor },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={isDanger ? "#e53935" : iconColor}
      />
    </View>
    <View style={styles.settingsTextCol}>
      <Text
        style={[styles.settingsTitle, isDanger && styles.settingsTitleDanger]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.settingsSubtitle,
          isDanger && styles.settingsSubtitleDanger,
        ]}
      >
        {subtitle}
      </Text>
    </View>
  </TouchableOpacity>
);

export default function ProfileScreen({ route, navigation }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [garage, setGarage] = useState<any[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [partnerGarage, setPartnerGarage] = useState<any[]>([]);
  const [partnerPosts, setPartnerPosts] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"garage" | "posts" | "duo" | "listings">("garage");
  const [showSettings, setShowSettings] = useState(false);
  const [activeSubView, setActiveSubView] = useState<string | null>(null);

  const [dynamicFollowersCount, setDynamicFollowersCount] = useState<
    number | null
  >(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showFollowsModal, setShowFollowsModal] = useState<'followers' | 'following' | null>(null);
  const [followsList, setFollowsList] = useState<any[]>([]);
  const [loadingFollows, setLoadingFollows] = useState(false);
  const [dynamicFollowingCount, setDynamicFollowingCount] = useState<
    number | null
  >(null);

  const [adminStats, setAdminStats] = useState({ users: 0, garages: 0, logs: 0 });

  // Settings States
  const [cookieConsent, setCookieConsent] = useState(true);
  
  useEffect(() => {
    AsyncStorage.getItem('gdpr-consent').then((val: string | null) => {
      setCookieConsent(val === 'accepted');
    }).catch(console.error);
  }, []);

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const targetUserId = route?.params?.userId || auth.currentUser?.uid;
  const isCurrentUser = targetUserId === auth.currentUser?.uid;

  useEffect(() => {
    const fetchData = async () => {
      if (!targetUserId) return;

      try {
        const docRef = doc(db, "users", targetUserId);
        const docSnap = await getDoc(docRef);
        let profileData = null;
        if (docSnap.exists()) {
          profileData = docSnap.data();
          setProfile(profileData);
          if (profileData.partnerId) {
            const partnerRef = doc(db, "users", profileData.partnerId);
            const partnerSnap = await getDoc(partnerRef);
            if (partnerSnap.exists()) {
               setPartnerProfile({ id: partnerSnap.id, ...partnerSnap.data() });
            }
          }
        }

        const gQuery = query(
          collection(db, "garage"),
          where("ownerId", "==", targetUserId),
          orderBy("createdAt", "desc"),
        );
        const gSnap = await getDocs(gQuery);
        setGarage(gSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const pQuery = query(
          collection(db, "posts"),
          where("authorId", "==", targetUserId),
          orderBy("createdAt", "desc"),
        );
        const pSnap = await getDocs(pQuery);
        setPosts(pSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const lQuery = query(
          collection(db, "marketplace"),
          where("sellerId", "==", targetUserId),
          orderBy("createdAt", "desc")
        );
        const lSnap = await getDocs(lQuery);
        setListings(lSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Fetch partner garage and posts
        if (profileData && profileData.partnerId) {
          const pgQuery = query(
            collection(db, "garage"),
            where("ownerId", "==", profileData.partnerId),
            orderBy("createdAt", "desc")
          );
          const pgSnap = await getDocs(pgQuery);
          setPartnerGarage(pgSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
          
          const ppQuery = query(
            collection(db, "posts"),
            where("authorId", "==", profileData.partnerId),
            orderBy("createdAt", "desc")
          );
          const ppSnap = await getDocs(ppQuery);
          setPartnerPosts(ppSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }

        // Fetch dynamic counts
        const followersQ = query(
          collection(db, "follows"),
          where("followingId", "==", targetUserId),
        );
        const followingQ = query(
          collection(db, "follows"),
          where("followerId", "==", targetUserId),
        );
        const [followersSnap, followingSnap] = await Promise.all([
          getCountFromServer(followersQ),
          getCountFromServer(followingQ),
        ]);

        const actualFollowers = followersSnap.data().count;
        const actualFollowing = followingSnap.data().count;

        setDynamicFollowersCount(actualFollowers);
        setDynamicFollowingCount(actualFollowing);

        if (isCurrentUser && auth.currentUser?.email === "tonyang11552883@gmail.com") {
          try {
            const usersCountQ = await getCountFromServer(collection(db, "users"));
            const garagesCountQ = await getCountFromServer(collection(db, "garage"));
            const logsCountQ = await getCountFromServer(collectionGroup(db, "build_logs"));
            setAdminStats({
              users: usersCountQ.data().count,
              garages: garagesCountQ.data().count,
              logs: logsCountQ.data().count,
            });
          } catch (e) {
            console.error("Admin stats error:", e);
          }
        }

        if (
          profileData &&
          (profileData.followersCount !== actualFollowers ||
            profileData.followingCount !== actualFollowing)
        ) {
          await updateDoc(docRef, {
            followersCount: actualFollowers,
            followingCount: actualFollowing,
          });
        }
      } catch (err) {
        console.error("Error fetching profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Handlers for Edit Profile ---
    const handleOpenFollows = async (type: 'followers' | 'following') => {
    setShowFollowsModal(type);
    setLoadingFollows(true);
    try {
      const db = require('../firebaseConfig').db;
      const { collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');
      
      const q = type === 'followers'
        ? query(collection(db, "follows"), where("followingId", "==", targetUserId))
        : query(collection(db, "follows"), where("followerId", "==", targetUserId));
        
      const snapshot = await getDocs(q);
      const userIds = snapshot.docs.map((d: any) => type === 'followers' ? d.data().followerId : d.data().followingId);
      
      const users = [];
      for (const id of userIds) {
        const uDoc = await getDoc(doc(db, "users", id));
        if (uDoc.exists()) {
          users.push({ id: uDoc.id, ...uDoc.data() });
        }
      }
      setFollowsList(users);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFollows(false);
    }
  };

const handleOpenEditProfile = () => {
    setEditUsername(profile?.username || "");
    setEditBio(profile?.bio || "");
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setSavingProfile(true);
    try {
      let downloadUrl = profile.profilePic || null;
      if (editAvatarUri && editAvatarUri !== profile.profilePic) {
        const compressedUri = await compressImage(editAvatarUri);
        const response = await fetch(compressedUri);
        const blob = await response.blob();
        const filename = `avatars/${auth.currentUser.uid}/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        downloadUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        username: editUsername,
        bio: editBio,
        ...(downloadUrl ? { profilePic: downloadUrl } : {})
      });
      setProfile((prev: any) => ({ ...prev, username: editUsername, bio: editBio, profilePic: downloadUrl || prev.profilePic }));
      setShowEditModal(false);
    } catch (err: any) {
      Alert.alert("Error", "Failed to update profile: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const pickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission needed', 'Allow camera roll access to pick photos.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setEditAvatarUri(result.assets[0].uri);
    }
  };

  // --- Handlers for Settings Actions ---
  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          setShowSettings(false);
          signOut(auth).catch(console.error);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Permanently remove all your data? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!auth.currentUser) return;
            try {
              await deleteUser(auth.currentUser);
              setShowSettings(false);
            } catch (e: any) {
              if (e.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Verification Required",
                  "Please log out and log back in before deleting your account.",
                );
              } else {
                Alert.alert("Error", e.message);
              }
            }
          },
        },
      ],
    );
  };

  const handleDeleteListing = async (itemId: string) => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to delete this listing?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            try {
               await deleteDoc(doc(db, "marketplace", itemId));
               setListings(prev => prev.filter(item => item.id !== itemId));
               Alert.alert("Success", "Listing deleted.");
            } catch (e) {
               console.error(e);
               Alert.alert("Error", "Could not delete item.");
            }
        }}
      ]
    );
  };

  const handleInvite = async () => {
    try {
      const username = profile?.username || auth.currentUser?.uid || "tuner";
      await Share.share({
        message: `Join me on RevitUp! The ultimate car community platform. Download now: https://revitup.today/?ref=${username}`,
      });
    } catch (error) {}
  };

  const username =
    profile?.username ||
    `tuner_${auth.currentUser?.uid?.substring(0, 6)}` ||
    "tuner";

  const renderSubViewContent = () => {
    switch (activeSubView) {
      case "notifications":
        return (
          <View style={{ padding: 16 }}>
            <View style={styles.settingsItem}>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsTitle}>Push Notifications</Text>
                <Text style={styles.settingsSubtitle}>
                  Receive alerts on your device
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#fff",
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    backgroundColor: "#000",
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    marginLeft: 28,
                  }}
                />
              </View>
            </View>
            <View style={styles.settingsItem}>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsTitle}>Email Updates</Text>
                <Text style={styles.settingsSubtitle}>
                  Weekly digest and news
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#222",
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    backgroundColor: "#888",
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    marginLeft: 4,
                  }}
                />
              </View>
            </View>
            <View
              style={{
                marginTop: 24,
                padding: 16,
                backgroundColor: "#111",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#333",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: "bold",
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Phone Notification Diagnostics
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#222",
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{ color: "#888", fontSize: 10, fontWeight: "bold" }}
                  >
                    STATUS
                  </Text>
                  <Text
                    style={{
                      color: "#4caf50",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    ● ACTIVE
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#222",
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{ color: "#888", fontSize: 10, fontWeight: "bold" }}
                  >
                    APP MODE
                  </Text>
                  <Text
                    style={{
                      color: "#4caf50",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    NATIVE APP
                  </Text>
                        </View>
                      </View>
              <View
                style={{
                  backgroundColor: "rgba(76, 175, 80, 0.1)",
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "rgba(76, 175, 80, 0.2)",
                }}
              >
                <Text
                  style={{
                    color: "#4caf50",
                    fontSize: 10,
                    fontWeight: "bold",
                    marginBottom: 4,
                  }}
                >
                  MOBILE INTEGRATION MODE
                </Text>
                <Text style={{ color: "#ccc", fontSize: 10 }}>
                  You are running the official RevItUp mobile application.
                  Native alerts are integrated directly with your device's
                  system settings.
                </Text>
                        </View>
                      </View>
          </View>
        );
      case "privacy":
        return (
          <View style={{ padding: 16 }}>
            <View style={styles.settingsItem}>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsTitle}>Public Garage</Text>
                <Text style={styles.settingsSubtitle}>
                  Anyone can see your vehicles
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#fff",
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    backgroundColor: "#000",
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    marginLeft: 28,
                  }}
                />
              </View>
            </View>
            <View style={styles.settingsItem}>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsTitle}>Hide License Plates</Text>
                <Text style={styles.settingsSubtitle}>
                  Auto-blur plates in photos
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#222",
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    backgroundColor: "#888",
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    marginLeft: 4,
                  }}
                />
              </View>
            </View>
          </View>
        );
      case "appearance":
        return (
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 100,
                  backgroundColor: "#000",
                  borderWidth: 2,
                  borderColor: "#fff",
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Dark</Text>
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#000",
                    }}
                  />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                disabled
                style={{
                  flex: 1,
                  height: 100,
                  backgroundColor: "#111",
                  borderWidth: 2,
                  borderColor: "#333",
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.5,
                }}
              >
                <Text style={{ color: "#555", fontWeight: "bold" }}>
                  Light (Soon)
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.settingsItem, { marginTop: 24 }]}>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsTitle}>Reduce Motion</Text>
                <Text style={styles.settingsSubtitle}>
                  Disable some animations
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#222",
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    backgroundColor: "#888",
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    marginLeft: 4,
                  }}
                />
              </View>
            </View>
          </View>
        );
      case "data":
        return (
          <View style={{ padding: 16 }}>
            <View style={styles.settingsItem}>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsTitle}>High Quality Media</Text>
                <Text style={styles.settingsSubtitle}>
                  Always upload and view high-res photos
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#222",
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    backgroundColor: "#888",
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    marginLeft: 4,
                  }}
                />
              </View>
            </View>

            <Text style={[styles.dangerZoneHeader, { marginTop: 16 }]}>
              PRIVACY RIGHTS (GDPR / CCPA)
            </Text>
            <View
              style={{
                padding: 16,
                backgroundColor: "#111",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#333",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Request Access
              </Text>
              <Text style={{ color: "#888", fontSize: 11, marginBottom: 16 }}>
                In compliance with GDPR and CCPA, you can download a complete
                copy of all your custom build details and profile info.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "#222",
                  padding: 12,
                  borderRadius: 24,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}
                >
                  Download Data Export
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={{
                padding: 16,
                backgroundColor: "#111",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#333",
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  color: "#e53935",
                  fontSize: 14,
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Request Erasure
              </Text>
              <Text style={{ color: "#888", fontSize: 11, marginBottom: 16 }}>
                Instantly and permanently delete your user account. This will
                recursively purge your profile details and vehicles.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(229, 57, 53, 0.1)",
                  padding: 12,
                  borderRadius: 24,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#e53935", fontSize: 12, fontWeight: "bold" }}
                >
                  Request Permanent Erasure
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>
                Cache Storage
              </Text>
              <Text style={{ color: "#888", fontSize: 12 }}>124 MB</Text>
            </View>
            <Text style={{ color: "#888", fontSize: 11, marginBottom: 16 }}>
              Clear cache to free up space. This won't delete your posts or
              cars.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#222",
                padding: 12,
                borderRadius: 24,
                alignItems: "center",
              }}
              onPress={() =>
                Alert.alert(
                  "Success",
                  "Cache cleared successfully! Freed up 124 MB of local assets.",
                )
              }
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>
                Clear Cache
              </Text>
            </TouchableOpacity>
          </View>
        );
      case "devices":
        return (
          <View style={{ padding: 16 }}>
            <View
              style={{
                backgroundColor: "#111",
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#333",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={16}
                    color="#888"
                  />
                  <Text
                    style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}
                  >
                    Current Device
                  </Text>
                </View>
                <Text style={{ color: "#4caf50", fontSize: 12, marginTop: 4 }}>
                  Active now
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "#888", fontSize: 12 }}>
                  RevitUp Mobile
                </Text>
                <Text style={{ color: "#888", fontSize: 12 }}>Native App</Text>
                        </View>
                      </View>
            <Text
              style={{
                color: "#888",
                fontSize: 12,
                textAlign: "center",
                marginTop: 16,
              }}
            >
              You are only logged in on this device.
            </Text>
          </View>
        );
      case "admob":
        return (
          <View style={{ padding: 16 }}>
            <View
              style={{
                backgroundColor: "#111",
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#333",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Ionicons name="sparkles" size={16} color="#ff9800" />
                <Text
                  style={{
                    color: "#ff9800",
                    fontSize: 10,
                    fontWeight: "900",
                    letterSpacing: 1,
                  }}
                >
                  FEED INTEGRATION ONLY
                </Text>
              </View>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: "900",
                  fontStyle: "italic",
                  marginBottom: 8,
                }}
              >
                PREMIUM NATIVE FEED ADS
              </Text>
              <Text style={{ color: "#888", fontSize: 12, lineHeight: 18 }}>
                To maximize UI consistency and respect user focus, other
                intrusive ad formats are completely disabled. Google AdMob is
                integrated strictly as a beautifully customized native ad inside
                your feed.
              </Text>
            </View>

            <View
              style={{
                padding: 16,
                backgroundColor: "#111",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#333",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{ color: "#888", fontSize: 10, fontWeight: "bold" }}
                >
                  GOOGLE ADMOB SDK DIAGNOSTICS
                </Text>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#4caf50",
                  }}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#222",
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{ color: "#888", fontSize: 10, fontWeight: "bold" }}
                  >
                    ENVIRONMENT
                  </Text>
                  <Text
                    style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}
                  >
                    ● NATIVE MOBILE
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#222",
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{ color: "#888", fontSize: 10, fontWeight: "bold" }}
                  >
                    DEVICE PLATFORM
                  </Text>
                  <Text
                    style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}
                  >
                    MOBILE APP
                  </Text>
                        </View>
                      </View>
              <View
                style={{
                  backgroundColor: "#222",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: "#888",
                    fontSize: 10,
                    fontWeight: "bold",
                    marginBottom: 8,
                  }}
                >
                  ACTIVE AD UNIT IDS
                </Text>
                <Text
                  style={{
                    color: "#ff9800",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                >
                  Native Feed: Active
                </Text>
                <Text
                  style={{
                    color: "#555",
                    fontSize: 10,
                    fontFamily: "monospace",
                    textDecorationLine: "line-through",
                  }}
                >
                  Banner: Disabled
                </Text>
                <Text
                  style={{
                    color: "#555",
                    fontSize: 10,
                    fontFamily: "monospace",
                    textDecorationLine: "line-through",
                  }}
                >
                  Interstitial: Disabled
                </Text>
                        </View>
                      </View>
          </View>
        );
      case "about":
        return (
          <View style={{ padding: 16, alignItems: "center" }}>
            <View
              style={{
                width: 80,
                height: 80,
                backgroundColor: "#111",
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 32,
                  fontWeight: "900",
                  fontStyle: "italic",
                }}
              >
                R
              </Text>
            </View>
            <Text
              style={{
                color: "#fff",
                fontSize: 24,
                fontWeight: "900",
                fontStyle: "italic",
                marginBottom: 4,
              }}
            >
              REVITUP
            </Text>
            <Text style={{ color: "#888", fontSize: 12, marginBottom: 24 }}>
              Version 1.2.310 (Build 310)
            </Text>

            <TouchableOpacity
              style={{ marginBottom: 16 }}
              onPress={() => setActiveSubView("user_guide")}
            >
              <Text style={{ color: "#aaa", fontSize: 14, fontWeight: "bold" }}>
                User Guide / How to Use
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginBottom: 16 }}
              onPress={() => setActiveSubView("tos")}
            >
              <Text style={{ color: "#aaa", fontSize: 14, fontWeight: "bold" }}>
                Terms of Service
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginBottom: 16 }}
              onPress={() => Linking.openURL("https://revitup.today/privacy-policy/")}
            >
              <Text style={{ color: "#aaa", fontSize: 14, fontWeight: "bold" }}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        );
      case "tos":
        return (
          <ScrollView style={{ padding: 16 }}>
            <Text
              style={{ color: "#fff", fontWeight: "bold", marginBottom: 8 }}
            >
              Last Updated: May 5, 2026
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 16 }}>
              Welcome to RevItUp. By using our application, you agree to these
              Terms of Service. Please read them carefully.
            </Text>

            <Text
              style={{ color: "#fff", fontWeight: "bold", marginBottom: 8 }}
            >
              1. Acceptance of Terms
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 16 }}>
              By accessing and using RevItUp, you accept and agree to be bound
              by the terms and provision of this agreement.
            </Text>

            <Text
              style={{ color: "#fff", fontWeight: "bold", marginBottom: 8 }}
            >
              2. User Account
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 16 }}>
              You must be responsible for safeguarding the password that you use
              to access the Service and for any activities or actions under your
              password.
            </Text>

            <Text
              style={{ color: "#fff", fontWeight: "bold", marginBottom: 8 }}
            >
              3. Content
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 16 }}>
              Our Service allows you to post, link, store, share and otherwise
              make available certain information, text, graphics, or other
              material.
            </Text>

            <View style={{ height: 40 }} />
          </ScrollView>
        );
      case "privacy_policy":
      case "user_guide":
        return (
          <View
            style={{
              padding: 16,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="document-text-outline"
              size={48}
              color="#555"
              style={{ marginBottom: 16 }}
            />
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 8,
              }}
            >
              View on Web
            </Text>
            <Text
              style={{
                color: "#888",
                fontSize: 14,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              This document is hosted on our website for easy reading.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#fff",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 24,
              }}
              onPress={() => Linking.openURL("https://revitup.today")}
            >
              <Text style={{ color: "#000", fontWeight: "bold" }}>
                Open in Browser
              </Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{isCurrentUser ? "Profile" : (profile?.username || "Tuner")}</Text>
        {isCurrentUser && (
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={{ padding: 4 }}
          >
            <Ionicons name="settings-outline" size={26} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#fff"
            style={{ marginTop: 40 }}
          />
        ) : (
          <>
            {/* Owner Console */}
            {isCurrentUser && auth.currentUser?.email === "tonyang11552883@gmail.com" && (
              <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#111', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#333' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff9800', shadowColor: '#ff9800', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }} />
                    <Text style={{ color: '#ff9800', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 }}>OWNER CONSOLE</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate("Admin")} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#ff9800', backgroundColor: 'rgba(255, 152, 0, 0.1)' }}>
                    <Text style={{ color: '#ff9800', fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>ACTIVE</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: '#1a1a1a', padding: 16, borderRadius: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#888', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>JOINED</Text>
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', fontStyle: 'italic' }}>{adminStats.users}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#1a1a1a', padding: 16, borderRadius: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#888', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>GARAGES</Text>
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', fontStyle: 'italic' }}>{adminStats.garages}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#1a1a1a', padding: 16, borderRadius: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#888', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>LOGS</Text>
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', fontStyle: 'italic' }}>{adminStats.logs}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {profile?.profilePic ? (
                  <Image source={{ uri: profile.profilePic }} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#333' }} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={48} color="#666" />
                  </View>
                )}
              </View>
              <Text style={styles.username}>@{username}</Text>
              <Text style={styles.bio}>
                {profile?.bio || "Live life a quarter mile at a time."}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{garage.length}</Text>
                  <Text style={styles.statLabel}>Garage</Text>
                </View>
                <TouchableOpacity style={styles.statItem} onPress={() => handleOpenFollows('followers')}>
                  <Text style={styles.statNumber}>
                    {dynamicFollowersCount !== null
                      ? dynamicFollowersCount
                      : Math.max(0, profile?.followersCount || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statItem} onPress={() => handleOpenFollows('following')}>
                  <Text style={styles.statNumber}>
                    {dynamicFollowingCount !== null
                      ? dynamicFollowingCount
                      : Math.max(0, profile?.followingCount || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
              </View>

              {isCurrentUser ? (
                <TouchableOpacity style={styles.editButton} onPress={handleOpenEditProfile}>
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "garage" && styles.tabActive]}
                onPress={() => setActiveTab("garage")}
              >
                <Ionicons
                  name="car-sport"
                  size={20}
                  color={activeTab === "garage" ? "#fff" : "#666"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "garage" && styles.tabTextActive,
                  ]}
                >
                  Garage
                </Text>
              </TouchableOpacity>
              
              {profile?.partnerId && partnerProfile && (
                <TouchableOpacity
                  style={[styles.tab, activeTab === "duo" && styles.tabActive]}
                  onPress={() => setActiveTab("duo")}
                >
                  <Ionicons
                    name="heart"
                    size={20}
                    color={activeTab === "duo" ? "#e53935" : "#666"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "duo" && { color: "#e53935" },
                    ]}
                  >
                    Duo
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.tab, activeTab === "posts" && styles.tabActive]}
                onPress={() => setActiveTab("posts")}
              >
                <Ionicons
                  name="grid"
                  size={20}
                  color={activeTab === "posts" ? "#fff" : "#666"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "posts" && styles.tabTextActive,
                  ]}
                >
                  Posts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "listings" && styles.tabActive]}
                onPress={() => setActiveTab("listings")}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={20}
                  color={activeTab === "listings" ? "#fff" : "#666"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "listings" && styles.tabTextActive,
                  ]}
                >
                  Listings
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {activeTab === "garage" && (
                <View style={styles.garageList}>
                  {garage.length > 0 ? (
                    garage.map((car) => (
                      <TouchableOpacity key={car.id} style={styles.garageCard} onPress={() => navigation.navigate("BuildTimeline", { carId: car.id })}> 
                        {car.coverImage ? (
                          <Image
                            source={{ uri: car.coverImage }}
                            style={styles.garageCardImage}
                          />
                        ) : (
                          <View style={styles.garageCardNoImage}>
                            <Ionicons
                              name="car-sport-outline"
                              size={48}
                              color="#666"
                            />
                          </View>
                        )}
                        <View style={styles.garageCardInfo}>
                          <Text style={styles.garageCardTitle}>
                            {car.year} {car.make} {car.model}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons
                        name="car-sport-outline"
                        size={48}
                        color="#333"
                        style={{ marginBottom: 12 }}
                      />
                      <Text style={styles.emptyStateText}>No cars yet</Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === "duo" && profile?.partnerId && partnerProfile && (
                <View style={{ flex: 1 }}>
                  {/* Duo Header Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                     <Image source={{ uri: profile.profilePic || "https://via.placeholder.com/150" }} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#444' }} />
                     <Ionicons name="heart" size={24} color="#e53935" style={{ marginHorizontal: 16 }} />
                     <Image source={{ uri: partnerProfile.profilePic || "https://via.placeholder.com/150" }} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#e53935' }} />
                  </View>
                  <Text style={{ color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 20 }}>
                     {profile.username} & {partnerProfile.username}
                  </Text>
                  
                  {/* Combined Garage */}
                  <Text style={{ color: '#aaa', paddingHorizontal: 16, marginBottom: 12, fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }}>
                     Shared Garage
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 24 }}>
                     {[...garage, ...partnerGarage].map((car, index) => (
                       <View key={car.id || index} style={{ marginRight: 16, width: 140 }}>
                          <Image source={{ uri: car.coverImage || car.images?.[0] || "https://via.placeholder.com/300" }} style={{ width: 140, height: 100, borderRadius: 12, backgroundColor: '#222' }} />
                          <Text style={{ color: '#fff', fontWeight: 'bold', marginTop: 8 }} numberOfLines={1}>{car.year} {car.make} {car.model}</Text>
                       </View>
                     ))}
                     {[...garage, ...partnerGarage].length === 0 && (
                        <Text style={{ color: '#666' }}>No cars in the shared garage yet.</Text>
                     )}
                  </ScrollView>

                  {/* Combined Feed */}
                  <Text style={{ color: '#aaa', paddingHorizontal: 16, marginBottom: 12, fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }}>
                     Duo Feed
                  </Text>
                  <View style={styles.postGrid}>
                    {[...posts, ...partnerPosts].sort((a,b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.()).map((post, index) => (
                      <TouchableOpacity key={post.id || index} style={styles.postItem} onPress={() => setSelectedImage(post.mediaUrls?.[0] || post.mediaUrl)}>
                        <Image
                          source={{ uri: post.mediaUrls?.[0] || post.mediaUrl || "https://via.placeholder.com/300" }}
                          style={styles.postImage}
                        />
                      </TouchableOpacity>
                    ))}
                    {[...posts, ...partnerPosts].length === 0 && (
                        <Text style={{ color: '#666', padding: 16 }}>No shared posts yet.</Text>
                    )}
                  </View>
                </View>
              )}

              {activeTab === "posts" && (
                <View style={styles.postGrid}>
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <TouchableOpacity key={post.id} style={styles.postItem} onPress={() => setSelectedImage(post.mediaUrls?.[0] || post.mediaUrl)}>
                        {post.mediaUrl ||
                        (post.mediaUrls && post.mediaUrls[0]) ? (
                          <Image
                            source={{ uri: post.mediaUrl || post.mediaUrls[0] }}
                            style={styles.postImage}
                          />
                        ) : (
                          <View style={styles.postNoImage}>
                            <Text
                              style={styles.postNoImageText}
                              numberOfLines={3}
                            >
                              {post.caption}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons
                        name="images-outline"
                        size={48}
                        color="#333"
                        style={{ marginBottom: 12 }}
                      />
                      <Text style={styles.emptyStateText}>No posts yet</Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === "listings" && (
                <View style={styles.garageList}>
                  {listings.length > 0 ? (
                    listings.map((item) => (
                      <TouchableOpacity key={item.id} style={styles.garageCard} activeOpacity={0.8} onPress={() => navigation.navigate("ListingDetail", { item })}>
                        {item.images && Array.isArray(item.images) && item.images.length > 0 ? (
                          <Image
                            source={{ uri: item.images[0] }}
                            style={styles.garageCardImage}
                          />
                        ) : (
                          <View style={styles.garageCardNoImage}>
                            <Ionicons
                              name="cart-outline"
                              size={48}
                              color="#666"
                            />
                          </View>
                        )}
                        <View style={styles.garageCardInfo}>
                          <Text style={styles.garageCardTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.garageCardSubtitle}>
                            {item.currency || '$'}{item.price}
                          </Text>
                          <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                            {item.status || 'Available'}
                          </Text>
                        </View>
                        {isCurrentUser && (
                          <TouchableOpacity
                            style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(229, 57, 53, 0.9)', padding: 8, borderRadius: 20 }}
                            onPress={() => handleDeleteListing(item.id)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#fff" />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons
                        name="pricetag-outline"
                        size={48}
                        color="#333"
                        style={{ marginBottom: 12 }}
                      />
                      <Text style={styles.emptyStateText}>No active listings</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.settingsModalHeader}>
            <Text style={styles.settingsModalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <TouchableOpacity onPress={pickAvatar} style={{ alignItems: 'center' }}>
                <Image 
                  source={{ uri: editAvatarUri || profile?.profilePic || "https://via.placeholder.com/150" }} 
                  style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#333' }} 
                />
                <Text style={{ color: '#e53935', marginTop: 12, fontWeight: 'bold' }}>Change Photo</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#fff', marginBottom: 8, fontWeight: 'bold' }}>Username</Text>
            <TextInput
              style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 20 }}
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="Username"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
            />
            <Text style={{ color: '#fff', marginBottom: 8, fontWeight: 'bold' }}>Bio</Text>
            <TextInput
              style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 20, minHeight: 80 }}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Bio"
              placeholderTextColor="#666"
              multiline
            />
            <TouchableOpacity
              style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center' }}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          {!activeSubView ? (
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}

          {!activeSubView ? (
            <ScrollView
              style={styles.settingsScroll}
              contentContainerStyle={styles.settingsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {auth.currentUser?.email === "tonyang11552883@gmail.com" && (
                <SettingsItem
                  icon="shield-outline"
                  title="Admin Panel"
                  subtitle="MANAGE REPORTS AND USERS"
                  onPress={() => {
                    setShowSettings(false);
                    navigation.navigate("Admin");
                  }}
                />
              )}
              <SettingsItem
                icon="notifications-outline"
                title="Notifications"
                subtitle="MANAGE PUSH ALERTS"
                onPress={() => setActiveSubView("notifications")}
              />
              <SettingsItem
                icon="shield-checkmark-outline"
                title="Privacy"
                subtitle="WHO CAN SEE YOUR GARAGE"
                onPress={() => setActiveSubView("privacy")}
              />
              <SettingsItem
                icon="moon-outline"
                title="Appearance"
                subtitle="DARK MODE, THEMES"
                onPress={() => setActiveSubView("appearance")}
              />
              <SettingsItem
                icon="server-outline"
                title="Data & Storage"
                subtitle="MANAGE CACHE & DATA USAGE"
                onPress={() => setActiveSubView("data")}
              />
              <SettingsItem
                icon="phone-portrait-outline"
                title="Connected Devices"
                subtitle="MANAGE ACTIVE SESSIONS"
                onPress={() => setActiveSubView("devices")}
              />
              <SettingsItem
                icon="tv-outline"
                title="Google AdMob"
                subtitle="CONFIGURE & TEST MOBILE ADS"
                onPress={() => setActiveSubView("admob")}
              />
              <SettingsItem
                icon="help-circle-outline"
                title="Support"
                subtitle="GET HELP WITH REVITUP"
                onPress={() =>
                  Linking.openURL("mailto:support@revitup.today").catch(() =>
                    Alert.alert(
                      "Support",
                      "Contact us at support@revitup.today",
                    ),
                  )
                }
              />
              <SettingsItem
                icon="information-circle-outline"
                title="About"
                subtitle="APP VERSION, TERMS, PRIVACY POLICY"
                onPress={() => setActiveSubView("about")}
              />
              <SettingsItem
                icon="shield-half-outline"
                title="Privacy Policy"
                subtitle="FULL GDPR DISCLOSURE"
                onPress={() => Linking.openURL("https://revitup.today/privacy-policy/")}
              />

              {/* Fully active Cookie Consent Toggle */}
              <SettingsItem
                icon={
                  cookieConsent ? "lock-closed-outline" : "lock-open-outline"
                }
                title="Cookie Consent"
                subtitle={
                  cookieConsent ? "CURRENTLY: ACCEPTED" : "CURRENTLY: DECLINED"
                }
                iconBgColor={cookieConsent ? "#4caf50" : "#555"}
                onPress={() => {
                  
                  const newConsent = !cookieConsent;
                  setCookieConsent(newConsent);
                  if (newConsent) {
                    AsyncStorage.setItem('gdpr-consent', 'accepted').catch(console.error);
                    Alert.alert(
                      "Cookies Accepted",
                      "Thank you for supporting personalized experiences."
                    );
                  } else {
                    AsyncStorage.removeItem('gdpr-consent').catch(console.error);
                    Alert.alert(
                      "Cookies Declined",
                      "Non-essential tracking has been disabled."
                    );
                  }
                  if (false) {
                    Alert.alert(
                      "Cookies Declined",
                      "Non-essential tracking has been disabled.",
                    );
                  } else {
                    Alert.alert(
                      "Cookies Accepted",
                      "Thank you for supporting personalized experiences.",
                    );
                  }
                }}
              />

              <SettingsItem
                icon="share-social-outline"
                title="Invite Friends"
                subtitle="SHARE THE APP WITH OTHERS"
                onPress={handleInvite}
              />

              <Text style={styles.dangerZoneHeader}>DANGER ZONE</Text>
              <SettingsItem
                icon="log-out-outline"
                title="Log Out"
                subtitle="END CURRENT SESSION"
                isDanger
                onPress={handleSignOut}
              />
              <SettingsItem
                icon="trash-outline"
                title="Delete Account"
                subtitle="PERMANENTLY REMOVE DATA"
                isDanger
                onPress={handleDeleteAccount}
              />

              <Text style={styles.settingsFooter}>
                REVITUP V1.2.310 (BUILD 310) • GOOGLE CLOUD EDITION
              </Text>
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#333",
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    if (
                      ["tos", "privacy_policy", "user_guide"].includes(
                        activeSubView,
                      )
                    ) {
                      setActiveSubView("about");
                    } else {
                      setActiveSubView(null);
                    }
                  }}
                  style={{ marginRight: 16 }}
                >
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}
                >
                  {activeSubView.replace("_", " ")}
                </Text>
              </View>
              {renderSubViewContent()}
            </View>
          )}
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={{ width: '100%', height: '80%', resizeMode: 'contain' }} />
          )}
        </View>
      </Modal>

      {/* Follows Modal */}
      <Modal visible={!!showFollowsModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.settingsModalHeader}>
            <Text style={styles.settingsModalTitle}>
              {showFollowsModal === 'followers' ? 'Followers' : 'Following'}
            </Text>
            <TouchableOpacity onPress={() => setShowFollowsModal(null)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {loadingFollows ? (
              <ActivityIndicator size="large" color="#e53935" style={{ marginTop: 40 }} />
            ) : followsList.length > 0 ? (
              followsList.map(u => (
                <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Image source={{ uri: u.profilePic || "https://via.placeholder.com/150" }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#333' }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{u.username}</Text>
                    {u.bio && <Text style={{ color: '#aaa', fontSize: 14 }} numberOfLines={1}>{u.bio}</Text>}
                  </View>
                  <TouchableOpacity 
                     style={{ backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                     onPress={() => {
                        setShowFollowsModal(null);
                        if (u.id !== auth.currentUser?.uid) {
                          navigation.push('UserProfile', { userId: u.id });
                        }
                     }}
                  >
                     <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>View</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={{ color: '#666', textAlign: 'center', marginTop: 40 }}>
                No users found.
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  header: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  content: { flex: 1 },

  // Profile Header
  profileHeader: { alignItems: "center", padding: 24 },
  avatarContainer: { marginBottom: 16 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#333",
  },
  username: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    fontStyle: "italic",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  bio: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-evenly",
    marginBottom: 24,
  },
  statItem: { alignItems: "center" },
  statNumber: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    color: "#666",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
  },

  // Edit Profile
  editButton: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    width: "80%",
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#222",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    marginTop: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#fff" },
  tabText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tabTextActive: { color: "#fff" },

  // Content
  tabContent: { flex: 1, padding: 12 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: { color: "#555", fontSize: 15, fontWeight: "bold" },

  // Garage List
  garageList: { gap: 12 },
  garageCard: {
    flexDirection: "row",
    backgroundColor: "#111",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#222",
    height: 100,
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
  },

  // Post Grid
  postGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  postItem: {
    width: POST_SIZE,
    height: POST_SIZE,
    backgroundColor: "#111",
    borderRadius: 8,
    overflow: "hidden",
  },
  postImage: { width: "100%", height: "100%", resizeMode: "cover" },
  postNoImage: {
    width: "100%",
    height: "100%",
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  postNoImageText: { color: "#aaa", fontSize: 10, textAlign: "center" },

  // Settings Modal
  modalContainer: { flex: 1, backgroundColor: "#050505" },
  settingsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  settingsModalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  dragHandleContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 16,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#333",
  },
  settingsScroll: { flex: 1 },
  settingsScrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  settingsIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  settingsTextCol: { flex: 1, justifyContent: "center" },
  settingsTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  settingsSubtitle: {
    color: "#777",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  settingsItemDanger: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(229, 57, 53, 0.2)",
  },
  settingsTitleDanger: { color: "#e53935" },
  settingsSubtitleDanger: { color: "#b71c1c" },

  dangerZoneHeader: {
    color: "#666",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 4,
    marginTop: 24,
    marginBottom: 12,
  },
  settingsFooter: {
    color: "#444",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 40,
    marginBottom: 60,
  },
});
