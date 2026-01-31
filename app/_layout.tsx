// app/_layout.tsx
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator, Text, StyleSheet, Platform } from "react-native";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

// --- CUSTOM TOAST DESIGN CONFIG ---
const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <View style={[styles.toastContainer, styles.successBg]}>
      <View style={[styles.iconContainer, styles.successIconBg]}>
        <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>{text1}</Text>
        {text2 ? <Text style={styles.subText}>{text2}</Text> : null}
      </View>
    </View>
  ),
  error: ({ text1, text2 }: any) => (
    <View style={[styles.toastContainer, styles.errorBg]}>
      <View style={[styles.iconContainer, styles.errorIconBg]}>
        <Ionicons name="close-circle" size={22} color="#FFFFFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>{text1}</Text>
        {text2 ? <Text style={styles.subText}>{text2}</Text> : null}
      </View>
    </View>
  ),
  info: ({ text1, text2 }: any) => (
    <View style={[styles.toastContainer, styles.infoBg]}>
      <View style={[styles.iconContainer, styles.infoIconBg]}>
        <Ionicons name="information-circle" size={22} color="#FFFFFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>{text1}</Text>
        {text2 ? <Text style={styles.subText}>{text2}</Text> : null}
      </View>
    </View>
  ),
};

function RootLayoutNav() {
  const { userToken, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments as string[]).includes("auth");

    if (!userToken) {
      if (!inAuthGroup) {
        router.replace("/auth/register");
      }
    } else if (userToken && inAuthGroup) {
      router.replace("/(app)/decision");
    }
  }, [userToken, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7FAFC" }}>
        <ActivityIndicator size="large" color="#769FCD" />
      </View>
    );
  }

  return (
    <>
      <Slot />
      {/* 3. Pass the custom config here */}
      <Toast config={toastConfig} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: Platform.OS === 'ios' ? 0 : 10,
    // Premium shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  successBg: {
    backgroundColor: '#F0F9F5',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  errorBg: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  infoBg: {
    backgroundColor: '#E8F1FF',
    borderLeftWidth: 4,
    borderLeftColor: '#769FCD',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    // Icon shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successIconBg: {
    backgroundColor: '#10B981',
  },
  errorIconBg: {
    backgroundColor: '#EF4444',
  },
  infoIconBg: {
    backgroundColor: '#769FCD',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    letterSpacing: 0.2,
  },
  subText: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
    lineHeight: 18,
  }
});