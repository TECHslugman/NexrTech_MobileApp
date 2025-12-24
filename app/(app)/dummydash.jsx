// app/(app)/dummydash.jsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Simulating a fetch to your Vercel backend
    const getProfile = async () => {
      try {
        const token = await SecureStore.getItemAsync("userToken");
        
        // This is where you'd call your actual API
        // const res = await fetch('https://your-api.com/profile', {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        
        // Dummy data for now
        setUserData({ name: "Pradeep", role: "Student" });
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, []);

  const handleLogout = async () => {
    try {
      // 1. Remove the token from storage
      await SecureStore.deleteItemAsync("userToken");
      
      // 2. Redirect to auth group
      // Your Auth Guard in _layout.tsx will detect the missing token
      // and prevent the user from coming back here.
      router.replace("/auth/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#769FCD" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{userData?.name || "User"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Dashboard</Text>
        <Text style={styles.cardInfo}>Role: {userData?.role}</Text>
        <Text style={styles.cardStatus}>Status: Verified ✓</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>LOGOUT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAFC",
    padding: 24,
    justifyContent: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 18,
    color: "#718096",
  },
  nameText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D3748",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 40,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4A5568",
    marginBottom: 10,
  },
  cardInfo: {
    fontSize: 14,
    color: "#718096",
    marginBottom: 5,
  },
  cardStatus: {
    fontSize: 14,
    color: "#38A169",
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#E53E3E",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    letterSpacing: 1,
  },
});