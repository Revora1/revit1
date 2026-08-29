import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useLayoutEffect } from "react";
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
  arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

export default function GiveawaysScreen({ navigation }: any) {
  const [totalUsers, setTotalUsers] = useState(0);
  const [myReferrals, setMyReferrals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasCar, setHasCar] = useState(false);
  const [hasPost, setHasPost] = useState(false);
  const [showTC, setShowTC] = useState(false);
  const [enteredGiveaways, setEnteredGiveaways] = useState<number[]>([]);
  const [enteringGiveaway, setEnteringGiveaway] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [milestones, setMilestones] = useState<any[]>([
    { target: 10000, prize: "£500 CASH" },
    { target: 100000, prize: "£5000 CASH" },
    { target: 1000000, prize: "A BRAND NEW CAR" },
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
        }

        if (auth.currentUser) {
          const uid = auth.currentUser.uid;
          const uDoc = await getDoc(doc(db, "users", uid));
          if (uDoc.exists()) {
            const data = uDoc.data();
            setUserProfile(data);
            setMyReferrals(data.referralsCount || 0);
            setEnteredGiveaways(data.enteredGiveaways || []);
          }

          const qGarage = query(
            collection(db, "garage"),
            where("ownerId", "==", uid),
          );
          const snapGarage = await getCountFromServer(qGarage);
          setHasCar(snapGarage.data().count > 0);

          const qPost = query(
            collection(db, "posts"),
            where("authorId", "==", uid),
          );
          const snapPost = await getCountFromServer(qPost);
          setHasPost(snapPost.data().count > 0);
        }
      } catch (e) {
        console.error("Error loading giveaways:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const currentMilestoneIndex = milestones.findIndex(
    (m) => totalUsers < m.target,
  );
  const activeMilestoneIndex =
    currentMilestoneIndex === -1
      ? milestones.length - 1
      : currentMilestoneIndex;
  const activeMilestone = milestones[activeMilestoneIndex];

  const handleEnterGiveaway = async (target: number) => {
    if (!auth.currentUser) return;
    const isEligible = hasCar && hasPost && myReferrals >= 10;
    if (!isEligible) {
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
      });
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
    const shareUrl = `https://revitup.today/?ref=${userProfile?.username || auth.currentUser.uid}`;
    try {
      await Share.share({
        message: `I'm on RevItUp! Join me and let's unlock the community milestone giveaways.\n\n${shareUrl}`,
        title: "Join me on RevItUp",
        url: shareUrl,
      });
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

  const boostTickets = Math.min(15, userProfile?.boostTickets !== undefined ? userProfile.boostTickets : myReferrals);

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

  const isEligibleForTicket = hasCar && hasPost && myReferrals >= 10;

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
        </View>

        {/* Milestones List */}
        {milestones.map((m, idx) => {
          const isPassed = totalUsers >= m.target;
          const isCurrent = idx === currentMilestoneIndex;
          const isLocked = !isPassed && !isCurrent;
          const hasEntered = enteredGiveaways.includes(m.target);

          return (
            <View
              key={m.target}
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

              <View style={{ marginTop: 16 }}>
                {hasEntered ? (
                  <View style={styles.enteredBtn}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#22c55e"
                    />
                    <Text style={styles.enteredBtnText}>TICKET ENTERED</Text>
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
            </View>
          );
        })}

        {/* Entry Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={20}
              color="#f59e0b"
            />
            <Text style={styles.statusTitle}>ENTRY STATUS</Text>
          </View>
          <Text style={styles.statusSubtitle}>
            Complete these steps to unlock your raffle ticket.
          </Text>

          <View style={styles.statusList}>
            <View style={styles.statusItem}>
              {auth.currentUser ? (
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              ) : (
                <View style={styles.statusCircle} />
              )}
              <Text
                style={[
                  styles.statusItemText,
                  auth.currentUser && styles.statusItemTextActive,
                ]}
              >
                ACCOUNT VERIFIED
              </Text>
            </View>
            <View style={styles.statusItem}>
              {hasCar ? (
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              ) : (
                <View style={styles.statusCircle} />
              )}
              <Text
                style={[
                  styles.statusItemText,
                  hasCar && styles.statusItemTextActive,
                ]}
              >
                ADD 1+ CAR TO GARAGE
              </Text>
            </View>
            <View style={styles.statusItem}>
              {hasPost ? (
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              ) : (
                <View style={styles.statusCircle} />
              )}
              <Text
                style={[
                  styles.statusItemText,
                  hasPost && styles.statusItemTextActive,
                ]}
              >
                POST A BUILD UPDATE
              </Text>
            </View>
            <View style={styles.statusItem}>
              {myReferrals >= 10 ? (
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              ) : (
                <View style={styles.statusCircle} />
              )}
              <Text
                style={[
                  styles.statusItemText,
                  myReferrals >= 10 && styles.statusItemTextActive,
                ]}
              >
                INVITE 10 FRIENDS
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
              {isEligibleForTicket ? "TICKET UNLOCKED" : "TICKET LOCKED"}
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
                posted, and at least 10 referred new signups to qualify for an entry
                ticket.
              </Text>

              <Text style={styles.modalSectionTitle}>2. Non-Affiliation</Text>
              <Text style={styles.modalSectionText}>
                Apple Inc. and Google LLC are NOT sponsors of, nor are they
                involved in any way with, this giveaway or sweepstakes.
              </Text>

              <Text style={styles.modalSectionTitle}>3. How to Enter & Boost Tickets (Max 15)</Text>
              <Text style={styles.modalSectionText}>
                Users automatically receive an entry upon meeting the
                eligibility requirements. Additional boost tickets (up to a
                maximum of 15 extra tickets per user) can only be earned when
                a new user registers a new RevItUp account through your unique
                share/referral link. Existing users who are already registered do
                not generate extra tickets.
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
});
