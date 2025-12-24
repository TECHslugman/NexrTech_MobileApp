// app/create-password.tsx  (Expo Router)
// or use inside a normal React Navigation stack screen component

import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CreatePasswordScreen() {
  const API_BASE_URL = "https://edu-agent-backend-lfzq.vercel.app/api/auth/user/password-reset";
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isActive = useMemo(
    () => password.length > 0 && confirm.length > 0,
    [password, confirm]
  );

  const handleContinue = async () => {
    if (!isActive) return;
     try {
        const res = await fetch(`${API_BASE_URL}/set-new`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password, confirm }),
        });
         
        const data = await res.json();

        if (res.ok) {
            alert("Password reset successful:", data.message);
            router.push('/auth/login'); 
        } else {
            alert(data.message || "Failed to reset password");
        }
    } catch (e) {
        console.error("Error resetting password:", e);
        alert("An error occurred. Please try again.");
    }
    
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Password</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>New Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showPwd}
            onChangeText={setPassword}
            value={password}
          />
          <TouchableOpacity
            style={styles.iconWrapper}
            onPress={() => setShowPwd((p) => !p)}
          >
            <Ionicons
              name={showPwd ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="#769FCD"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showConfirm}
            onChangeText={setConfirm}
            value={confirm}
          />
          <TouchableOpacity
            style={styles.iconWrapper}
            onPress={() => setShowConfirm((p) => !p)}
          >
            <Ionicons
              name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="#769FCD"
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleContinue}
        style={[
          styles.button,
          { backgroundColor: isActive ? '#769FCD' : '#5E5C58' },
        ]}
      >
        <Text style={styles.buttonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFF', 
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#769FCD',
    marginBottom: 40,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: '#5E5C58',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D3D3D3',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  iconWrapper: {
    paddingLeft: 8,
  },
  button: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 40,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 1,
    fontSize: 14,
  },
});
