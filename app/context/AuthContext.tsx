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
  refreshUserProfile: () => Promise<ActiveAgency | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AGENCY_STORAGE_KEY = 'activeAgency';
const TOKEN_STORAGE_KEY = 'userToken';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAgency, setActiveAgencyState] = useState<ActiveAgency | null>(null);
  const [authStateVersion, setAuthStateVersion] = useState(0); // Add version trigger

  // Function to fetch user profile and get registered agency
  const fetchUserProfile = async (token: string): Promise<{ agencyId: string | null; agencyDetails?: any }> => {
    try {
      console.log('[AUTH] Fetching user profile...');
      const response = await fetch(`${Config.API_BASE_URL}/students/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.log('[AUTH] Profile fetch failed:', response.status);
        return { agencyId: null };
      }

      const data = await response.json();
      console.log('[AUTH] Profile data:', data);

      const agencyId = data.profile?.registeredAgency || null;
      console.log('[AUTH] registeredAgency from API:', agencyId);

      return { agencyId, agencyDetails: data };
    } catch (error) {
      console.error('[AUTH] Error fetching profile:', error);
      return { agencyId: null };
    }
  };

  // Function to fetch agency details
  const fetchAgencyDetails = async (token: string, agencyId: string): Promise<ActiveAgency | null> => {
    try {
      console.log('[AUTH] Fetching agency details for ID:', agencyId);
      const response = await fetch(`${Config.API_BASE_URL}/agency/profile/${agencyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.log('[AUTH] Agency details fetch failed:', response.status);
        return {
          id: String(agencyId),
          name: 'Your Agency',
          logo: ''
        };
      }

      const data = await response.json();
      const fullProfile = data.agency || data.profile || data;

      return {
        id: String(agencyId),
        name: fullProfile.organizationName || 'Your Agency',
        logo: fullProfile.logo || '',
      };
    } catch (error) {
      console.error('[AUTH] Error fetching agency details:', error);
      return {
        id: String(agencyId),
        name: 'Your Agency',
        logo: ''
      };
    }
  };

  // Main function to restore agency from API
  const restoreAgencyFromAPI = async (token: string): Promise<ActiveAgency | null> => {
    try {
      const { agencyId } = await fetchUserProfile(token);

      if (!agencyId) {
        console.log('[AUTH] No registered agency found in profile');
        return null;
      }

      const agency = await fetchAgencyDetails(token, agencyId);

      if (agency) {
        console.log('[AUTH] Agency restored from API:', agency.name);
        return agency;
      }

      return null;
    } catch (error) {
      console.error('[AUTH] Error in restoreAgencyFromAPI:', error);
      return null;
    }
  };

  const refreshUserProfile = async (): Promise<ActiveAgency | null> => {
    if (!userToken) return null;
    console.log('[AUTH] Refreshing user profile...');
    const agency = await restoreAgencyFromAPI(userToken);
    
    if (agency) {
      await SecureStore.setItemAsync(AGENCY_STORAGE_KEY, JSON.stringify(agency));
      setActiveAgencyState(agency);
      setAuthStateVersion(v => v + 1); // Trigger update
    }
    
    return agency;
  };

  useEffect(() => {
    const loadSession = async () => {
      console.log('[AUTH] App startup — loading session...');
      try {
        const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
        console.log('[AUTH] Token in storage:', token ? '✅ found' : '❌ none');

        if (token) {
          setUserToken(token);

          const storedAgency = await SecureStore.getItemAsync(AGENCY_STORAGE_KEY);
          if (storedAgency) {
            try {
              const parsedAgency = JSON.parse(storedAgency);
              console.log('[AUTH] ✅ Found agency in local storage:', parsedAgency.name);
              setActiveAgencyState(parsedAgency);
            } catch (e) {
              console.error('[AUTH] Failed to parse stored agency:', e);
            }
          }

          setIsLoading(false);
          console.log('[AUTH] isLoading → false (UI can render now)');

          restoreAgencyFromAPI(token).then(agency => {
            if (agency) {
              console.log('[AUTH] Background API sync completed:', agency.name);
              
              const currentAgencyId = activeAgency?.id;
              if (currentAgencyId !== agency.id) {
                console.log('[AUTH] API has different agency, updating...');
                SecureStore.setItemAsync(AGENCY_STORAGE_KEY, JSON.stringify(agency)).then(() => {
                  setActiveAgencyState(agency);
                  setAuthStateVersion(v => v + 1); // Trigger update
                });
              }
            } else {
              console.log('[AUTH] Background API sync found no agency');
              if (storedAgency) {
                console.log('[AUTH] Clearing stale agency data');
                SecureStore.deleteItemAsync(AGENCY_STORAGE_KEY).then(() => {
                  setActiveAgencyState(null);
                  setAuthStateVersion(v => v + 1); // Trigger update
                });
              }
            }
          }).catch(err => {
            console.error('[AUTH] Background API sync error:', err);
          });

        } else {
          await SecureStore.deleteItemAsync(AGENCY_STORAGE_KEY);
          setActiveAgencyState(null);
          setIsLoading(false);
          console.log('[AUTH] isLoading → false (no token)');
        }
      } catch (e) {
        console.error('[AUTH] Failed to load session:', e);
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const setActiveAgency = async (agency: ActiveAgency | null) => {
    try {
      if (agency) {
        await SecureStore.setItemAsync(AGENCY_STORAGE_KEY, JSON.stringify(agency));
      } else {
        await SecureStore.deleteItemAsync(AGENCY_STORAGE_KEY);
      }
      setActiveAgencyState(agency);
      setAuthStateVersion(v => v + 1); // Trigger update
      console.log('[AUTH] setActiveAgency called:', agency ? agency.name : 'null');
    } catch (e) {
      console.error('[AUTH] Failed to persist active agency:', e);
    }
  };

  const signIn = async (token: string): Promise<ActiveAgency | null> => {
    console.log('[AUTH] signIn called — saving token to storage...');
    try {
      const tokenString = typeof token === 'string' ? token : JSON.stringify(token);

      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, tokenString);
      setUserToken(tokenString);

      console.log('[AUTH] Checking API for registered agency...');
      const agency = await restoreAgencyFromAPI(tokenString);

      if (agency) {
        await SecureStore.setItemAsync(AGENCY_STORAGE_KEY, JSON.stringify(agency));
        setActiveAgencyState(agency);
      }

      setAuthStateVersion(v => v + 1); // Trigger update
      console.log('[AUTH] Agency resolved from API:', agency ? agency.name : 'null');
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

      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
      await SecureStore.deleteItemAsync(AGENCY_STORAGE_KEY);

      setUserToken(null);
      setActiveAgencyState(null);
      setAuthStateVersion(v => v + 1); // Force layout to re-check

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
        refreshUserProfile,
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