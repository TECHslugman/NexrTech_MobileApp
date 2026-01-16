import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Define the Agency shape
interface ActiveAgency {
  id: string;
  name: string;
  logo: string;
}

interface AuthContextType {
  userToken: string | null;
  isLoading: boolean;
  activeAgency: ActiveAgency | null; // Added
  setActiveAgency: (agency: ActiveAgency | null) => void; // Added
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // New state for the selected agency
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
      await GoogleSignin.signOut();
      await SecureStore.deleteItemAsync('userToken');
      setUserToken(null);
      setActiveAgency(null); // Clear agency on logout
    } catch (e) {
      console.error("Error during logout", e);
    }
  };

  return (
    <AuthContext.Provider value={{ 
        userToken, 
        isLoading, 
        activeAgency,    // Expose this
        setActiveAgency, // Expose this
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