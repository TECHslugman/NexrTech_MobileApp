// app/_layout.tsx
import { useEffect, useRef } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator, Text, StyleSheet, Platform, Alert } from "react-native";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Config } from './config';

// --- 1. CLEANED UP IMPORTS ---
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// --- 2. FIXED NOTIFICATION HANDLER ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, 
    shouldShowList: true,
  }),
});

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

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // --- NEW: Helper to sync token with your backend ---
  const savePushTokenToBackend = async (token: string) => {
    if (!userToken) return;
    try {
      await fetch(`${Config.API_BASE_URL}/students/update-push-token`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pushToken: token }),
      });
      console.log("✅ Push token synced with backend");
    } catch (error) {
      console.error("❌ Failed to sync push token:", error);
    }
  };

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log("**************************************");
        console.log("YOUR EXPO PUSH TOKEN:", token);
        console.log("**************************************");
        
        // Sync token if user is logged in
        if (userToken) {
          savePushTokenToBackend(token);
        }
      }
    });

    // Handle notification Received while app is OPEN
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification Received:", notification);
      
      const { title, body } = notification.request.content;
      Toast.show({
        type: 'info',
        text1: title || 'New Update',
        text2: body || 'Check your document checklist.',
        onPress: () => router.push('/(app)/agency/selected/documents/upload') // Route to your swipeable screen
      });
    });

    // Handle notification Tapped
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification Tapped:", response);
      
      const data = response.notification.request.content.data;
      // Navigate if backend sends the instruction
      if (data?.screen === 'documents' || data?.type === 'CHECKLIST_UPDATE') {
        router.push('/(app)/agency/selected/documents/upload');
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userToken]); // Re-run when userToken changes to sync the token

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = (segments as string[]).includes("auth");
    if (!userToken) {
      if (!inAuthGroup) router.replace("/auth/register");
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
      <Toast config={toastConfig} />
    </>
  );
}

async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Error', 'Failed to get push token for push notification!');
      return;
    }
    
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      console.error("Project ID not found in app.json.");
      return;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      console.error("Error fetching Expo token:", e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }
  return token;
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  successBg: { backgroundColor: '#F0F9F5', borderLeftWidth: 4, borderLeftColor: '#10B981' },
  errorBg: { backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  infoBg: { backgroundColor: '#E8F1FF', borderLeftWidth: 4, borderLeftColor: '#769FCD' },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    elevation: 3,
  },
  successIconBg: { backgroundColor: '#10B981' },
  errorIconBg: { backgroundColor: '#EF4444' },
  infoIconBg: { backgroundColor: '#769FCD' },
  textContainer: { flex: 1, justifyContent: 'center' },
  titleText: { fontSize: 15, fontWeight: '600', color: '#2D3748' },
  subText: { fontSize: 13, color: '#718096', marginTop: 4, lineHeight: 18 }
});