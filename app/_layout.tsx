// app/_layout.tsx
import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { View, ActivityIndicator } from "react-native";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  
  const segments = useSegments(); 
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on app startup
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("userToken");
        setUserToken(token);
      } catch (e) {
        setUserToken(null);
      } finally {
        setIsReady(true);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    // This tells us if the user is currently looking at a screen in the 'auth' folder
    const inAuthGroup = segments[0] === "auth";

    if (!userToken && !inAuthGroup) {
      // If NOT logged in and NOT in auth folder -> Go to Login
      router.replace("/auth/login");
    } else if (userToken && inAuthGroup) {
      // If logged in and TRYING to go to login/register -> Go to Dashboard
      router.replace("/(app)/dummydash");
    }
  }, [userToken, isReady, segments]);

  // Show a loading spinner while we check the storage
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7FAFC" }}>
        <ActivityIndicator size="large" color="#769FCD" />
      </View>
    );
  }

  return <Slot />;
}