import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@waterops:theme';

const ThemeContext = createContext({
  themeMode: 'dark',
  isDark: true,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState('dark');

  useEffect(() => {
    let mounted = true;
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!mounted) return;
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeModeState(savedTheme);
        }
      } catch (error) {
        console.warn('[Theme] Failed to load theme mode:', error);
      }
    };

    loadTheme();
    return () => {
      mounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (nextMode) => {
    const normalized = nextMode === 'light' ? 'light' : 'dark';
    setThemeModeState(normalized);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch (error) {
      console.warn('[Theme] Failed to persist theme mode:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  }, [setThemeMode, themeMode]);

  const contextValue = useMemo(
    () => ({
      themeMode,
      isDark: themeMode === 'dark',
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => useContext(ThemeContext);
