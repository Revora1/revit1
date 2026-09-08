import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
  Keyboard,
  ActivityIndicator,
  Animated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export default function ChatScreen({ route, navigation }: any) {
  const { chatId: initialChatId, otherUser } = route.params || {};
  const insets = useSafeAreaInsets();
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId || null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState(otherUser?.initialMessage || '');
  const [isSending, setIsSending] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const onKeyboardShow = (e: any) => {
      setIsKeyboardVisible(true);
      const height = e?.endCoordinates?.height || 336;
      Animated.timing(keyboardOffset, {
        toValue: Platform.OS === 'ios' ? height : 0,
        duration: Platform.OS === 'ios' ? (e?.duration || 250) : 100,
        useNativeDriver: false,
      }).start();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    };

    const onKeyboardHide = (e: any) => {
      setIsKeyboardVisible(false);
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e?.duration || 250) : 100,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onKeyboardShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onKeyboardHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (otherUser?.initialMessage) {
      setInputText(otherUser.initialMessage);
    }
  }, [otherUser?.initialMessage]);

  // Resolve or compute chatId if not passed directly
  useEffect(() => {
    if (initialChatId) {
      setActiveChatId(initialChatId);
      return;
    }

    const resolveChatId = async () => {
      const myId = auth.currentUser?.uid;
      const otherId = otherUser?.id || otherUser?.uid;
      if (!myId || !otherId) return;

      const chatId1 = `${myId}_${otherId}`;
      const chatId2 = `${otherId}_${myId}`;

      try {
        const snap1 = await getDoc(doc(db, 'chats', chatId1));
        if (snap1.exists()) {
          setActiveChatId(chatId1);
          return;
        }
        const snap2 = await getDoc(doc(db, 'chats', chatId2));
        if (snap2.exists()) {
          setActiveChatId(chatId2);
          return;
        }
        // Default to deterministic ID if neither exists yet
        setActiveChatId(chatId1);
      } catch (err) {
        console.error('Error checking chat doc:', err);
        setActiveChatId(chatId1);
      }
    };

    resolveChatId();
  }, [initialChatId, otherUser?.id, otherUser?.uid]);

  // Listen to messages & mark unread as read
  useEffect(() => {
    if (!auth.currentUser || !activeChatId) return;

    const messagesRef = collection(db, 'messages');
    // Using where without orderBy avoids composite index requirement
    const q = query(
      messagesRef,
      where('chatId', '==', activeChatId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in-memory by createdAt ascending
      msgs.sort((a: any, b: any) => {
        const aTime = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
        const bTime = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
        return aTime - bTime;
      });
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      // Auto mark incoming messages as read by the recipient
      const currentUid = auth.currentUser?.uid;
      if (currentUid) {
        let hasIncomingUnread = false;
        snapshot.docs.forEach(d => {
          const mData = d.data();
          if (mData.senderId && mData.senderId !== currentUid && !mData.read) {
            hasIncomingUnread = true;
            updateDoc(doc(db, 'messages', d.id), {
              read: true,
              readAt: Date.now()
            }).catch(() => {});
          }
        });

        if (hasIncomingUnread) {
          updateDoc(doc(db, 'chats', activeChatId), {
            lastMessageRead: true,
            [`readBy.${currentUid}`]: Date.now()
          }).catch(() => {});
        }
      }
    }, (error) => {
      console.error('Error listening to messages:', error);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const handleSend = async () => {
    if (!inputText.trim() || !auth.currentUser) return;
    
    let targetChatId = activeChatId;
    const recipientId = otherUser?.id || otherUser?.uid || '';

    if (!targetChatId && recipientId) {
      targetChatId = `${auth.currentUser.uid}_${recipientId}`;
      setActiveChatId(targetChatId);
    }

    if (!targetChatId) {
      Alert.alert('Error', 'Unable to start chat. Recipient not found.');
      return;
    }

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    
    try {
      const messageId = `${Date.now()}_${auth.currentUser.uid}`;
      await setDoc(doc(db, 'messages', messageId), {
        chatId: targetChatId,
        senderId: auth.currentUser.uid,
        text,
        createdAt: Date.now(),
        read: false,
        readAt: null
      });
      
      const participantList = Array.from(new Set([auth.currentUser.uid, recipientId])).filter(Boolean);
      await setDoc(doc(db, 'chats', targetChatId), {
        lastMessage: text,
        lastMessageAt: Date.now(),
        updatedAt: Date.now(),
        lastSenderId: auth.currentUser.uid,
        lastMessageRead: false,
        participantIds: participantList,
        participants: participantList
      }, { merge: true });

      if (recipientId) {
        const notifId = `${Date.now()}_${auth.currentUser.uid}_msg_${recipientId}`;
        await setDoc(doc(db, 'notifications', notifId), {
          userId: recipientId,
          actorId: auth.currentUser.uid,
          type: 'message',
          read: false,
          text: `sent you a message: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`,
          createdAt: Date.now()
        }).catch(() => {});
      }
    } catch (e: any) {
      console.error('Error sending message:', e);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Animated.View style={[styles.container, { paddingBottom: keyboardOffset }]}>
        {/* Custom Screen Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {otherUser?.displayName || otherUser?.username || 'Chat'}
            </Text>
            {otherUser?.isMechanic || otherUser?.initialMessage ? (
              <Text style={styles.headerSubtitle}>Service Provider Quote Request</Text>
            ) : null}
          </View>
        </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isMe = item.senderId === auth.currentUser?.uid;
              const timeFormatted = item.createdAt 
                ? new Date(typeof item.createdAt === 'number' ? item.createdAt : item.createdAt?.toMillis?.() || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                : '';

              return (
                <View style={[styles.messageRow, isMe ? styles.myRow : styles.theirRow]}>
                  <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                      {item.text}
                    </Text>
                    <View style={[styles.metaRow, isMe ? styles.myMetaRow : styles.theirMetaRow]}>
                      <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText]}>
                        {timeFormatted}
                      </Text>
                      {isMe && (
                        item.read ? (
                          <View style={styles.readStatusBadge}>
                            <Ionicons name="checkmark-done" size={15} color="#0284c7" />
                            <Text style={styles.readStatusText}>Read</Text>
                          </View>
                        ) : (
                          <View style={styles.readStatusBadge}>
                            <Ionicons name="checkmark" size={14} color="#6b7280" />
                            <Text style={styles.deliveredStatusText}>Delivered</Text>
                          </View>
                        )
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />

          <View style={[
            styles.inputContainer,
            { paddingBottom: isKeyboardVisible ? 10 : Math.max(insets.bottom, 12) }
          ]}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#888"
              value={inputText}
              onChangeText={setInputText}
              multiline
              onFocus={() => {
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
              }}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]} 
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  keyboardAvoid: { flex: 1 },
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
    backgroundColor: '#09090b',
    gap: 12
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: '#eab308',
    fontSize: 11,
    fontWeight: '600'
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
    gap: 10,
    flexGrow: 1,
    justifyContent: 'flex-end'
  },
  messageRow: {
    width: '100%',
    marginVertical: 3,
  },
  myRow: {
    alignItems: 'flex-end',
  },
  theirRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myMessage: {
    backgroundColor: '#ffffff',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#000',
  },
  theirMessageText: {
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  myMetaRow: {
    justifyContent: 'flex-end',
  },
  theirMetaRow: {
    justifyContent: 'flex-start',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  myTimeText: {
    color: '#52525b',
  },
  theirTimeText: {
    color: '#71717a',
  },
  readStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 3,
    gap: 2,
  },
  readStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284c7',
  },
  deliveredStatusText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#18181b',
    backgroundColor: '#09090b',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#18181b',
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 22,
    fontSize: 15,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendButtonDisabled: {
    backgroundColor: '#27272a',
    opacity: 0.6,
  }
});
