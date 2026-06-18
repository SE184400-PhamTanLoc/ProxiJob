import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, Animated, Platform } from 'react-native';

export default function FloatingLabelInput({
  label,
  value,
  onChangeText,
  activeColor = '#0A58CA',
  inactiveColor = '#94A3B8',
  backgroundColor = '#FFFFFF',
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const animatedIsFocused = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: (isFocused || value) ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    position: 'absolute',
    left: 10,
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [10, -8],
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [13, 10],
    }),
    color: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [inactiveColor, activeColor],
    }),
    backgroundColor: backgroundColor,
    paddingHorizontal: 4,
    zIndex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontWeight: '600',
  };

  return (
    <View style={styles.container}>
      <Animated.Text style={labelStyle} pointerEvents="none">
        {label}
      </Animated.Text>
      <TextInput
        {...props}
        style={[
          styles.textInput,
          isFocused && { borderColor: activeColor, backgroundColor: '#FFFFFF' }
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    marginRight: 10,
    overflow: 'visible',
  },
  textInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
  },
});
