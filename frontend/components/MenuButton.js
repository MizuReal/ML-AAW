import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { useAppTheme } from '../utils/theme';

const MenuButton = ({ open = false, onToggle }) => {
  const { isDark } = useAppTheme();
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [open, progress]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      className={`h-11 w-11 items-center justify-center rounded-full border ${
        isDark ? 'border-sky-800/80 bg-slate-950/70' : 'border-slate-300 bg-white/90'
      }`}
      onPress={onToggle}
    >
      <Animated.View
        className={`h-[1.5px] w-5 rounded-full ${isDark ? 'bg-sky-200' : 'bg-slate-700'}`}
        style={{
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-4, 0],
              }),
            },
            {
              rotate: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '45deg'],
              }),
            },
          ],
        }}
      />
      <Animated.View
        className={`mt-[4px] h-[1.5px] w-5 rounded-full ${isDark ? 'bg-sky-300' : 'bg-slate-700'}`}
        style={{
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
        }}
      />
      <Animated.View
        className={`mt-[4px] h-[1.5px] w-5 rounded-full ${isDark ? 'bg-sky-400' : 'bg-slate-700'}`}
        style={{
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 0],
              }),
            },
            {
              rotate: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '-45deg'],
              }),
            },
          ],
        }}
      />
    </TouchableOpacity>
  );
};

export default MenuButton;
