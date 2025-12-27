// app/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// 1. Define the shape of our Auth state
interface AuthContextType {
  userToken: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// 2. Create the Context with a null default
const AuthContext = createContext<AuthContextType | null>(null);

// 3. Create the Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load the token from storage when the app first boots up
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

  // Use this function during Login
  const signIn = async (token: string) => {
    try {
      await SecureStore.setItemAsync('userToken', token);
      setUserToken(token);
      console.log("Token saved successfully");
    } catch (e) {
      console.error("Error saving session", e);
      throw e; // Pass error up to the UI if needed
    }
  };

  // Use this function for Logout
  const signOut = async () => {
    try {
      // 1. Clear Google's internal session (This forces the account picker next time)
      await GoogleSignin.signOut();

      // 2. Remove the token from your app's storage
      await SecureStore.deleteItemAsync('userToken');

      // 3. Update state to trigger redirect to Register screen
      setUserToken(null);

      console.log("Logged out from App and Google");
    } catch (e) {
      console.error("Error during logout", e);
    }
  };

  return (
    <AuthContext.Provider value={{ userToken, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// 4. Create a custom hook for easy access in screens
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
