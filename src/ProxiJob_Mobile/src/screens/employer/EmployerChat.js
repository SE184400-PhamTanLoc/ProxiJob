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
import { IDENTITY_API_BASE_URL, MANAGEMENT_API_BASE_URL } from '../../api/apiConfig';
import { getStoredToken } from '../../api/auth';
import { handleCallUser } from '../../utils/callHelper';
import { getAvatarSource } from '../../utils/avatarHelper';
import { useConversationsQuery } from '../../hooks/queries';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EmployerChat() {
  const { user, navigationParams, setNavigationParams } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const { data: dbConversations = [], refetch: refetchConversations } = useConversationsQuery(user);
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
  const [employees, setEmployees] = useState([]);

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

  // Fetch staff roster from Management API
  const loadEmployees = async () => {
    try {
      const token = await getStoredToken();
      if (!token) return;

      const response = await fetch(`${MANAGEMENT_API_BASE_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const resData = await response.json();
        const list = resData.data !== undefined ? resData.data : resData;
        const items = Array.isArray(list) ? list : (list.items || []);

        // Filter out employees without a userId (they must have an account to chat)
        const mapped = items.filter(emp => emp.userId).map(emp => ({
          id: emp.id.toString(),
          userId: emp.userId.toString(),
          name: emp.fullName,
          phone: emp.phoneNumber || 'Không có',
          avatar: null,
          gender: undefined,
        }));
        setEmployees(mapped);
      }
    } catch (err) {
      console.log('[EmployerChat API] Error loading employees:', err);
    }
  };

  const handleSelectEmployee = (emp) => {
    const pId = emp.userId;
    const activeConvo = conversations.find(c => c.id === pId);
    const tempChat = {
      id: pId,
      name: emp.name,
      avatar: activeConvo ? activeConvo.avatar : emp.avatar,
      gender: activeConvo ? activeConvo.gender : emp.gender,
      lastMessage: activeConvo ? activeConvo.lastMessage : 'Chưa có tin nhắn nào',
      time: activeConvo ? activeConvo.time : '',
      unread: activeConvo ? activeConvo.unread : 0,
      phone: emp.phone,
      isMock: false,
      messages: []
    };

    setConversations(prev => {
      const exists = prev.find(c => c.id === pId);
      if (exists) return prev;
      return [tempChat, ...prev];
    });

    setActiveChat(tempChat);
    loadMessages(pId);
  };

  useEffect(() => {
    if (dbConversations && dbConversations.length > 0) {
      setConversations(prev => {
        const merged = [...dbConversations];
        prev.forEach(p => {
          if (!merged.find(m => m.id === p.id)) {
            merged.push(p);
          }
        });
        return merged;
      });
    } else if (dbConversations) {
      setConversations([]);
    }
  }, [dbConversations]);

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
          sender: m.senderId === user.id ? 'employer' : 'student',
          text: m.content,
          time: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(mappedMsgs);
      }
    } catch (err) {
      console.log('[EmployerChat API] Error loading messages:', err);
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
        console.log('[EmployerChat SignalR] Connecting to:', hubUrl);

        const connection = new HubConnectionBuilder()
          .withUrl(hubUrl, {
            accessTokenFactory: () => token
          })
          .configureLogging({
            log(logLevel, message) {
              // Suppress noisy network closed 1006 error in dev console to avoid RN Red Box
              if (message.includes("status code: 1006") || message.includes("WebSocket closed")) {
                console.log("[EmployerChat SignalR] Connection closed gracefully.");
              } else if (logLevel >= 4) { // Error level
                console.warn("[EmployerChat SignalR Error]", message);
              } else {
                console.log("[EmployerChat SignalR]", message);
              }
            }
          })
          .withAutomaticReconnect()
          .build();

        connection.on("ReceiveMessage", (senderId, messageContent) => {
          console.log('[EmployerChat SignalR] Received message:', senderId, messageContent);

          if (active) {
            // Use ref to get latest activeChat without needing it in dependency array
            const currentChat = activeChatRef.current;
            if (currentChat && currentChat.id === senderId.toString()) {
              const newMsg = {
                id: (Date.now() + Math.random()).toString(),
                sender: 'student',
                text: messageContent,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              };
              setMessages(prev => [...prev, newMsg]);
            }
            loadConversations();
          }
        });

        await connection.start();
        console.log('[EmployerChat SignalR] Connection established successfully!');
        connectionRef.current = connection;
      } catch (err) {
        console.log('[EmployerChat SignalR] Connection failed:', err);
      }
    };

    connectSignalR();
    loadConversations();
    loadEmployees();

    return () => {
      active = false;
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [user]);

  // Handle direct navigation parameters from other screens (e.g. HRM / Candidate List)
  useEffect(() => {
    if (navigationParams && navigationParams.partnerId) {
      const pId = navigationParams.partnerId.toString();
      const activeConvo = conversations.find(c => c.id === pId);

      const tempChat = {
        id: pId,
        name: navigationParams.partnerName || (activeConvo ? activeConvo.name : 'Sinh viên'),
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
      sender: 'employer',
      text: textToSend,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      if (connectionRef.current && connectionRef.current.state === 'Connected') {
        // Send to real backend Hub
        await connectionRef.current.invoke("SendMessage", activeChat.id, textToSend);
        console.log('[EmployerChat SignalR] Message sent to Hub successfully.');
      } else {
        console.log('[EmployerChat SignalR] Connection offline.');
      }
      loadConversations();
    } catch (err) {
      console.log('[EmployerChat Hub] Error invoking SendMessage:', err);
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

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // Calculate the bottom padding needed when keyboard is open on Android
  const androidKeyboardPadding = Platform.OS === 'android' && keyboardHeight > 0
    ? keyboardHeight - (Platform.OS === 'android' ? 84 : 96)
    : 0;

  return (
    <View style={styles.container}>
      {activeChat ? (
        <View style={styles.chatContainer}>
          {/* Chat Room Header (Moved outside KeyboardAvoidingView so it never moves or disappears!) */}
          <View style={[styles.chatHeader, { paddingTop: Math.max(12, insets.top) }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => { setActiveChat(null); Keyboard.dismiss(); }}>
              <Ionicons name="chevron-back" size={24} color="#1E293B" />
            </TouchableOpacity>

            <Image
              source={getAvatarSource(activeChat.avatar, activeChat.gender, activeChat.name)}
              style={styles.chatHeaderAvatar}
            />

            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderName} numberOfLines={1}>{activeChat.name}</Text>
              <Text style={styles.chatHeaderStatus}>Sinh viên</Text>
            </View>

            <View style={styles.chatHeaderActions}>
              <TouchableOpacity
                style={styles.callIconBtn}
                onPress={() => handleCallUser(activeChat.phone)}
              >
                <Ionicons name="call" size={20} color="#0A58CA" />
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
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
                const isMe = msg.sender === 'employer';
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
              { paddingBottom: Math.max(12, insets.bottom) },
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
          {/* Search Box */}
          <View style={[styles.searchContainer, { marginTop: 16 }]}>
            <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm sinh viên..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Conversations List */}
          <ScrollView contentContainerStyle={styles.listScroll} showsVerticalScrollIndicator={false}>
            {/* Horizontal Employees List */}
            {employees.length > 0 && (
              <View style={styles.employeeSection}>
                <Text style={styles.sectionTitle}>Nhân Viên Của Quán</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.employeeHorizontalScroll}
                >
                  {employees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase())).map((emp) => {
                    const activeConvo = conversations.find(c => c.id === emp.userId);
                    return (
                      <TouchableOpacity
                        key={emp.id}
                        style={styles.employeeBubble}
                        activeOpacity={0.7}
                        onPress={() => handleSelectEmployee(emp)}
                      >
                        <Image
                          source={getAvatarSource(
                            activeConvo ? activeConvo.avatar : emp.avatar,
                            activeConvo ? activeConvo.gender : emp.gender,
                            emp.name
                          )}
                          style={styles.employeeBubbleAvatar}
                        />
                        <Text style={styles.employeeBubbleName} numberOfLines={1}>
                          {emp.name.split(' ').pop()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

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
                      <Text style={styles.lastMessage} numberOfLines={1}>{chat.lastMessage}</Text>
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
    paddingTop: 20,
    paddingBottom: 12,
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
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  conversationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
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
  unreadBadge: {
    backgroundColor: '#0A58CA',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 9,
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
    backgroundColor: '#FFFFFF',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  chatHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  chatHeaderName: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  chatHeaderStatus: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 10,
    color: '#0A58CA',
    fontWeight: '600',
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0A58CA14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubbleContainer: {
    marginBottom: 16,
    maxWidth: '80%',
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#0A58CA',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
  },
  messageText: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 13,
    lineHeight: 18,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1E293B',
  },
  messageTime: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 4,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 40,
    fontSize: 13,
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: '#0A58CA',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeSection: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  employeeHorizontalScroll: {
    paddingRight: 10,
  },
  employeeBubble: {
    alignItems: 'center',
    marginRight: 18,
    width: 60,
  },
  employeeBubbleAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#0A58CA',
    backgroundColor: '#FFFFFF',
  },
  employeeBubbleName: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 6,
    textAlign: 'center',
  }
});
