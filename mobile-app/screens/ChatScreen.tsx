import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export default function ChatScreen({ route, navigation }: any) {
  const { chatId, otherUser } = route.params || {};
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState(otherUser?.initialMessage || '');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (otherUser?.initialMessage) {
      setInputText(otherUser.initialMessage);
    }
  }, [otherUser?.initialMessage]);

  useEffect(() => {
    if (!auth.currentUser || !chatId) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSend = async () => {
    if (!inputText.trim() || !auth.currentUser || !chatId) return;
    
    const text = inputText.trim();
    setInputText('');
    
    try {
      const messageId = `${Date.now()}_${auth.currentUser.uid}`;
      await setDoc(doc(db, 'messages', messageId), {
        chatId,
        senderId: auth.currentUser.uid,
        text,
        createdAt: Date.now()
      });
      
      const recipientId = otherUser?.id || otherUser?.uid || '';
      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageAt: Date.now(),
        updatedAt: Date.now(),
        lastSenderId: auth.currentUser.uid,
        participants: Array.from(new Set([auth.currentUser.uid, recipientId])).filter(Boolean)
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
        });
      }
    } catch (e) {
      console.error('Error sending message:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
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
          renderItem={({ item }) => {
            const isMe = item.senderId === auth.currentUser?.uid;
            return (
              <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                  {item.text}
                </Text>
              </View>
            );
          }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#888"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
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
    gap: 12
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#222',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: '#111',
    backgroundColor: '#000',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#111',
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 24,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
