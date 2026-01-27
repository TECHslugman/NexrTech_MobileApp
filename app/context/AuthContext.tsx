import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added for chat cleanup
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import socketService from '../services/SocketService'; // Import your updated service

// Define the Agency shape
interface ActiveAgency {
  id: string;
  name: string;
  logo: string;
}

interface AuthContextType {
  userToken: string | null;
  isLoading: boolean;
  activeAgency: ActiveAgency | null;
  setActiveAgency: (agency: ActiveAgency | null) => void;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAgency, setActiveAgency] = useState<ActiveAgency | null>(null); 

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        setUserToken(token);
      } catch (e) {
        console.error("Failed to load token from storage", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const signIn = async (token: string) => {
    try {
      await SecureStore.setItemAsync('userToken', token);
      setUserToken(token);
    } catch (e) {
      console.error("Error saving session", e);
      throw e;
    }
  };

  const signOut = async () => {
    try {
      // 1. DISCONNECT SOCKET: Clears listeners, token, and connection in memory
      console.log("🧹 Cleaning up socket connection...");
      socketService.disconnect();

      // 2. CLEAR LOCAL CHAT CACHE: Prevents the next user from seeing old message previews
      // You can also use user-specific keys if you prefer, 
      // but clearing on logout is the safest "clean slate" approach.
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(key => key.includes('metadata') || key.includes('conversations'));
      if (chatKeys.length > 0) {
        await AsyncStorage.multiRemove(chatKeys);
      }

      // 3. AUTH LOGOUT
      await GoogleSignin.signOut();
      await SecureStore.deleteItemAsync('userToken');
      
      setUserToken(null);
      setActiveAgency(null); 
      
      console.log("✅ Logout complete: Socket disconnected and storage cleared.");
    } catch (e) {
      console.error("Error during logout", e);
    }
  };

  return (
    <AuthContext.Provider value={{ 
        userToken, 
        isLoading, 
        activeAgency,    
        setActiveAgency, 
        signIn, 
        signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthProvider;