// app/create-password.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CreatePasswordScreen() {
  const API_BASE_URL ='https://edu-agent-backend-bplxyxizo-dendups-projects.vercel.app/api/auth/user/password-reset';
  const router = useRouter();
  const { resetToken } = useLocalSearchParams();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const isActive = useMemo(
    () => password.length > 0 && confirm.length > 0 && password === confirm,
    [password, confirm],
  );

  const handleContinue = async () => {
    if (!isActive || loading) return;

    if (!resetToken) {
      Alert.alert(
        'Error',
        'Reset token is missing. Please restart the forgot password process.',
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/set-new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken: resetToken,
          newPassword: password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert('Success', 'Password reset successful!', [
          { text: 'OK', onPress: () => router.replace('/auth/login') },
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to reset password');
      }
    } catch (e) {
      console.error('Error resetting password:', e);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Create New Password</Text>

      {/* New Password */}
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
            onPress={() => setShowPwd(p => !p)}
          >
            <Ionicons
              name={showPwd ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#769FCD"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Password */}
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
            onPress={() => setShowConfirm(p => !p)}
          >
            <Ionicons
              name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#769FCD"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleContinue}
        disabled={!isActive || loading}
        style={[
          styles.button,
          { backgroundColor: isActive ? '#769FCD' : '#5E5C58' },
          loading && { opacity: 0.8 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>CONTINUE</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFF', // light background like design
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#769FCD',
    marginTop: 83,
    marginBottom: 36,
  },
  fieldGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    color: '#5E5C58',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 8,
    borderWidth: 0.7,
    borderColor: '#769FCD',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  iconWrapper: {
    paddingLeft: 8,
  },
  button: {
    marginBottom: 1,
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 36,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    letterSpacing: 1,
    fontWeight: '600',
  },
});
