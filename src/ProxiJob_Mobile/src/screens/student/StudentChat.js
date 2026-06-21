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

export default function StudentChat() {
  const { user, navigationParams, setNavigationParams } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const scrollViewRef = useRef();
  const connectionRef = useRef(null);
  const activeChatRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Keep ref in sync with activeChat state so SignalR handler always has latest value
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

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

  // Load conversations list from backend API
  const loadConversations = async () => {
    try {
      const token = await getStoredToken();
      if (!token) return;

      const response = await fetch(`${IDENTITY_API_BASE_URL}/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          const mapped = data.map(c => ({
            id: c.userId.toString(),
            name: c.name,
            avatar: c.avatar,
            lastMessage: c.lastMessage,
            time: c.time,
            unread: c.unread,
            phone: c.phone || '0901234567',
            isMock: false,
            messages: []
          }));
          setConversations(mapped);
        } else {
          setConversations([]);
        }
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.log('[StudentChat API] Error loading conversations:', err);
    }
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
            if (currentChat && currentChat.id === senderId.toString()) {
              const newMsg = {
                id: (Date.now() + Math.random()).toString(),
                sender: 'employer',
                text: messageContent,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              };
              setMessages(prev => [...prev, newMsg]);
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

      setActiveChat(prevActive => {
        if (prevActive && prevActive.id === pId) return prevActive;
        return tempChat;
      });

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
    loadMessages(chat.id);

    // Mark unread as read in local view
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
          <View style={styles.chatHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => { setActiveChat(null); Keyboard.dismiss(); }}>
              <Ionicons name="chevron-back" size={24} color="#1E293B" />
            </TouchableOpacity>

            <Image
              source={getAvatarSource(activeChat.avatar, activeChat.gender, activeChat.name)}
              style={styles.chatHeaderAvatar}
            />
            
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderName} numberOfLines={1}>{activeChat.name}</Text>
              <Text style={styles.chatHeaderStatus}>Hoạt động</Text>
            </View>

            <View style={styles.chatHeaderActions}>
              <TouchableOpacity
                style={styles.callIconBtn}
                onPress={() => handleCallUser(activeChat.phone)}
              >
                <Ionicons name="call" size={20} color="#FF6B00" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages + Input area - this part adjusts with keyboard */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
                    <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
                      <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                        {msg.text}
                      </Text>
                    </View>
                    <Text style={styles.messageTime}>{msg.time}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Input Bar */}
            <View style={[
              styles.inputBar,
              Platform.OS === 'android' && keyboardHeight > 0 && {
                paddingBottom: Math.max(20, androidKeyboardPadding + 24),
              }
            ]}>
              <TextInput
                style={styles.input}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {/* List Screen Header */}
          <View style={styles.mainHeader}>
            <Text style={styles.mainHeaderTitle}>Trò Chuyện</Text>
            <Text style={styles.mainHeaderSubtitle}>Liên hệ trực tiếp với các cửa hàng tuyển dụng</Text>
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
          <ScrollView contentContainerStyle={styles.listScroll} showsVerticalScrollIndicator={false}>
            {filteredConversations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>Không tìm thấy cuộc hội thoại nào.</Text>
              </View>
            ) : (
              filteredConversations.map((chat) => (
                <TouchableOpacity
                  key={chat.id}
                  style={styles.conversationCard}
                  activeOpacity={0.7}
                  onPress={() => handleSelectChat(chat)}
                >
                  <Image
                    source={getAvatarSource(chat.avatar, chat.gender, chat.name)}
                    style={styles.conversationAvatar}
                  />
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
        </View>
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
  mainHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mainHeaderTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
  },
  mainHeaderSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
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
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 14,
    color: '#1E293B',
  },
  listScroll: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  conversationAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
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
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  conversationTime: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 10,
    color: '#94A3B8',
  },
  metaBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    fontWeight: '700',
    color: '#0F172A',
  },
  unreadBadge: {
    backgroundColor: '#FF6B00',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
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
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
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
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  chatHeaderStatus: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF6B0014',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B0033',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubbleContainer: {
    marginBottom: 16,
    maxWidth: '75%',
  },
  myBubbleContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherBubbleContainer: {
    alignSelf: 'flex-start',
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
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1E293B',
  },
  messageTime: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    paddingHorizontal: 4,
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
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    fontSize: 14,
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
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
