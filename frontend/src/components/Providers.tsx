'use client';

import { Provider } from 'react-redux';
import { store } from '../store';
import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setTheme } from '../store/slices/themeSlice';
import { registerServiceWorker } from '../lib/serviceWorker';
import AuthInitializer from './AuthInitializer';

function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    const theme = (savedTheme as 'light' | 'dark') || systemTheme;

    dispatch(setTheme(theme));
    document.documentElement.classList.toggle('dark', theme === 'dark');

    // Register service worker for offline support
    registerServiceWorker();
  }, [dispatch]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer>
        <ThemeInitializer>{children}</ThemeInitializer>
      </AuthInitializer>
    </Provider>
  );
}

