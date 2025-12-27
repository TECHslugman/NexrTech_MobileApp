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
    // Wait until the AuthProvider has finished checking SecureStore
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!userToken && !inAuthGroup) {
      // If NOT logged in and NOT in auth folder -> Go to Login
      router.replace("/auth/register");
    } else if (userToken && inAuthGroup) {
      // If logged in and TRYING to go to login/register -> Go to Dashboard
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