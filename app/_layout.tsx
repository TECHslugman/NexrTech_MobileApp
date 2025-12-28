// app/_layout.tsx
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator } from "react-native";
// Ensure this path matches where you saved AuthContext.tsx
import { AuthProvider, useAuth } from "./context/AuthContext";

function RootLayoutNav() {
  const { userToken, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Use .includes to be safer with folder naming conventions
    const inAuthGroup = (segments as string[]).includes("auth");

    if (!userToken) {
      // If NOT logged in, ONLY redirect if they try to access a protected page (like /dummydash)
      if (!inAuthGroup) {
        router.replace("/auth/register");
      }
      // If they are ALREADY in the auth group (Register OR Login), DO NOTHING.
      // This allows them to move between Register and Login freely.
    } else if (userToken && inAuthGroup) {
      // If logged in and in auth folder -> Go to Dashboard
      router.replace("/(app)/dummydash");
    }
  }, [userToken, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7FAFC" }}>
        <ActivityIndicator size="large" color="#769FCD" />
      </View>
    );
  }

  return <Slot />;
}

// This is the main entry point that wraps everything in the Provider
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}