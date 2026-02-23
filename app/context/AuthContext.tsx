import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import socketService from '../services/SocketService';
import { Config } from '../config';

interface ActiveAgency {
  id: string;
  name: string;
  logo: string;
}

interface AuthContextType {
  userToken: string | null;
  isLoading: boolean;
  activeAgency: ActiveAgency | null;
  setActiveAgency: (agency: ActiveAgency | null) => Promise<void>;
  signIn: (token: string) => Promise<ActiveAgency | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AGENCY_STORAGE_KEY = 'activeAgency';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAgency, setActiveAgencyState] = useState<ActiveAgency | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      console.log('[AUTH] App startup — loading session...');
      try {
        const token = await SecureStore.getItemAsync('userToken');
        console.log('[AUTH] Token in storage:', token ? '✅ found' : '❌ none');

        if (token) {
          await restoreAgencyFromServer(token);
          setUserToken(token);
        } else {
          await SecureStore.deleteItemAsync(AGENCY_STORAGE_KEY);
        }
      } catch (e) {
        console.error('[AUTH] Failed to load session:', e);
      } finally {
        setIsLoading(false);
        console.log('[AUTH] isLoading → false');
      }
    };
    loadSession();
  }, []);

  /**
   * Fetches profile to get registeredAgency.
   * 
   * RETRY LOGIC: The backend sometimes returns registeredAgency: null
   * immediately after login even though the field exists in the DB.
   * This appears to be a backend caching/timing issue where the JWT is
   * issued before the registeredAgency field is included in the response.
   * 
   * Fix: if the first call returns null, wait 1.5s and try once more
   * before concluding the user genuinely has no agency.
   * 
   * @param token - JWT access token
   * @param isRetry - internal flag to prevent infinite recursion
   */
  const restoreAgencyFromServer = async (
    token: string,
    isRetry: boolean = false
  ): Promise<ActiveAgency | null> => {
    console.log(`[AUTH] restoreAgencyFromServer — calling /students/profile... ${isRetry ? '(retry)' : ''}`);
    try {
      const profileRes = await fetch(`${Config.API_BASE_URL}/students/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[AUTH] /students/profile status:', profileRes.status);

      if (!profileRes.ok) {
        console.warn('[AUTH] Profile fetch failed — cannot restore agency');
        return null;
      }

      const profileData = await profileRes.json();
      const agencyId = profileData.registeredAgency;
      console.log('[AUTH] registeredAgency from profile:', agencyId ?? 'null');

      // No agency found — but if this is the first attempt, retry once
      // to account for backend returning stale data immediately post-login
      if (!agencyId) {
        if (!isRetry) {
          console.log('[AUTH] registeredAgency is null — waiting 1.5s and retrying once...');
          await delay(1500);
          return restoreAgencyFromServer(token, true);
        }
        // Confirmed null after retry — genuinely a new user
        console.log('[AUTH] Confirmed no agency after retry — new user');
        await SecureStore.deleteItemAsync(AGENCY_STORAGE_KEY);
        setActiveAgencyState(null);
        return null;
      }

      // Agency ID found — fetch full details
      console.log('[AUTH] Fetching agency details for ID:', agencyId);
      const agencyRes = await fetch(`${Config.API_BASE_URL}/agency/profile/${agencyId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[AUTH] /agency/profile status:', agencyRes.status);

      let agency: ActiveAgency;

      if (!agencyRes.ok) {
        console.warn('[AUTH] Agency detail fetch failed — using minimal lock data');
        agency = { id: String(agencyId), name: 'Your Agency', logo: '' };
      } else {
        const agencyData = await agencyRes.json();
        const fullProfile = agencyData.agency || agencyData.profile || agencyData;
        agency = {
          id: String(agencyId),
          name: fullProfile.organizationName || 'Your Agency',
          logo: fullProfile.logo || '',
        };
      }

      await SecureStore.setItemAsync(AGENCY_STORAGE_KEY, JSON.stringify(agency));
      setActiveAgencyState(agency);
      console.log('[AUTH] ✅ activeAgency set to:', JSON.stringify(agency));
      return agency;

    } catch (e) {
      console.error('[AUTH] restoreAgencyFromServer error:', e);
      return null;
    }
  };

  const setActiveAgency = async (agency: ActiveAgency | null) => {
    try {
      if (agency) {
        await SecureStore.setItemAsync(AGENCY_STORAGE_KEY, JSON.stringify(agency));
      } else {
        await SecureStore.deleteItemAsync(AGENCY_STORAGE_KEY);
      }
      setActiveAgencyState(agency);
      console.log('[AUTH] setActiveAgency called:', agency ? agency.name : 'null');
    } catch (e) {
      console.error('[AUTH] Failed to persist active agency:', e);
    }
  };

  /**
   * Restores agency BEFORE setting userToken state so the layout
   * effect fires once with both token + agency already resolved.
   */
  const signIn = async (token: string): Promise<ActiveAgency | null> => {
    console.log('[AUTH] signIn called — saving token to storage...');
    try {
      const tokenString = typeof token === 'string' ? token : JSON.stringify(token);
      await SecureStore.setItemAsync('userToken', tokenString);
      console.log('[AUTH] Token saved — restoring agency (with retry if needed)...');

      const agency = await restoreAgencyFromServer(tokenString);
      console.log('[AUTH] Agency resolved:', agency ? agency.name : 'null — routing to decision');

      // Set token last — layout effect fires with correct agency value
      setUserToken(tokenString);
      return agency;
    } catch (e) {
      console.error('[AUTH] signIn error:', e);
      throw e;
    }
  };

  const signOut = async () => {
    console.log('[AUTH] signOut called');
    try {
      socketService.disconnect();

      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(
        (key) => key.includes('metadata') || key.includes('conversations')
      );
      if (chatKeys.length > 0) {
        await AsyncStorage.multiRemove(chatKeys);
      }

      await GoogleSignin.signOut();
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync(AGENCY_STORAGE_KEY);

      setUserToken(null);
      setActiveAgencyState(null);

      console.log('[AUTH] ✅ signOut complete — token and agency cleared');
    } catch (e) {
      console.error('[AUTH] signOut error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        userToken,
        isLoading,
        activeAgency,
        setActiveAgency,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;