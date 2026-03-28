import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';

// ─── CONFIG ────────────────────────────────────────────────────────────────────
// Replace this with your deployed backend URL (Render / Railway / etc.)
// const API_BASE_URL = 'https://your-backend.onrender.com';
// ───────────────────────────────────────────────────────────────────────────────
const API_BASE_URL = 'http://10.135.196.193:5000';
export default function ChatScreen() {
  const [username, setUsername]     = useState('');
  const [message, setMessage]       = useState('');
  const [messages, setMessages]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [sending, setSending]       = useState(false);
  const [usernameSet, setUsernameSet] = useState(false);

  const flatListRef = useRef(null);
  const pollRef     = useRef(null);

  // ── Fetch messages from backend ──────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/messages`);
      const json = await res.json();
      if (json.success) {
        setMessages(json.data); // already latest-first from backend
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, []);

  // ── Poll every 3 seconds ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!usernameSet) return;

    setLoading(true);
    fetchMessages().finally(() => setLoading(false));

    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [usernameSet, fetchMessages]);

  // ── Send message ─────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/message`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, message: trimmed }),
      });
      const json = await res.json();

      if (json.success) {
        setMessage('');
        await fetchMessages(); // immediate refresh
      } else {
        Alert.alert('Error', json.error || 'Could not send message');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Could not reach the server. Check API_BASE_URL.');
    } finally {
      setSending(false);
    }
  };

  // ── Confirm username ─────────────────────────────────────────────────────────
  const confirmUsername = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a username to continue.');
      return;
    }
    setUsername(trimmed);
    setUsernameSet(true);
  };

  // ── Format timestamp ─────────────────────────────────────────────────────────
  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ── Username entry screen ────────────────────────────────────────────────────
  if (!usernameSet) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.usernameScreen}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>💬</Text>
            <Text style={styles.logoText}>GroupChat</Text>
            <Text style={styles.logoSub}>Enter your name to join the conversation</Text>
          </View>

          <TextInput
            style={styles.usernameInput}
            placeholder="Your name..."
            placeholderTextColor="#555"
            value={username}
            onChangeText={setUsername}
            onSubmitEditing={confirmUsername}
            returnKeyType="done"
            maxLength={24}
            autoFocus
          />

          <TouchableOpacity style={styles.joinButton} onPress={confirmUsername}>
            <Text style={styles.joinButtonText}>Join Chat →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Message item renderer ────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const isMe = item.username === username;
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        {!isMe && (
          <Text style={styles.bubbleUsername}>{item.username}</Text>
        )}
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
          {item.message}
        </Text>
        <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    );
  };

  // ── Main chat screen ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      {/* <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.onlineDot} />
          <Text style={styles.headerTitle}>GroupChat</Text>
        </View>
        <Text style={styles.headerUser}>@{username}</Text>
      </View> */}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages list */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#7c6af7" size="large" />
            <Text style={styles.loadingText}>Loading messages…</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id?.toString() ?? Math.random().toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.messageList}
            inverted                          // latest at bottom, scroll naturally
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet.</Text>
                <Text style={styles.emptySubText}>Be the first to say something! 👋</Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message…"
            placeholderTextColor="#555"
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendIcon}>➤</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const COLORS = {
  bg:         '#0b0b14',
  surface:    '#13131f',
  card:       '#1a1a2e',
  accent:     '#7c6af7',
  accentDark: '#5548d9',
  me:         '#7c6af7',
  them:       '#1e1e35',
  text:       '#e8e8f0',
  muted:      '#666680',
  border:     '#22223a',
};

const styles = StyleSheet.create({
  flex:        { flex: 1 },
  safeArea:    { flex: 1, backgroundColor: COLORS.bg },

  // ── Username screen ──
  usernameScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon:    { fontSize: 64, marginBottom: 8 },
  logoText:    { fontSize: 32, fontWeight: '800', color: COLORS.text, letterSpacing: -1 },
  logoSub:     { fontSize: 14, color: COLORS.muted, marginTop: 6, textAlign: 'center' },

  usernameInput: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  joinButton: {
    width: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  headerUser:  { fontSize: 13, color: COLORS.muted, fontWeight: '500' },

  // ── Messages ──
  messageList: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: COLORS.muted, fontSize: 14 },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 6,
  },
  emptyText:    { color: COLORS.muted, fontSize: 16 },
  emptySubText: { color: COLORS.muted, fontSize: 13 },

  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.me,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.them,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleUsername: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bubbleText:   { fontSize: 15, color: COLORS.text, lineHeight: 21 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime:   { fontSize: 10, color: COLORS.muted, marginTop: 4, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.6)' },

  // ── Input bar ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  messageInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 120,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: COLORS.accentDark, opacity: 0.6 },
  sendIcon:           { color: '#fff', fontSize: 16, marginLeft: 2 },
});