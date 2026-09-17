import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Share,
  Platform,
  Image } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  collection,
  doc,
  getDoc,
  getCountFromServer,
  query,
  where,
  updateDoc,
  setDoc,
  arrayUnion,
  increment,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import mobileAds, { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// RevitUp Giveaways Rewarded Ad Unit ID
// Uses TestIds.REWARDED in development / Expo Go / simulators to guarantee test ad fill,
// and your live AdMob Ad Unit in production standalone builds.
const LIVE_REWARDED_AD_UNIT_ID = 'ca-app-pub-2103649447635694/7993877339';
const REWARDED_AD_UNIT_ID = __DEV__ ? TestIds.REWARDED : LIVE_REWARDED_AD_UNIT_ID;

export default function GiveawaysScreen({ navigation }: any) {
  const [totalUsers, setTotalUsers] = useState(0);
  const [myReferrals, setMyReferrals] = useState(0);
  const [scrolledFeedCount, setScrolledFeedCount] = useState(0);
  const [isLifetimeQualified, setIsLifetimeQualified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasCar, setHasCar] = useState(false);
  const [hasPost, setHasPost] = useState(false);
  const [showTC, setShowTC] = useState(false);
  const [enteredGiveaways, setEnteredGiveaways] = useState<number[]>([]);
  const [enteringGiveaway, setEnteringGiveaway] = useState<number | null>(null);
  const [selectedGiveaway, setSelectedGiveaway] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [nextDrawDate, setNextDrawDate] = useState<string>('');

  // Rewarded Ad state
  const [adLoaded, setAdLoaded] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [rewardClaiming, setRewardClaiming] = useState(false);
  const [watchingAdForTarget, setWatchingAdForTarget] = useState<number | null>(null);
  const watchingAdTargetRef = useRef<number | null>(null);
  const rewardedAdRef = useRef<any>(null);
  const unsubsRef = useRef<(() => void)[]>([]);
  const userWantsToWatchRef = useRef(false);
  const loadingTimeoutRef = useRef<any>(null);

  const [milestones, setMilestones] = useState<any[]>([
    { target: 10000, prize: "£500 CASH" },
    { target: 100000, prize: "£1000 CASH" },
    { target: 1000000, prize: "A CAR" },
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const usersSnap = await getCountFromServer(collection(db, "users"));
        setTotalUsers(usersSnap.data().count);

        const configDoc = await getDoc(doc(db, "giveaways", "config"));
        if (configDoc.exists()) {
          const configData = configDoc.data();
          if (configData.milestones && Array.isArray(configData.milestones)) {
            setMilestones(configData.milestones);
          }
          if (configData.nextDrawDate) {
            setNextDrawDate(configData.nextDrawDate);
          }
        }

        if (auth.currentUser) {
          const uid = auth.currentUser.uid;
          let hasLifetime = false;
          let userReferrals = 0;
          let userScrolled = 0;
          const uDoc = await getDoc(doc(db, "users", uid));
          if (uDoc.exists()) {
            const data = uDoc.data();
            setUserProfile(data);
            userReferrals = data.referralsCount || 0;
            userScrolled = data.scrolledFeedCount || data.feedViewsCount || 0;
            setMyReferrals(userReferrals);
            setEnteredGiveaways(data.enteredGiveaways || []);
            setScrolledFeedCount(userScrolled);
            if (data.giveawayQualified || (data.enteredGiveaways && data.enteredGiveaways.length > 0)) {
              hasLifetime = true;
              setIsLifetimeQualified(true);
            }
          }

          const qGarage = query(
            collection(db, "garage"),
            where("ownerId", "==", uid),
          );
          const snapGarage = await getCountFromServer(qGarage);
          const carExists = snapGarage.data().count > 0;
          setHasCar(carExists);

          const qPost = query(
            collection(db, "posts"),
            where("authorId", "==", uid),
          );
          const snapPost = await getCountFromServer(qPost);
          const postExists = snapPost.data().count > 0;
          setHasPost(postExists);

          if (!hasLifetime && carExists && postExists && userReferrals >= 10 && userScrolled >= 50) {
            setIsLifetimeQualified(true);
            updateDoc(doc(db, "users", uid), { giveawayQualified: true }).catch(() => {});
          }
        }
      } catch (e) {
        console.error("Error loading giveaways:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Initialize Mobile Ads and preload rewarded ad
    const initAds = async () => {
      try {
        if (Platform.OS !== 'web') {
          await requestTrackingPermissionsAsync().catch(() => {});
          await mobileAds().initialize().catch(() => {});
          loadRewardedAd();
        }
      } catch (err) {
        console.log('Mobile ads init in Giveaways:', err);
      }
    };
    initAds();

    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      unsubsRef.current.forEach(u => {
        try { u(); } catch (_) {}
      });
      unsubsRef.current = [];
    };
  }, []);

  const loadRewardedAd = (target?: number) => {
    if (Platform.OS === 'web') return;

    try {
      unsubsRef.current.forEach(u => {
        try { u(); } catch (_) {}
      });
      unsubsRef.current = [];

      const targetForAd = target || watchingAdTargetRef.current;
      const customDataStr = auth.currentUser
        ? (targetForAd ? `${auth.currentUser.uid}__${targetForAd}` : auth.currentUser.uid)
        : '';

      const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
        serverSideVerificationOptions: {
          userId: auth.currentUser ? auth.currentUser.uid : '',
          customData: customDataStr,
        },
      });

      const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        setAdLoaded(true);
        setAdLoading(false);
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

        // If the user already tapped the button while it was loading, automatically show it!
        if (userWantsToWatchRef.current) {
          userWantsToWatchRef.current = false;
          ad.show().catch((err: any) => {
            console.log('Error showing rewarded ad after load:', err);
            handleAdRewardEarned(watchingAdTargetRef.current || undefined);
          });
        }
      });

      const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        handleAdRewardEarned(watchingAdTargetRef.current || undefined);
      });

      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        setAdLoaded(false);
        setAdLoading(false);
        userWantsToWatchRef.current = false;
        // Preload next rewarded ad so user can watch another if they wish
        loadRewardedAd(watchingAdTargetRef.current || undefined);
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.log('Rewarded ad error:', error);
        setAdLoaded(false);
        setAdLoading(false);
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

        if (userWantsToWatchRef.current) {
          userWantsToWatchRef.current = false;
          // When Google AdMob is warming up a new ad unit ID (very common for 24-48h after creation)
          // or has no inventory, gracefully credit the user so the button never feels broken
          Alert.alert(
            "Ad Network Warming Up",
            "Google AdMob is currently warming up this new ad unit. We've awarded your +2 bonus giveaway tickets so you don't miss out!",
            [
              {
                text: "Claim +2 Tickets",
                onPress: () => handleAdRewardEarned(watchingAdTargetRef.current || undefined),
              },
            ]
          );
        }
      });

      unsubsRef.current = [unsubLoaded, unsubEarned, unsubClosed, unsubError];
      ad.load();
      rewardedAdRef.current = ad;
    } catch (e) {
      console.log('Error creating RewardedAd instance:', e);
      setAdLoaded(false);
      setAdLoading(false);
    }
  };

  const handleAdRewardEarned = async (giveawayTarget?: number) => {
    if (!auth.currentUser) return;
    try {
      setRewardClaiming(true);
      const uid = auth.currentUser.uid;
      const userRef = doc(db, "users", uid);

      const targetKey = giveawayTarget ? String(giveawayTarget) : '';
      const now = Date.now();
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      
      const rawHistory: number[] = (targetKey && userProfile?.giveawayAdTimestamps?.[targetKey])
        ? userProfile.giveawayAdTimestamps[targetKey]
        : (Array.isArray(userProfile?.rewardedAdTimestamps) ? userProfile.rewardedAdTimestamps : []);
      const recentTimestamps = rawHistory.filter((ts: number) => typeof ts === 'number' && (now - ts) < TWENTY_FOUR_HOURS_MS);

      if (recentTimestamps.length >= 5) {
        Alert.alert(
          "Daily Limit Reached",
          "You have already watched the maximum of 5 rewarded ads for this giveaway today. Check back in a few hours!"
        );
        return;
      }

      recentTimestamps.push(now);

      const updateData: any = {
        lastAdRewardAt: now,
        rewardedAdTimestamps: recentTimestamps,
      };

      if (targetKey) {
        updateData[`giveawayAdTickets.${targetKey}`] = increment(2);
        updateData[`giveawayAdTimestamps.${targetKey}`] = recentTimestamps;
      } else {
        updateData.adBonusTickets = increment(2);
      }

      await setDoc(userRef, updateData, { merge: true });

      setUserProfile((prev: any) => {
        const nextProfile = { ...prev, lastAdRewardAt: now, rewardedAdTimestamps: recentTimestamps };
        if (targetKey) {
          const currentMap = prev?.giveawayAdTickets || {};
          const currentTsMap = prev?.giveawayAdTimestamps || {};
          nextProfile.giveawayAdTickets = {
            ...currentMap,
            [targetKey]: (currentMap[targetKey] || 0) + 2
          };
          nextProfile.giveawayAdTimestamps = {
            ...currentTsMap,
            [targetKey]: recentTimestamps
          };
        } else {
          nextProfile.adBonusTickets = (prev?.adBonusTickets || 0) + 2;
        }
        return nextProfile;
      });

      Alert.alert(
        "🎉 +2 Extra Tickets Earned!",
        `Thanks for watching! 2 extra raffle tickets have been added specifically to this giveaway (${recentTimestamps.length}/5 watched today).`,
        [{ text: "Awesome!" }]
      );
    } catch (err) {
      console.error("Error crediting ad reward tickets:", err);
      Alert.alert("Error", "Could not credit your extra tickets. Please try again.");
    } finally {
      setRewardClaiming(false);
      setAdLoading(false);
    }
  };

  const handleWatchAdForTickets = async (specificTarget?: number) => {
    if (!auth.currentUser) {
      Alert.alert("Sign In Required", "Please sign in to earn extra giveaway tickets.");
      return;
    }

    const targetToUse = specificTarget || activeMilestone?.target;
    if (!targetToUse) {
      Alert.alert("Notice", "No giveaway is currently selected.");
      return;
    }

    setWatchingAdForTarget(targetToUse);
    watchingAdTargetRef.current = targetToUse;

    // Check 24-hour limit for this giveaway before triggering ad
    const targetKey = String(targetToUse);
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const rawHistory: number[] = (userProfile?.giveawayAdTimestamps?.[targetKey])
      ? userProfile.giveawayAdTimestamps[targetKey]
      : (Array.isArray(userProfile?.rewardedAdTimestamps) ? userProfile.rewardedAdTimestamps : []);
    const recentTimestamps = rawHistory.filter((ts: number) => typeof ts === 'number' && (now - ts) < TWENTY_FOUR_HOURS_MS);

    if (recentTimestamps.length >= 5) {
      const oldestTs = Math.min(...recentTimestamps);
      const msUntilReset = TWENTY_FOUR_HOURS_MS - (now - oldestTs);
      const hours = Math.floor(msUntilReset / (1000 * 60 * 60));
      const minutes = Math.ceil((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));

      Alert.alert(
        "Daily Limit Reached (5/5)",
        `You've reached the limit of 5 rewarded ads in 24 hours for this giveaway. Your next ad entry resets in approximately ${hours > 0 ? `${hours}h ` : ''}${minutes}m.`,
        [{ text: "Got it" }]
      );
      return;
    }

    if (Platform.OS === 'web') {
      setAdLoading(true);
      setTimeout(async () => {
        await handleAdRewardEarned(targetToUse);
        setAdLoading(false);
      }, 1200);
      return;
    }

    // Always reconfigure the ad request with this giveaway's specific target identifier in customData
    userWantsToWatchRef.current = true;
    setAdLoading(true);
    loadRewardedAd(targetToUse);

    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      if (userWantsToWatchRef.current) {
        userWantsToWatchRef.current = false;
        setAdLoading(false);
        Alert.alert(
          "Ad Network Busy",
          "Google AdMob is taking longer than expected to connect. We've credited your +2 bonus giveaway tickets anyway!",
          [
            {
              text: "Claim +2 Tickets",
              onPress: () => handleAdRewardEarned(targetToUse),
            },
            {
              text: "Cancel",
              style: "cancel",
            }
          ]
        );
      }
    }, 4500);
  };

  const currentMilestoneIndex = milestones.findIndex(
    (m) => totalUsers < m.target,
  );
  const activeMilestoneIndex =
    currentMilestoneIndex === -1
      ? milestones.length - 1
      : currentMilestoneIndex;
  const activeMilestone = milestones[activeMilestoneIndex];

  const currentReqsMet = hasCar && hasPost && myReferrals >= 10 && scrolledFeedCount >= 50;
  const isEligibleForTicket = isLifetimeQualified || currentReqsMet;

  const handleEnterGiveaway = async (target: number) => {
    if (!auth.currentUser) return;
    if (!isEligibleForTicket) {
      Alert.alert(
        "Ticket Locked",
        "Complete the entry status steps to unlock your ticket.",
      );
      return;
    }
    try {
      setEnteringGiveaway(target);
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        enteredGiveaways: arrayUnion(target),
        giveawayQualified: true,
      });
      setIsLifetimeQualified(true);
      setEnteredGiveaways((prev) => [...prev, target]);
      Alert.alert("Success", "You have entered the giveaway!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not enter giveaway. Please try again.");
    } finally {
      setEnteringGiveaway(null);
    }
  };

  const handleShare = async () => {
    if (!auth.currentUser) return;
    let shareUsername = userProfile?.username || 'tuner';
    if (
      shareUsername === 'tonyang11552883' ||
      shareUsername === 'tonyang1155' ||
      (auth.currentUser.email?.toLowerCase() === 'tonyang11552883@gmail.com' && shareUsername.startsWith('tonyang'))
    ) {
      shareUsername = 'tony';
    } else if (shareUsername.includes('@')) {
      shareUsername = shareUsername.split('@')[0];
    }
    const shareUrl = `https://revitup.today/?ref=${encodeURIComponent(shareUsername)}`;
    try {
      if (Platform.OS === 'ios') {
        await Share.share({
          url: shareUrl,
        });
      } else {
        await Share.share({
          message: shareUrl,
        });
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#f59e0b"
          style={{ marginTop: 40 }}
        />
      </SafeAreaView>
    );
  }

  const activeTargetKey = String(activeMilestone.target);
  const adTickets = (userProfile?.giveawayAdTickets?.[activeTargetKey] || 0) + (userProfile?.adBonusTickets || 0);
  const boostTickets = Math.min(15, userProfile?.boostTickets !== undefined ? userProfile.boostTickets : myReferrals);
  const baseTicketCount = isLifetimeQualified || isEligibleForTicket ? 1 : 0;
  const totalMyTickets = baseTicketCount + boostTickets + adTickets;

  // 24-hour rewarded ads count for active giveaway
  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const rawHistory: number[] = (userProfile?.giveawayAdTimestamps?.[activeTargetKey])
    ? userProfile.giveawayAdTimestamps[activeTargetKey]
    : (Array.isArray(userProfile?.rewardedAdTimestamps) ? userProfile.rewardedAdTimestamps : []);
  const recentAdTimestamps = rawHistory.filter((ts: number) => typeof ts === 'number' && (now - ts) < TWENTY_FOUR_HOURS_MS);
  const adsWatchedToday = Math.min(5, recentAdTimestamps.length);
  const adsLimitReached = adsWatchedToday >= 5;

  const prevTarget =
    activeMilestoneIndex === 0
      ? 0
      : milestones[activeMilestoneIndex - 1].target;
  const progressValue = Math.min(
    100,
    Math.max(
      0,
      ((totalUsers - prevTarget) / (activeMilestone.target - prevTarget)) * 100,
    ),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>GIVEAWAYS</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Progress Tracker */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressCountContainer}>
              <Text style={styles.progressTotalUsers}>
                {totalUsers.toLocaleString()}
              </Text>
              <Text style={styles.progressTargetUsers}>
                {" "}
                / {activeMilestone.target.toLocaleString()} USERS
              </Text>
            </View>
            <Ionicons
              name="people-outline"
              size={32}
              color="rgba(255,255,255,0.1)"
            />
          </View>

          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progressValue}%` }]}
            />
          </View>

          <View style={styles.progressFooter}>
            <Text style={styles.progressFooterText}>ACTIVE TARGET</Text>
            <Text style={styles.progressFooterPrize}>
              {activeMilestone.prize}
            </Text>
          </View>

          {(activeMilestone.drawDate || nextDrawDate) && (
            <View style={styles.activeDrawDateContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar-outline" size={13} color="#f59e0b" style={{ marginRight: 5 }} />
                <Text style={styles.activeDrawDateLabel}>Scheduled Draw:</Text>
              </View>
              <Text style={styles.activeDrawDateValue}>
                {activeMilestone.drawDate || nextDrawDate}
              </Text>
            </View>
          )}
        </View>

        {/* Milestones List or Detail View */}
        {selectedGiveaway ? (
          <View style={{ padding: 20 }}>
            <TouchableOpacity onPress={() => setSelectedGiveaway(null)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
              <Text style={{ color: "#fff", marginLeft: 5, fontSize: 16 }}>Back to all milestones</Text>
            </TouchableOpacity>
            
            <View style={{ backgroundColor: "#18181b", padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#27272a" }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: "#fff", marginBottom: 10, fontStyle: 'italic' }}>{selectedGiveaway.prize}</Text>
              <Text style={{ color: "#f59e0b", fontWeight: 'bold', marginBottom: 20 }}>{selectedGiveaway.target.toLocaleString()} Users Target</Text>
              
              {/* Enter Giveaway Button */}
              <TouchableOpacity
                onPress={() => handleEnterGiveaway(selectedGiveaway.target)}
                disabled={enteringGiveaway === selectedGiveaway.target || enteredGiveaways.includes(selectedGiveaway.target)}
                style={{
                  backgroundColor: enteredGiveaways.includes(selectedGiveaway.target) ? '#10b981' : '#f59e0b',
                  padding: 15,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginBottom: 15,
                }}
              >
                <Text style={{ color: enteredGiveaways.includes(selectedGiveaway.target) ? '#fff' : '#000', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {enteredGiveaways.includes(selectedGiveaway.target) ? 'Entered' : enteringGiveaway === selectedGiveaway.target ? 'Entering...' : 'Enter Giveaway'}
                </Text>
              </TouchableOpacity>

              {/* Rewarded Ad Interface */}
              {(() => {
                const targetKey = String(selectedGiveaway.target);
                const adHistory = (userProfile?.giveawayAdTimestamps && userProfile?.giveawayAdTimestamps[targetKey]) || [];
                const now = Date.now();
                const recentAds = adHistory.filter((ts: number) => (now - ts) < (24 * 60 * 60 * 1000));
                const isLimitReached = recentAds.length >= 5;

                let resetText = "";
                if (isLimitReached) {
                    const oldestAd = Math.min(...recentAds);
                    const resetTime = oldestAd + (24 * 60 * 60 * 1000);
                    const remainingMs = resetTime - now;
                    const hours = Math.max(0, Math.floor(remainingMs / (60 * 60 * 1000)));
                    const mins = Math.max(0, Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000)));
                    resetText = `Next ad resets in approx ${hours}h ${mins}m`;
                }

                return (
                    <>
                        {isLimitReached ? (
                            <View style={{ backgroundColor: '#18181b', borderColor: '#ef4444', borderWidth: 1, padding: 15, borderRadius: 12, marginTop: 15 }}>
                                <Text style={{ color: '#f87171', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' }}>Daily limit reached (5/5)</Text>
                                <Text style={{ color: '#71717a', textAlign: 'center', marginTop: 5, fontSize: 12 }}>{resetText}</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={() => handleWatchAdForTickets(selectedGiveaway.target)}
                                disabled={adLoading || rewardClaiming}
                                style={{
                                    backgroundColor: '#f59e0b',
                                    padding: 15,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: 15,
                                }}
                            >
                                {adLoading || rewardClaiming ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <ActivityIndicator color="#000" size="small" style={{ marginRight: 8 }} />
                                        <Text style={{ color: '#000', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                            {rewardClaiming ? "Crediting +2 Tickets..." : "Loading Ad..."}
                                        </Text>
                                    </View>
                                ) : (
                                    <>
                                        <Ionicons name="film-outline" size={20} color="#000" style={{ marginRight: 8 }} />
                                        <Text style={{ color: '#000', fontWeight: 'bold', textTransform: 'uppercase' }}>Watch Ad for +2 Tickets</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </>
                );
              })()}
            </View>
          </View>
        ) : (
          milestones.map((m, idx) => {
          const isPassed = totalUsers >= m.target;
          const isCurrent = idx === currentMilestoneIndex;
          const isLocked = !isPassed && !isCurrent;
          const hasEntered = enteredGiveaways.includes(m.target);

          const targetKey = String(m.target);
          const giveawayAdTicketsCount = (userProfile?.giveawayAdTickets?.[targetKey] || 0) + (userProfile?.adBonusTickets || 0);
          const giveawayMyTickets = baseTicketCount + boostTickets + giveawayAdTicketsCount;
          const targetAdHistory: number[] = (userProfile?.giveawayAdTimestamps?.[targetKey])
            ? userProfile.giveawayAdTimestamps[targetKey]
            : (Array.isArray(userProfile?.rewardedAdTimestamps) ? userProfile.rewardedAdTimestamps : []);
          const giveawayRecentAds = targetAdHistory.filter((ts: number) => typeof ts === 'number' && (now - ts) < TWENTY_FOUR_HOURS_MS);
          const giveawayAdsWatched = Math.min(5, giveawayRecentAds.length);
          const giveawayAdsLimitReached = giveawayAdsWatched >= 5;
          const isThisAdBusy = (adLoading || rewardClaiming) && (watchingAdForTarget === m.target);

          return (
            <TouchableOpacity
              key={m.target}
              onPress={() => setSelectedGiveaway(m)}
              style={[
                styles.milestoneCard,
                isCurrent && styles.milestoneCardCurrent,
                isPassed && styles.milestoneCardPassed,
                isLocked && styles.milestoneCardLocked,
              ]}
            >
              <View style={styles.milestoneContent}>
                <View style={{ flex: 1 }}>
                  <View
                    style={[
                      styles.milestoneBadge,
                      isCurrent && styles.milestoneBadgeCurrent,
                      isPassed && styles.milestoneBadgePassed,
                      isLocked && styles.milestoneBadgeLocked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.milestoneBadgeText,
                        isCurrent && styles.milestoneBadgeTextCurrent,
                        isPassed && styles.milestoneBadgeTextPassed,
                        isLocked && styles.milestoneBadgeTextLocked,
                      ]}
                    >
                      {isPassed
                        ? "UNLOCKED"
                        : isCurrent
                          ? "ACTIVE GOAL"
                          : "LOCKED"}
                    </Text>
                  </View>
                  <Text style={styles.milestonePrize}>{m.prize}</Text>
                  <Text style={styles.milestoneTarget}>
                    {m.target.toLocaleString()} Users Target
                  </Text>

                  {m.drawDate ? (
                    <View style={styles.milestoneDrawDateRow}>
                      <Ionicons name="calendar-outline" size={13} color="#f59e0b" style={{ marginRight: 5 }} />
                      <Text style={styles.milestoneDrawDateText}>
                        Draw Date: <Text style={styles.milestoneDrawDateBold}>{m.drawDate}</Text>
                      </Text>
                    </View>
                  ) : null}

                  {m.winnerUsername ? (
                    <View style={styles.winnerBadge}>
                      <Ionicons name="trophy" size={13} color="#f59e0b" style={{ marginRight: 4 }} />
                      <Text style={styles.winnerText}>Winner: {m.winnerUsername}</Text>
                    </View>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.milestoneIconContainer,
                    isCurrent && styles.milestoneIconContainerCurrent,
                    isPassed && styles.milestoneIconContainerPassed,
                    isLocked && styles.milestoneIconContainerLocked,
                  ]}
                >
                  {isPassed ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#22c55e"
                    />
                  ) : (
                    <Feather
                      name="gift"
                      size={24}
                      color={isCurrent ? "#f59e0b" : "#52525b"}
                    />
                  )}
                </View>
              </View>

              {(m.image || m.carMake || m.carModel) ? (
                <View style={styles.milestonePrizeBox}>
                  {m.image ? (
                    <Image source={{ uri: m.image }} style={styles.milestonePrizeImage} resizeMode="cover" />
                  ) : null}
                  {(m.carMake || m.carModel) ? (
                    <View style={styles.carSpecsGrid}>
                      {m.carMake ? (
                        <View style={styles.carSpecCol}>
                          <Text style={styles.carSpecLabel}>MAKE</Text>
                          <Text style={styles.carSpecVal}>{m.carMake}</Text>
                        </View>
                      ) : null}
                      {m.carModel ? (
                        <View style={styles.carSpecCol}>
                          <Text style={styles.carSpecLabel}>MODEL</Text>
                          <Text style={styles.carSpecVal}>{m.carModel}</Text>
                        </View>
                      ) : null}
                      {m.carYear ? (
                        <View style={styles.carSpecCol}>
                          <Text style={styles.carSpecLabel}>YEAR</Text>
                          <Text style={styles.carSpecVal}>{m.carYear}</Text>
                        </View>
                      ) : null}
                      {m.carPower ? (
                        <View style={styles.carSpecCol}>
                          <Text style={styles.carSpecLabel}>POWER</Text>
                          <Text style={styles.carSpecVal}>{m.carPower}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Giveaway Ticket and Ad Booster Section */}
              <View style={{ marginTop: 16 }}>
                {hasEntered ? (
                  <View style={{ gap: 8 }}>
                    <View style={styles.enteredBtn}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#22c55e"
                      />
                      <Text style={styles.enteredBtnText}>
                        ENTERED ({giveawayMyTickets} {giveawayMyTickets === 1 ? 'TICKET' : 'TICKETS'})
                      </Text>
                    </View>

                    {/* Per-Giveaway Rewarded Ad Button */}
                    {!isPassed && (
                      <TouchableOpacity
                        style={[
                          styles.milestoneWatchAdBtn,
                          (isThisAdBusy || giveawayAdsLimitReached) && styles.watchAdBtnDisabled,
                          giveawayAdsLimitReached && { backgroundColor: "#27272a" },
                        ]}
                        onPress={() => handleWatchAdForTickets(m.target)}
                        disabled={isThisAdBusy || giveawayAdsLimitReached}
                        activeOpacity={0.8}
                      >
                        {isThisAdBusy ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator color="#000" size="small" style={{ marginRight: 6 }} />
                            <Text style={styles.milestoneWatchAdBtnText}>
                              {rewardClaiming ? "CREDITING +2 TICKETS..." : "LOADING AD..."}
                            </Text>
                          </View>
                        ) : giveawayAdsLimitReached ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="time-outline" size={16} color="#71717a" style={{ marginRight: 6 }} />
                            <Text style={[styles.milestoneWatchAdBtnText, { color: "#71717a" }]}>
                              LIMIT REACHED FOR THIS DRAW (5/5)
                            </Text>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="play-circle" size={16} color="#000" style={{ marginRight: 6 }} />
                            <Text style={styles.milestoneWatchAdBtnText}>
                              WATCH AD FOR +2 TICKETS ({5 - giveawayAdsWatched} LEFT TODAY)
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}

                    {giveawayAdTicketsCount > 0 && (
                      <View style={styles.giveawayBonusInfoBadge}>
                        <Ionicons name="ticket-outline" size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                        <Text style={styles.giveawayBonusInfoText}>
                          Includes +{giveawayAdTicketsCount} ad bonus tickets for this draw
                        </Text>
                      </View>
                    )}
                  </View>
                ) : isCurrent ? (
                  <TouchableOpacity
                    style={[
                      styles.enterBtn,
                      !isEligibleForTicket && styles.enterBtnDisabled,
                    ]}
                    onPress={() => handleEnterGiveaway(m.target)}
                    disabled={
                      enteringGiveaway === m.target || !isEligibleForTicket
                    }
                  >
                    {enteringGiveaway === m.target ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text
                        style={[
                          styles.enterBtnText,
                          !isEligibleForTicket && styles.enterBtnTextDisabled,
                        ]}
                      >
                        ENTER GIVEAWAY
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.lockedBtn}>
                    <Text style={styles.lockedBtnText}>ENTER GIVEAWAY</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}

        {/* Entry Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusHeader, { justifyContent: "space-between" }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={20}
                color="#f59e0b"
              />
              <Text style={[styles.statusTitle, { marginLeft: 8 }]}>ENTRY STATUS</Text>
            </View>
            {isLifetimeQualified && (
              <View
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                  borderColor: "rgba(34, 197, 94, 0.4)",
                  borderWidth: 1,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: "#4ade80",
                    fontSize: 10,
                    fontWeight: "900",
                    letterSpacing: 0.5,
                  }}
                >
                  LIFETIME UNLOCKED
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.statusSubtitle}>
            {isLifetimeQualified
              ? "You have completed all entry requirements and are permanently qualified for all current & future giveaways!"
              : "New user requirements: Complete these 1-time steps to unlock your raffle tickets forever."}
          </Text>

          <View style={styles.statusList}>
            <View style={styles.statusItem}>
              {isLifetimeQualified || auth.currentUser ? (
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              ) : (
                <View style={styles.statusCircle} />
              )}
              <Text
                style={[
                  styles.statusItemText,
                  (isLifetimeQualified || auth.currentUser) && styles.statusItemTextActive,
                ]}
              >
                ACCOUNT VERIFIED
              </Text>
            </View>
            <View style={styles.statusItem}>
              {isLifetimeQualified || hasCar ? (
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              ) : (
                <View style={styles.statusCircle} />
              )}
              <Text
                style={[
                  styles.statusItemText,
                  (isLifetimeQualified || hasCar) && styles.statusItemTextActive,
                ]}
              >
                ADD 1+ CAR TO GARAGE
              </Text>
            </View>
            <View style={styles.statusItem}>
              {isLifetimeQualified || hasPost ? (
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              ) : (
                <View style={styles.statusCircle} />
              )}
              <Text
                style={[
                  styles.statusItemText,
                  (isLifetimeQualified || hasPost) && styles.statusItemTextActive,
                ]}
              >
                POST A BUILD UPDATE
              </Text>
            </View>
            <View style={styles.statusItem}>
              {isLifetimeQualified || myReferrals >= 10 ? (
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              ) : (
                <View style={styles.statusCircle} />
              )}
              <Text
                style={[
                  styles.statusItemText,
                  (isLifetimeQualified || myReferrals >= 10) && styles.statusItemTextActive,
                ]}
              >
                INVITE 10 FRIENDS
              </Text>
            </View>
            <View style={[styles.statusItem, { justifyContent: "space-between" }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {isLifetimeQualified || scrolledFeedCount >= 50 ? (
                  <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                ) : (
                  <View style={styles.statusCircle} />
                )}
                <Text
                  style={[
                    styles.statusItemText,
                    (isLifetimeQualified || scrolledFeedCount >= 50) && styles.statusItemTextActive,
                  ]}
                >
                  SCROLL 50 FEED IMAGES
                </Text>
              </View>
              <Text
                style={{
                  color: isLifetimeQualified || scrolledFeedCount >= 50 ? "#22c55e" : "#71717a",
                  fontSize: 12,
                  fontWeight: "bold",
                }}
              >
                {isLifetimeQualified ? "50/50" : `${Math.min(50, scrolledFeedCount)}/50`}
              </Text>
            </View>
          </View>

          <View style={styles.statusFooter}>
            <Text
              style={[
                styles.statusFooterText,
                isEligibleForTicket && styles.statusFooterTextActive,
              ]}
            >
              {isLifetimeQualified
                ? "LIFETIME QUALIFIED (TICKETS UNLOCKED)"
                : isEligibleForTicket
                  ? "TICKET UNLOCKED"
                  : "TICKET LOCKED"}
            </Text>
          </View>
        </View>

        {/* Boosts Card */}
        <View style={styles.boostsCard}>
          <View style={styles.boostsIconBg}>
            <Ionicons name="trophy-outline" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.boostsTitle}>YOUR ENTRY BOOSTS</Text>
          <Text style={styles.boostsSubtitle}>
            Boost your chances to win the active raffle
          </Text>

          <View style={styles.boostsCountBox}>
            <Text style={styles.boostsCount}>{boostTickets} / 15</Text>
            <Text style={styles.boostsCountLabel}>EXTRA BOOST TICKETS (MAX 15)</Text>
          </View>

          <Text style={styles.boostsDesc}>
            When a new user signs up using your share link, you receive +1 extra boost ticket for the active giveaway draw (up to a maximum of 15 extra boost tickets). Existing users logging in do not count.
          </Text>

          <TouchableOpacity style={styles.inviteBtn} onPress={handleShare}>
            <Ionicons
              name="copy-outline"
              size={18}
              color="#000"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.inviteBtnText}>INVITE FRIENDS TO BOOST</Text>
          </TouchableOpacity>
        </View>

        {/* Rewarded Ad Card (Watch for +2 Extra Tickets) */}
        <View style={styles.adRewardCard}>
          <View style={styles.adRewardTopRow}>
            <View style={styles.adRewardIconBg}>
              <Ionicons name="film-outline" size={22} color="#f59e0b" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.adRewardTitle}>WANT MORE TICKETS?</Text>
                <View style={[styles.adRewardBadge, adsLimitReached && { backgroundColor: "rgba(239, 68, 68, 0.2)" }]}>
                  <Text style={[styles.adRewardBadgeText, adsLimitReached && { color: "#ef4444" }]}>
                    {adsLimitReached ? "DAILY LIMIT REACHED" : `${adsWatchedToday}/5 TODAY`}
                  </Text>
                </View>
              </View>
              <Text style={styles.adRewardSubtitle}>
                {adsLimitReached
                  ? "You've reached your maximum of 5 rewarded ads for today (resets every 24h)."
                  : "Watch a short video ad to claim +2 extra tickets for the active giveaway (up to 5 per 24h)."}
              </Text>
            </View>
          </View>

          <View style={styles.adRewardStatsRow}>
            <View style={styles.adRewardStatBox}>
              <Text style={styles.adRewardStatNumber}>
                +{adTickets}
              </Text>
              <Text style={styles.adRewardStatLabel}>AD BONUS TICKETS</Text>
            </View>
            <View style={styles.adRewardStatDivider} />
            <View style={styles.adRewardStatBox}>
              <Text style={[styles.adRewardStatNumber, { color: adsLimitReached ? '#ef4444' : '#f59e0b' }]}>
                {adsWatchedToday} / 5
              </Text>
              <Text style={styles.adRewardStatLabel}>WATCHED (24H LIMIT)</Text>
            </View>
            <View style={styles.adRewardStatDivider} />
            <View style={styles.adRewardStatBox}>
              <Text style={[styles.adRewardStatNumber, { color: '#22c55e' }]}>
                {totalMyTickets}
              </Text>
              <Text style={styles.adRewardStatLabel}>TOTAL TICKETS IN DRAW</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.watchAdBtn,
              (adLoading || rewardClaiming || adsLimitReached) && styles.watchAdBtnDisabled,
              adsLimitReached && { backgroundColor: "#27272a" },
            ]}
            onPress={() => handleWatchAdForTickets()}
            disabled={adLoading || rewardClaiming || adsLimitReached}
            activeOpacity={0.8}
          >
            {adLoading || rewardClaiming ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="#000" size="small" style={{ marginRight: 8 }} />
                <Text style={styles.watchAdBtnText}>
                  {rewardClaiming ? "CREDITING +2 TICKETS..." : "LOADING AD..."}
                </Text>
              </View>
            ) : adsLimitReached ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="time-outline" size={20} color="#71717a" style={{ marginRight: 8 }} />
                <Text style={[styles.watchAdBtnText, { color: "#71717a" }]}>DAILY LIMIT REACHED (5/5)</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="play-circle" size={20} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.watchAdBtnText}>
                  WATCH AD FOR +2 EXTRA TICKETS ({5 - adsWatchedToday} LEFT)
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.adRewardNote}>
            {adsLimitReached
              ? "You can watch up to 5 rewarded ads in any 24-hour period to keep raffles fair for everyone."
              : "Completely optional — no obligation to watch. Maximum 5 ads in any 24-hour period."}
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>
            <Text style={{ color: "#a1a1aa", fontWeight: "bold" }}>
              DISCLAIMER:{" "}
            </Text>
            APPLE INC. AND GOOGLE LLC ARE NOT SPONSORS OF, NOR ARE THEY INVOLVED
            IN ANY WAY WITH, THIS GIVEAWAY OR SWEEPSTAKES.
          </Text>
          <Text style={styles.disclaimerText}>
            NO PURCHASE NECESSARY TO ENTER OR WIN. THIS IS A FREE PRIZE DRAW
            COMPLYING WITH UK GAMBLING COMMISSION GUIDELINES. WINNERS ARE
            SELECTED AT RANDOM FROM ELIGIBLE UNLOCKED TICKETS ONCE A COMMUNITY
            MILESTONE IS REACHED.
          </Text>
          <Text style={styles.disclaimerText}>
            PRIZE VALUES ARE AS STATED IN THE MILESTONE TARGETS. SEE FULL{" "}
            <Text style={styles.disclaimerLink} onPress={() => setShowTC(true)}>
              Terms & Conditions
            </Text>{" "}
            FOR OFFICIAL RULES AND ELIGIBILITY.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showTC}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTC(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>TERMS & CONDITIONS</Text>
              <TouchableOpacity onPress={() => setShowTC(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalSectionTitle}>1. Eligibility</Text>
              <Text style={styles.modalSectionText}>
                The RevItUp Giveaway is open to all registered users of the
                RevItUp application. No purchase is necessary. Users must have a
                verified account, at least 1 car in their garage, 1 build update
                posted, at least 10 referred new signups, and have scrolled through
                at least 50 feed images to qualify for an entry ticket.
              </Text>

              <Text style={styles.modalSectionTitle}>2. Non-Affiliation</Text>
              <Text style={styles.modalSectionText}>
                Apple Inc. and Google LLC are NOT sponsors of, nor are they
                involved in any way with, this giveaway or sweepstakes.
              </Text>

              <Text style={styles.modalSectionTitle}>3. How to Enter, Boosts & Rewarded Ad Tickets</Text>
              <Text style={styles.modalSectionText}>
                Users automatically receive an entry upon meeting the
                eligibility requirements. Additional boost tickets (up to a
                maximum of 15 extra tickets per user) can only be earned when
                a new user registers a new RevItUp account through your unique
                share/referral link. Existing users who are already registered do
                not generate extra tickets.
                Users may also voluntarily choose to watch rewarded video ads to earn +2 extra raffle tickets per completed ad. Watching ads is completely voluntary and non-mandatory.
              </Text>

              <Text style={styles.modalSectionTitle}>4. Winner Selection</Text>
              <Text style={styles.modalSectionText}>
                Winners will be selected randomly from all eligible unlocked
                tickets once the specified community milestone targets are met.
                The draw will be conducted transparently and winners will be
                contacted via the email associated with their RevItUp account.
              </Text>

              <Text style={styles.modalSectionTitle}>
                5. General Conditions
              </Text>
              <Text style={styles.modalSectionText}>
                RevItUp reserves the right to cancel, suspend, and/or modify the
                Giveaway if any fraud, technical failures, or any other factor
                beyond reasonable control impairs the integrity or proper
                functioning of the Giveaway.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000", paddingTop: Platform.OS === 'android' ? 40 : 0 },
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#000",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  progressCard: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  progressCountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  progressTotalUsers: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
  },
  progressTargetUsers: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "bold",
  },
  progressBarBg: {
    height: 12,
    backgroundColor: "#000",
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 6,
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  progressFooterText: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  progressFooterPrize: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  milestoneCard: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  milestoneCardCurrent: {
    borderColor: "rgba(245,158,11,0.5)",
    backgroundColor: "#18181b",
  },
  milestoneCardPassed: {
    borderColor: "rgba(34,197,94,0.3)",
    backgroundColor: "rgba(24,24,27,0.5)",
  },
  milestoneCardLocked: {
    opacity: 0.6,
    backgroundColor: "#000",
  },
  milestoneContent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  milestoneBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  milestoneBadgeCurrent: { backgroundColor: "rgba(245,158,11,0.2)" },
  milestoneBadgePassed: { backgroundColor: "rgba(34,197,94,0.2)" },
  milestoneBadgeLocked: { backgroundColor: "#27272a" },
  milestoneBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  milestoneBadgeTextCurrent: { color: "#f59e0b" },
  milestoneBadgeTextPassed: { color: "#22c55e" },
  milestoneBadgeTextLocked: { color: "#71717a" },

  milestonePrize: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    fontStyle: "italic",
  },
  milestoneTarget: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 4,
  },
  milestoneIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneIconContainerCurrent: { backgroundColor: "rgba(245,158,11,0.1)" },
  milestoneIconContainerPassed: { backgroundColor: "rgba(34,197,94,0.1)" },
  milestoneIconContainerLocked: { backgroundColor: "#18181b" },

  enterBtn: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  enterBtnDisabled: {
    backgroundColor: "#27272a",
  },
  enterBtnText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  enterBtnTextDisabled: {
    color: "#52525b",
  },
  lockedBtn: {
    backgroundColor: "#18181b",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  lockedBtnText: {
    color: "#3f3f46",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  enteredBtn: {
    backgroundColor: "rgba(34,197,94,0.2)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  enteredBtnText: {
    color: "#22c55e",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
    marginLeft: 8,
  },

  statusCard: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    fontStyle: "italic",
    marginLeft: 8,
  },
  statusSubtitle: {
    color: "#a1a1aa",
    fontSize: 12,
    marginBottom: 16,
  },
  statusList: {
    gap: 12,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#3f3f46",
  },
  statusItemText: {
    color: "#71717a",
    fontSize: 13,
    fontWeight: "bold",
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  statusItemTextActive: {
    color: "#fff",
  },
  statusFooter: {
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    marginTop: 16,
    paddingTop: 16,
    alignItems: "center",
  },
  statusFooterText: {
    color: "#71717a",
    fontSize: 14,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 2,
  },
  statusFooterTextActive: {
    color: "#22c55e",
  },

  boostsCard: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
  },
  boostsIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  boostsTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    fontStyle: "italic",
  },
  boostsSubtitle: {
    color: "#a1a1aa",
    fontSize: 12,
    marginTop: 4,
  },
  boostsCountBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#27272a",
    width: "100%",
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  boostsCount: {
    color: "#f59e0b",
    fontSize: 36,
    fontWeight: "900",
  },
  boostsCountLabel: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    marginTop: 4,
  },
  boostsDesc: {
    color: "#71717a",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  inviteBtn: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
  },
  inviteBtnText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },

  disclaimerContainer: {
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    paddingTop: 24,
    paddingHorizontal: 8,
  },
  disclaimerText: {
    color: "#71717a",
    fontSize: 9,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  disclaimerLink: {
    color: "#f59e0b",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    fontStyle: "italic",
  },
  modalScroll: {
    padding: 16,
  },
  modalSectionTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 4,
  },
  modalSectionText: {
    color: "#a1a1aa",
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },

  adRewardCard: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  adRewardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  adRewardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  adRewardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    fontStyle: "italic",
  },
  adRewardBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  adRewardBadgeText: {
    color: "#a1a1aa",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  adRewardSubtitle: {
    color: "#a1a1aa",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  adRewardStatsRow: {
    flexDirection: "row",
    backgroundColor: "#202024",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  adRewardStatBox: {
    flex: 1,
    alignItems: "center",
  },
  adRewardStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#2e2e34",
  },
  adRewardStatNumber: {
    color: "#f59e0b",
    fontSize: 22,
    fontWeight: "900",
  },
  adRewardStatLabel: {
    color: "#71717a",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  watchAdBtn: {
    backgroundColor: "#f59e0b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
  },
  watchAdBtnDisabled: {
    opacity: 0.6,
  },
  watchAdBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
  adRewardNote: {
    color: "#71717a",
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 15,
  },
  activeDrawDateContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeDrawDateLabel: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "600",
  },
  activeDrawDateValue: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "bold",
  },
  milestoneDrawDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  milestoneDrawDateText: {
    color: "#d4d4d8",
    fontSize: 11,
    fontWeight: "500",
  },
  milestoneDrawDateBold: {
    color: "#fff",
    fontWeight: "bold",
  },
  winnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  winnerText: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "bold",
  },
  milestonePrizeBox: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  milestonePrizeImage: {
    width: "100%",
    height: 140,
  },
  carSpecsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    backgroundColor: "#18181b",
  },
  carSpecCol: {
    width: "50%",
    marginBottom: 6,
  },
  carSpecLabel: {
    color: "#71717a",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  carSpecVal: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  milestoneWatchAdBtn: {
    backgroundColor: "#f59e0b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  milestoneWatchAdBtnText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  giveawayBonusInfoBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  giveawayBonusInfoText: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "600",
  },
});
