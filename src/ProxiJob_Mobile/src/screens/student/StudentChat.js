import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr/dist/browser/signalr.js';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { IDENTITY_API_BASE_URL } from '../../api/apiConfig';
import { getStoredToken } from '../../api/auth';
import { handleCallUser } from '../../utils/callHelper';
import { getAvatarSource } from '../../utils/avatarHelper';
import { useConversationsQuery } from '../../hooks/queries';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EMPTY_ARRAY = [];

export default function StudentChat() {
  const { user, navigationParams, setNavigationParams, setIsChatRoomActive } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const { data: dbConversationsData, refetch: refetchConversations } = useConversationsQuery(user);
  const dbConversations = dbConversationsData || EMPTY_ARRAY;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const scrollViewRef = useRef();
  const connectionRef = useRef(null);
  const activeChatRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [readChatStatus, setReadChatStatus] = useState({});

  // Keep ref in sync with activeChat state so SignalR handler always has latest value
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Reset active chat room state in navigation layout when unmounting this screen
  useEffect(() => {
    return () => {
      setIsChatRoomActive(false);
    };
  }, []);

  // Real database conversations list
  const [conversations, setConversations] = useState([]);

  // Track keyboard height for Android manual adjustment
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (dbConversations && dbConversations.length > 0) {
      setConversations(prev => {
        // Map dbConversations to override unread count if matching readChatStatus
        const mappedDbConversations = dbConversations.map(item => {
          const status = readChatStatus[item.id];
          if (status && status.lastMessage === item.lastMessage && status.time === item.time) {
            return { ...item, unread: 0 };
          }
          return item;
        });

        // If structurally identical, skip state update to prevent rendering loops
        const hasChange = prev.length !== mappedDbConversations.length || 
          mappedDbConversations.some((item, idx) => {
            const prevItem = prev[idx];
            return !prevItem || 
                   prevItem.id !== item.id || 
                   prevItem.lastMessage !== item.lastMessage || 
                   prevItem.time !== item.time || 
                   prevItem.unread !== item.unread;
          });
        
        if (!hasChange) return prev;

        const merged = [...mappedDbConversations];
        prev.forEach(p => {
          if (!merged.find(m => m.id === p.id)) {
            merged.push(p);
          }
        });
        return merged;
      });
    } else if (dbConversations) {
      setConversations(prev => prev.length === 0 ? prev : EMPTY_ARRAY);
    }
  }, [dbConversations, readChatStatus]);

  // Load conversations list from backend API
  const loadConversations = async () => {
    refetchConversations();
  };

  // Load database messages for specific partner user ID
  const loadMessages = async (partnerId) => {
    try {
      const token = await getStoredToken();
      if (!token) return;

      const response = await fetch(`${IDENTITY_API_BASE_URL}/messages/${partnerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const mappedMsgs = data.map(m => ({
          id: m.id.toString(),
          sender: m.senderId === user.id ? 'student' : 'employer',
          text: m.content,
          time: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(mappedMsgs);
      }
    } catch (err) {
      console.log('[StudentChat API] Error loading messages:', err);
    }
  };

  // SignalR Hub Connection Setup
  useEffect(() => {
    let active = true;
    const connectSignalR = async () => {
      try {
        const token = await getStoredToken();
        if (!token) return;

        const hubUrl = IDENTITY_API_BASE_URL.replace('/api', '/hub/chat');
        console.log('[StudentChat SignalR] Connecting to:', hubUrl);

        const connection = new HubConnectionBuilder()
          .withUrl(hubUrl, {
            accessTokenFactory: () => token
          })
          .configureLogging({
            log(logLevel, message) {
              // Suppress noisy network closed 1006 error in dev console to avoid RN Red Box
              if (message.includes("status code: 1006") || message.includes("WebSocket closed")) {
                console.log("[StudentChat SignalR] Connection closed gracefully.");
              } else if (logLevel >= 4) { // Error level
                console.warn("[StudentChat SignalR Error]", message);
              } else {
                console.log("[StudentChat SignalR]", message);
              }
            }
          })
          .withAutomaticReconnect()
          .build();

        connection.on("ReceiveMessage", (senderId, messageContent) => {
          console.log('[StudentChat SignalR] Received message:', senderId, messageContent);

          if (active) {
            // Use ref to get latest activeChat without needing it in dependency array
            const currentChat = activeChatRef.current;
            const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            if (currentChat && currentChat.id === senderId.toString()) {
              const newMsg = {
                id: (Date.now() + Math.random()).toString(),
                sender: 'employer',
                text: messageContent,
                time: timeStr
              };
              setMessages(prev => [...prev, newMsg]);
              setReadChatStatus(prev => ({
                ...prev,
                [senderId.toString()]: { lastMessage: messageContent, time: timeStr }
              }));
            }
            loadConversations();
          }
        });

        await connection.start();
        console.log('[StudentChat SignalR] Connection established successfully!');
        connectionRef.current = connection;
      } catch (err) {
        console.log('[StudentChat SignalR] Connection failed:', err);
      }
    };

    connectSignalR();
    loadConversations();

    return () => {
      active = false;
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [user]);

  // Handle direct navigation parameters from other screens (e.g. Job details / Shop profile)
  useEffect(() => {
    if (navigationParams && navigationParams.partnerId) {
      const pId = navigationParams.partnerId.toString();
      const activeConvo = conversations.find(c => c.id === pId);

      const tempChat = {
        id: pId,
        name: navigationParams.partnerName || (activeConvo ? activeConvo.name : 'Cửa hàng'),
        avatar: navigationParams.partnerAvatar || (activeConvo ? activeConvo.avatar : null),
        gender: navigationParams.partnerGender || (activeConvo ? activeConvo.gender : undefined),
        lastMessage: activeConvo ? activeConvo.lastMessage : 'Chưa có tin nhắn nào',
        time: activeConvo ? activeConvo.time : '',
        unread: activeConvo ? activeConvo.unread : 0,
        phone: navigationParams.partnerPhone || (activeConvo ? activeConvo.phone : 'Không có'),
        isMock: false,
        messages: []
      };

      setConversations(prev => {
        const exists = prev.find(c => c.id === pId);
        if (exists) return prev;
        return [tempChat, ...prev];
      });

      if (!activeChatRef.current || activeChatRef.current.id !== pId) {
        setActiveChat(tempChat);
        setIsChatRoomActive(true);
      }

      // Mark as read in status
      setReadChatStatus(prev => ({
        ...prev,
        [pId]: { lastMessage: tempChat.lastMessage, time: tempChat.time }
      }));

      loadMessages(pId);
      setNavigationParams({});
    }
  }, [navigationParams]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChat) return;

    const textToSend = inputText;
    setInputText('');

    // Prepend to UI immediately
    const tempMsg = {
      id: Date.now().toString(),
      sender: 'student',
      text: textToSend,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      if (connectionRef.current && connectionRef.current.state === 'Connected') {
        // Send to real backend Hub
        await connectionRef.current.invoke("SendMessage", activeChat.id, textToSend);
        console.log('[StudentChat SignalR] Message sent to Hub successfully.');
      } else {
        console.log('[StudentChat SignalR] Connection offline.');
      }
      loadConversations();
    } catch (err) {
      console.log('[StudentChat Hub] Error invoking SendMessage:', err);
    }
  };

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    setIsChatRoomActive(true);
    loadMessages(chat.id);

    // Mark unread as read in local view and store status
    setReadChatStatus(prev => ({
      ...prev,
      [chat.id]: { lastMessage: chat.lastMessage, time: chat.time }
    }));
    setConversations(prev =>
      prev.map(c => (c.id === chat.id ? { ...c, unread: 0 } : c))
    );
  };

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate the bottom padding needed when keyboard is open on Android
  // The tab bar sits at absolute bottom ~16px with height 68px, and content has paddingBottom ~84px
  // When keyboard opens, input needs to sit above keyboard minus the tab bar space that's now hidden
  const androidKeyboardPadding = Platform.OS === 'android' && keyboardHeight > 0
    ? keyboardHeight - (Platform.OS === 'android' ? 84 : 96)
    : 0;

  return (
    <View style={styles.container}>
      {activeChat ? (
        <View style={styles.chatContainer}>
          {/* Chat Room Header - fixed at top, never moves */}
          <View style={[styles.chatHeader, { paddingTop: Math.max(12, insets.top) }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => { setActiveChat(null); setIsChatRoomActive(false); Keyboard.dismiss(); }}>
              <Ionicons name="chevron-back" size={24} color="#1E293B" />
            </TouchableOpacity>

            <View style={styles.avatarWrapper}>
              <Image
                source={getAvatarSource(activeChat.avatar, activeChat.gender, activeChat.name)}
                style={styles.chatHeaderAvatar}
              />
              <View style={styles.onlineDotHeader} />
            </View>

            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderName} numberOfLines={1}>{activeChat.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <View style={styles.onlineStatusPulse} />
                <Text style={styles.chatHeaderStatus}>Hoạt động</Text>
              </View>
            </View>

            <View style={styles.chatHeaderActions}>
              <TouchableOpacity
                style={styles.callIconBtn}
                onPress={() => handleCallUser(activeChat.phone)}
              >
                <Ionicons name="call" size={18} color="#FF6B00" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages + Input area - this part adjusts with keyboard */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={0}
          >
            {/* Messages List */}
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg) => {
                const isMe = msg.sender === 'student';
                return (
                  <View
                    key={msg.id}
                    style={[styles.messageBubbleContainer, isMe ? styles.myBubbleContainer : styles.otherBubbleContainer]}
                  >
                    {!isMe ? (
                      <View style={styles.otherBubbleRow}>
                        <Image
                          source={getAvatarSource(activeChat.avatar, activeChat.gender, activeChat.name)}
                          style={styles.smallMessageAvatar}
                        />
                        <View style={styles.messageContentCol}>
                          <View style={[styles.messageBubble, styles.otherBubble]}>
                            <Text style={[styles.messageText, styles.otherMessageText]}>
                              {msg.text}
                            </Text>
                          </View>
                          <Text style={styles.messageTime}>{msg.time}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.myBubbleRow}>
                        <View style={styles.messageContentCol}>
                          <View style={[styles.messageBubble, styles.myBubble]}>
                            <Text style={[styles.messageText, styles.myMessageText]}>
                              {msg.text}
                            </Text>
                          </View>
                          <Text style={[styles.messageTime, { alignSelf: 'flex-end' }]}>{msg.time}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Input Bar */}
            <View style={[
              styles.inputBar,
              { paddingBottom: Math.max(12, insets.bottom) },
              Platform.OS === 'android' && keyboardHeight > 0 && {
                paddingBottom: Math.max(20, androidKeyboardPadding + 24),
              }
            ]}>
              <TouchableOpacity style={styles.attachBtn} activeOpacity={0.7} onPress={() => {}}>
                <Ionicons name="add-circle" size={26} color="#FF6B00" />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity style={styles.sendBtn} activeOpacity={0.8} onPress={handleSendMessage}>
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Header */}
          <View style={styles.headerContainer}>
            <View>
              <Text style={styles.headerTitle}>Trò Chuyện</Text>
              <Text style={styles.headerSubtitle}>Liên hệ trực tiếp với các nhà tuyển dụng</Text>
            </View>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>Trực tuyến</Text>
            </View>
          </View>

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm cuộc hội thoại..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Conversations List */}
          {filteredConversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>Không tìm thấy cuộc hội thoại nào.</Text>
            </View>
          ) : (
            filteredConversations.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                style={[styles.conversationCard, chat.unread > 0 && styles.conversationCardUnread]}
                activeOpacity={0.7}
                onPress={() => handleSelectChat(chat)}
              >
                <View style={styles.avatarWrapper}>
                  <Image
                    source={getAvatarSource(chat.avatar, chat.gender, chat.name)}
                    style={styles.conversationAvatar}
                  />
                  <View style={styles.onlineDot} />
                </View>
                <View style={styles.conversationMeta}>
                  <View style={styles.metaTop}>
                    <Text style={styles.conversationName} numberOfLines={1}>{chat.name}</Text>
                    <Text style={styles.conversationTime}>{chat.time}</Text>
                  </View>
                  <View style={styles.metaBottom}>
                    <Text style={[styles.lastMessage, chat.unread > 0 && styles.lastMessageUnread]} numberOfLines={1}>{chat.lastMessage}</Text>
                    {chat.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{chat.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 120,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1.0,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  conversationCardUnread: {
    backgroundColor: '#FFF8F3',
    borderColor: '#FFE2D1',
    borderLeftWidth: 5,
    borderLeftColor: '#FF6B00',
    paddingLeft: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  conversationAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineDotHeader: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  conversationMeta: {
    flex: 1,
    marginLeft: 12,
  },
  metaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  conversationTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  metaBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },
  unreadBadge: {
    backgroundColor: '#FF6B00',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 10,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  chatHeaderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  chatHeaderName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  onlineStatusPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  chatHeaderStatus: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEFE2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD7C2',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubbleContainer: {
    marginBottom: 16,
    width: '100%',
  },
  myBubbleContainer: {
    alignItems: 'flex-end',
  },
  otherBubbleContainer: {
    alignItems: 'flex-start',
  },
  otherBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  myBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    maxWidth: '85%',
    alignSelf: 'flex-end',
  },
  smallMessageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  messageContentCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#FF6B00',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  otherMessageText: {
    color: '#1E293B',
    fontWeight: '500',
  },
  messageTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    paddingHorizontal: 4,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  attachBtn: {
    paddingRight: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    fontSize: 14,
    color: '#1E293B',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    backgroundColor: '#FF6B00',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  }
});
