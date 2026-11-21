// Authentication Context
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useEffect, useState } from 'react';
import apiService from '../../shared/services/apiService';
import { logError } from '../../shared/utils/logger';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignout, setIsSignout] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const userData = await AsyncStorage.getItem('userData');
        
        if (token && userData) {
          setUser(JSON.parse(userData));
          await apiService.setToken(token);
        }
      } catch (e) {
        logError('Failed to restore token', e);
      }

      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  // If the server says our saved session is invalid, drop back to the login screen.
  useEffect(() => {
    apiService.onUnauthorized = () => {
      setUser(null);
      setIsSignout(true);
    };
    return () => { apiService.onUnauthorized = null; };
  }, []);

  const authContext = {
    signIn: async (email, password) => {
      try {
        const response = await apiService.login(email, password);
        const { token, user: userData } = response;

        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await apiService.setToken(token);

        setUser(userData);
        setIsSignout(false);
      } catch (error) {
        throw error;
      }
    },

    // Google returns a one-time ticket from our server; Apple returns an ID token we send for verification.
    signInWithProvider: async (provider, credential) => {
      const response = provider === 'google'
        ? await apiService.exchangeSocialTicket(credential)
        : await apiService.socialLogin(provider, credential);
      const { token, user: userData } = response;
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      await apiService.setToken(token);
      setUser(userData);
      setIsSignout(false);
    },

    signUp: async (userData) => {
      try {
        const response = await apiService.signup(userData);
        const { token, user: newUser } = response;

        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(newUser));
        await apiService.setToken(token);

        setUser(newUser);
        setIsSignout(false);
      } catch (error) {
        throw error;
      }
    },

    updateProfile: async (profile) => {
      const response = await apiService.updateMyProfile(profile);
      const updatedUser = { ...(user || {}), ...(response.user || {}) };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    },

    signOut: async () => {
      try {
        // Revokes the token server-side (see POST /api/auth/logout) and
        // clears it locally; logout() clears the token even if the
        // network call fails, so this can't leave the app stuck.
        await apiService.logout();
        await AsyncStorage.removeItem('userData');

        setUser(null);
        setIsSignout(true);
      } catch (error) {
        logError('Sign out error:', error);
      }
    },

    user,
    isLoading,
    isSignout,
  };

  return <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>;
};
