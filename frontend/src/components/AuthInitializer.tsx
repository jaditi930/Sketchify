'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUser, setLoading } from '../store/slices/authSlice';
import { getCurrentUser } from '../lib/auth';

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { token, user, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const loadUser = async () => {
      // If we have a token but no user, load user data
      if (token && !user && isAuthenticated) {
        try {
          dispatch(setLoading(true));
          const userData = await getCurrentUser(token);
          dispatch(setUser(userData));
          // Also update localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } catch (error) {
          // Token might be invalid, clear it
          console.error('Failed to load user:', error);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } finally {
          dispatch(setLoading(false));
        }
      }
    };

    loadUser();
  }, [token, user, isAuthenticated, dispatch]);

  return <>{children}</>;
}

