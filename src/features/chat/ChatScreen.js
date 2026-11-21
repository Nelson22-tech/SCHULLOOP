// Chat Screen - Real-time Communication
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlueHeader, C, Initials } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { logError } from '../../shared/utils/logger';
import { AuthContext } from '../auth/AuthContext';
import { io } from 'socket.io-client';
import { API_ENDPOINTS } from '../../shared/config/api';

export const formatClock = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Chat bubble shared with GroupChatScreen: others white with sender name + time, own blue.
export const ChatBubble = ({ own, sender, text, time }) => (
  <View style={[styles.bubbleRow, own ? styles.rowOwn : styles.rowOther]}>
    <View style={[styles.bubble, own ? styles.ownBox : styles.otherBox]}>
      {!own && sender ? <Text style={styles.senderName}>{sender}</Text> : null}
      <Text style={[styles.messageText, own && styles.ownText]}>{text}</Text>
      <Text style={[styles.timestamp, own && styles.ownTime]}>{time}</Text>
    </View>
  </View>
);

// Composer shared with GroupChatScreen: attach, input, emoji, round blue send.
export const ChatComposer = ({ value, onChangeText, onSend, sending, placeholder = 'Type a message…', onAttach, onEmoji }) => (
  <View style={styles.inputContainer}>
    <TouchableOpacity onPress={onAttach} hitSlop={8} style={styles.sideIcon}>
      <Ionicons name="attach" size={24} color={C.muted} />
    </TouchableOpacity>
    <View style={styles.inputWrap}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        editable={!sending}
        multiline
        placeholderTextColor="#8A97AE"
      />
      <TouchableOpacity onPress={onEmoji} hitSlop={8}>
        <Ionicons name="happy-outline" size={22} color={C.muted} />
      </TouchableOpacity>
    </View>
    <TouchableOpacity
      style={[styles.sendButton, (sending || !value.trim()) && styles.sendButtonDisabled]}
      onPress={onSend}
      disabled={sending || !value.trim()}
    >
      {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
    </TouchableOpacity>
  </View>
);

export const ChatScreen = ({ navigation, route }) => {
  const { schoolId, conversationId, title } = route.params || {};
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [schoolName, setSchoolName] = useState(title || 'School');
  const [socket, setSocket] = useState(null);
  const listRef = useRef(null);

  const loadSchoolInfo = useCallback(async () => {
    if (schoolId) {
      try {
        const data = await apiService.getSchoolDetail(schoolId);
        setSchoolName(data.name || title || 'School');
      } catch (error) {
        logError('Error loading school info:', error);
      }
    }
  }, [schoolId, title]);

  const loadMessages = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const activeConversationId = conversationId || (schoolId ? `school-${schoolId}` : null);
      if (activeConversationId) {
        try {
          const data = await apiService.getMessages(activeConversationId);
          setMessages(data.messages || []);
        } catch (error) {
          if (!error.message.includes('Conversation not found')) throw error;
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } catch (error) {
      logError('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, schoolId]);

  useEffect(() => {
    let mounted = true;
    let client;
    (async () => {
      loadMessages(); loadSchoolInfo();
      const token = await apiService.getToken();
      if (!token || !mounted) return;
      const base = API_ENDPOINTS.SCHOOLS.replace(/\/api\/schools$/, '');
      client = io(base, { auth: { token }, transports: ['websocket', 'polling'] });
      client.on('connect', () => {
        const id = conversationId || (schoolId ? `school-${schoolId}` : `new-${user?.id}`);
        client.emit('join_conversation', id);
      });
      client.on('receive_message', (message) => {
        setMessages(previous => previous.some(m => String(m._id || m.id) === String(message._id || message.id)) ? previous : [...previous, message]);
      });
      setSocket(client);
    })();
    return () => { mounted = false; if (client) client.disconnect(); setSocket(null); };
  }, [loadMessages, loadSchoolInfo, conversationId, schoolId, user?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const activeConversationId = conversationId || (schoolId ? `school-${schoolId}` : `new-${user?.id}`);
      const response = await apiService.sendMessage(activeConversationId, newMessage);
      setMessages((previous) => previous.some(m => String(m._id || m.id) === String(response.message._id || response.message.id)) ? previous : [...previous, response.message]);
      setNewMessage('');
    } catch (error) {
      logError('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const isOwn = (item) => String(item.senderId?._id || item.senderId || '') === String(user?.id || '');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={0}
    >
      <BlueHeader onBack={() => navigation.goBack()} title={schoolName} subtitle="Chat" right={<Initials name={schoolName} size={36} bg={C.blueDark} />} />
      {loading ? (
        <View style={styles.emptyContainer}><ActivityIndicator color={C.blue} /><Text style={styles.emptySubtext}>Loading messages...</Text></View>
      ) : (
        <View style={styles.container}>
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={56} color={C.blue} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => String(item._id || item.id)}
              renderItem={({ item }) => (
                <ChatBubble own={isOwn(item)} sender={item.senderName} text={item.text} time={formatClock(item.timestamp)} />
              )}
              contentContainerStyle={styles.messageList}
              inverted={false}
              onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
            />
          )}
          <ChatComposer value={newMessage} onChangeText={setNewMessage} onSend={sendMessage} sending={sending} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  emptyText: { fontSize: 17, fontWeight: '800', color: C.text, marginTop: 12, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: C.muted },
  messageList: { paddingVertical: 12 },
  bubbleRow: { flexDirection: 'row', marginVertical: 5, marginHorizontal: 14 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  ownBox: { backgroundColor: C.blue, borderBottomRightRadius: 4 },
  otherBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  senderName: { fontSize: 11, color: C.muted, marginBottom: 2, fontWeight: '700' },
  messageText: { fontSize: 15, color: C.text, lineHeight: 20 },
  ownText: { color: '#fff' },
  timestamp: { fontSize: 10, color: C.muted, marginTop: 4, alignSelf: 'flex-end' },
  ownTime: { color: '#D6E5FF' },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.border, alignItems: 'flex-end' },
  sideIcon: { height: 42, justifyContent: 'center', marginRight: 6 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 22, paddingHorizontal: 14, minHeight: 42, maxHeight: 110 },
  input: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 8, maxHeight: 100 },
  sendButton: { backgroundColor: C.blue, borderRadius: 21, width: 42, height: 42, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendButtonDisabled: { opacity: 0.5 },
});
