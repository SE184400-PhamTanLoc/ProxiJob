import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableOpacity,
  Platform
} from 'react-native';
import { theme } from '../styles/theme';
import { AppContext } from '../context/AppContext';

export default function Toast() {
  const { toast, hideToast } = useContext(AppContext);
  const { visible, message, type } = toast;

  const [shouldRender, setShouldRender] = useState(false);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Animate In
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: Platform.OS === 'ios' ? 60 : 30,
          useNativeDriver: true,
          bounciness: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Set auto hide timeout
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, 3500);
    } else if (shouldRender) {
      handleDismiss();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShouldRender(false);
      hideToast();
    });
  };

  if (!shouldRender) {
    return null;
  }

  // Get status details based on type
  const getStatusConfig = () => {
    switch (type) {
      case 'success':
        return {
          color: theme.colors.success,
          emoji: '✅',
          title: 'Thành công'
        };
      case 'error':
        return {
          color: theme.colors.danger,
          emoji: '❌',
          title: 'Thất bại'
        };
      case 'warning':
        return {
          color: theme.colors.warning,
          emoji: '⚠️',
          title: 'Cảnh báo'
        };
      case 'info':
      default:
        return {
          color: theme.colors.primary, // ProxiJob bright gold
          emoji: '💡',
          title: 'Thông báo'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        theme.shadows.medium,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
          borderLeftColor: config.color,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touchArea}
        onPress={handleDismiss}
        activeOpacity={0.9}
      >
        <View style={styles.contentRow}>
          {/* Badge Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
            <Text style={styles.emojiText}>{config.emoji}</Text>
          </View>
          
          {/* Details */}
          <View style={styles.textContainer}>
            <Text style={[styles.statusTitle, { color: config.color }]}>
              {config.title}
            </Text>
            <Text numberOfLines={2} style={styles.messageText}>
              {message}
            </Text>
          </View>

          {/* Close indicator */}
          <Text style={styles.closeBtn}>✕</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB', // Fine border to give clean structure
  },
  touchArea: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiText: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 13,
    color: '#374151', // Dark grey for excellent legibility
    lineHeight: 16,
  },
  closeBtn: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
    fontWeight: '500',
  },
});
