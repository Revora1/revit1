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
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export default function GroupChatScreen({ route, navigation }: any) {
  const { groupId, groupName } = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!auth.currentUser || !groupId) return;

    const messagesRef = collection(db, 'groupMessages');
    const q = query(
      messagesRef,
      where('groupId', '==', groupId),
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
  }, [groupId]);

  const sendMessage = async () => {
    if (!inputText.trim() || !auth.currentUser) return;
    const text = inputText.trim();
    setInputText('');
    try {
      await addDoc(collection(db, 'groupMessages'), {
        groupId,
        senderId: auth.currentUser.uid,
        senderUsername: auth.currentUser.email?.split('@')[0] || 'User',
        text,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === auth.currentUser?.uid;
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
        {!isMe && <Text style={styles.senderName}>{item.senderUsername}</Text>}
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message group..."
            placeholderTextColor="#888"
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1 },
  listContent: { padding: 16 },
  messageWrapper: { marginBottom: 16, maxWidth: '80%' },
  messageWrapperMe: { alignSelf: 'flex-end' },
  messageWrapperOther: { alignSelf: 'flex-start' },
  senderName: { color: '#888', fontSize: 12, marginBottom: 4, marginLeft: 4 },
  messageBubble: { padding: 12, borderRadius: 16 },
  messageBubbleMe: { backgroundColor: '#e53935', borderBottomRightRadius: 4 },
  messageBubbleOther: { backgroundColor: '#1a1a1a', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#333' },
  messageText: { color: '#fff', fontSize: 15 },
  inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#222', backgroundColor: '#0a0a0a', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100, minHeight: 40, borderWidth: 1, borderColor: '#333' },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center', marginLeft: 12, marginBottom: 2 },
  sendButtonDisabled: { backgroundColor: '#333' }
});
