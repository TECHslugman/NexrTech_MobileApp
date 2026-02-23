// app/_layout.tsx
import { useEffect, useRef } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator, Text, StyleSheet, Platform, Alert } from "react-native";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Config } from './config';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <View style={[styles.toastContainer, styles.successBg]}>
      <View style={[styles.iconContainer, styles.successIconBg]}>
        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
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
        <Ionicons name="close-circle" size={20} color="#EF4444" />
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
        <Ionicons name="information-circle" size={20} color="#769FCD" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>{text1}</Text>
        {text2 ? <Text style={styles.subText}>{text2}</Text> : null}
      </View>
    </View>
  ),
};

function RootLayoutNav() {
  // ← also pull activeAgency from context
  const { userToken, isLoading, activeAgency } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const savePushTokenToBackend = async (token: string) => {
    if (!userToken) return;
    try {
      await fetch(`${Config.API_BASE_URL}/students/students/update-push-token`, {
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
        if (userToken) {
          savePushTokenToBackend(token);
        }
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification Received:", notification);
      const { title, body } = notification.request.content;
      Toast.show({
        type: 'info',
        text1: title || 'New Update',
        text2: body || 'Check your document checklist.',
        onPress: () => router.push('/(app)/agency/selected/documents/upload')
      });
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification Tapped:", response);
      const data = response.notification.request.content.data;
      if (data?.screen === 'documents' || data?.type === 'CHECKLIST_UPDATE') {
        router.push('/(app)/agency/selected/documents/upload');
      }
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [userToken]);

  useEffect(() => {
    // Wait until auth + agency are fully resolved before making any routing decision
    if (isLoading) return;

    const inAuthGroup = (segments as string[]).includes("auth");
    console.log('[LAYOUT] routing effect fired — userToken:', userToken ? '✅' : '❌', '| activeAgency:', activeAgency?.name ?? 'null', '| inAuthGroup:', inAuthGroup);

    if (!userToken) {
      // Not logged in — send to auth
      if (!inAuthGroup) router.replace("/auth/register");
      return;
    }

    // Logged in but still on an auth screen — redirect into the app
    if (inAuthGroup) {
      if (activeAgency?.id) {
        // Student already has an agency — go straight to their home
        router.replace({
          pathname: `/agency/selected/${activeAgency.id}` as any,
          params: { name: activeAgency.name, agencyLogo: activeAgency.logo },
        });
      } else {
        // New user or no agency selected yet — go to decision page
        router.replace("/(app)/decision");
      }
    }
  }, [userToken, isLoading, activeAgency, segments]);

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
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: Platform.OS === 'ios' ? 0 : 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0,
  },
  successBg: {
    backgroundColor: '#FAFFFE',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  errorBg: {
    backgroundColor: '#FFFBFB',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  infoBg: {
    backgroundColor: '#FAFCFF',
    borderWidth: 1,
    borderColor: '#E0EDFF',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  successIconBg: { backgroundColor: '#ECFDF5' },
  errorIconBg: { backgroundColor: '#FEF2F2' },
  infoIconBg: { backgroundColor: '#EFF6FF' },
  textContainer: { flex: 1, justifyContent: 'center' },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  subText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
    letterSpacing: -0.1,
  }
});