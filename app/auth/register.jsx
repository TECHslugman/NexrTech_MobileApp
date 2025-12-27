import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    Image,
    ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
// Import the Native Google Sign-in components
import {
    GoogleSignin,
    statusCodes
} from '@react-native-google-signin/google-signin';

export default function RegisterScreen() {
    const { signIn } = useAuth();
    const router = useRouter();
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const API_BASE_URL = "https://edu-agent-backend-lfzq.vercel.app/api/auth/user";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // --- State Management ---
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [emailtouch, setEmailTouched] = useState(false);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    // --- Validation Logic ---
    const isEmailValid = emailRegex.test(email);
    const showEmailError = emailtouch && !isEmailValid && email.length > 0;
    const passwordIsValid = password.length >= 8;
    const allValid = fullName && email && isEmailValid && passwordIsValid;

    // --- 1. Initialize Google Sign-In ---
    useEffect(() => {
        GoogleSignin.configure({
            // Use your Web Client ID here (crucial for getting idToken)
            webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
            offlineAccess: true,
        });
    }, []);

    // --- 2. Google Sign-In Handler ---
    const handleGoogleSignUp = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();

            // The token is located inside userInfo.data (v11+) or userInfo (older)
            const idToken = userInfo.data?.idToken || userInfo.idToken;

            if (idToken) {
                setIsGoogleLoading(true);
                console.log(" Token found, calling backend...");
                await handleBackendGoogleSignIn(idToken);
            }
        } catch (error) {
            setIsGoogleLoading(false);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log("User cancelled the login flow");
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log("Sign-in is already in progress");
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                console.log("Play services not available or outdated");
            } else {
                console.log("Google Sign-In error:", error);
            }
        }
    };

    // --- 3. Backend Integration ---
    const handleBackendGoogleSignIn = async (idtoken) => {
        try {
            console.log("Sending token to backend...");
            const res = await fetch("https://o-auth-three.vercel.app/auth/mobile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_token: idtoken }), // Sending the idToken to backend
            });
            console.log("Backend Status:", res.status);
            const data = await res.json();
            console.log("Backend Response Data:", data);
            if (res.ok) {
                console.log("SUCCESS: Attempting to navigate to dashboard...");
                const tokenToStore = data.token || idtoken;
                await signIn(tokenToStore);
                try {
                    router.replace("/(app)/dummydash");
                } catch (navError) {
                    console.log("Navigation to dashboard failed. ", navError);
                }

            } else {
                setIsGoogleLoading(false);
                console.log("Backend verification failed:", data.message);
            }
        } catch (e) {
            console.log("Backend Connection error:", e);
        }
    };

    // --- Standard Registration Handler ---
    const handleRegister = async () => {
        if (!allValid) return;
        try {
            const res = await fetch(`${API_BASE_URL}/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: fullName,
                    email,
                    password,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                console.log("Register error:", errorData);
                return;
            }

            router.replace({
                pathname: "/auth/verify_register",
                params: { email },
            });
        } catch (e) {
            console.log("Register request failed:", e);
        }
    };

    const getInputBorderColor = (field) =>
        focusedField === field ? "#B9D7EA" : "#E2E8F0";

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create an Account</Text>

            {/* Name Input */}
            <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                    style={[styles.input, { borderColor: getInputBorderColor("name") }]}
                    placeholder="Enter your Full Name"
                    placeholderTextColor="#969389"
                    value={fullName}
                    onChangeText={setFullName}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                />
            </View>

            {/* Email Input */}
            <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={[
                        styles.input,
                        { borderColor: showEmailError ? '#E53E3E' : getInputBorderColor("email") },
                    ]}
                    placeholder="Enter your Email"
                    placeholderTextColor="#969389"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => {
                        setFocusedField(null);
                        setEmailTouched(true);
                    }}
                />
                {showEmailError && (
                    <Text style={styles.errorText}>Please enter a valid email address</Text>
                )}
            </View>

            {/* Password Input */}
            <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.passwordWrapper, { borderColor: getInputBorderColor("password") }]}>
                    <TextInput
                        style={styles.passwordInput}
                        placeholder="Enter your Password"
                        placeholderTextColor="#969389"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                    />
                    <Pressable
                        style={styles.eyeIconWrapper}
                        onPress={() => setShowPassword((prev) => !prev)}
                    >
                        <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color="#A0AEC0"
                        />
                    </Pressable>
                </View>
                <View style={styles.passwordHintRow}>
                    <View style={[styles.bullet, passwordIsValid && { backgroundColor: "#38A169" }]} />
                    <Text style={[styles.passwordHintText, passwordIsValid && { color: "#38A169" }]}>
                        At least 8 characters
                    </Text>
                </View>
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
            </View>

            {/* Native Google Button */}
            <TouchableOpacity
                style={[
                    styles.googleButton,
                    isGoogleLoading && { opacity: 0.7 } // Dim button when loading
                ]}
                activeOpacity={0.85}
                onPress={handleGoogleSignUp}
                disabled={isGoogleLoading} // 3. Disable button while loading
            >
                {isGoogleLoading ? (
                    <ActivityIndicator color="#4A5568" /> // 4. Show spinner
                ) : (
                    <>
                        <Image
                            source={require("../../assets/images/google-logo.png")}
                            style={styles.googleLogo}
                            resizeMode="contain"
                        />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Create Account Button */}
            <TouchableOpacity
                style={[
                    styles.primaryButton,
                    allValid && { backgroundColor: "#769FCD" },
                ]}
                activeOpacity={allValid ? 0.9 : 1}
                onPress={handleRegister}
            >
                <Text style={styles.primaryButtonText}>CREATE ACCOUNT</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
                By continuing, you agree to our{" "}
                <Text style={styles.footerLinkText}>Terms of Service</Text> {"\n"} and{" "}
                <Text style={styles.footerLinkText}>Privacy Policy</Text>.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container:
        { flex: 1, backgroundColor: "#F7FAFC", paddingHorizontal: 24, paddingTop: 80 },
    title:
        { fontSize: 25, fontWeight: "600", color: "#769FCD", textAlign: "center", marginBottom: 40 },
    field:
        { marginBottom: 20 },
    label:
        { fontSize: 14, color: "#4A5568", marginBottom: 8 },
    input: { backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#2D3748" },
    passwordWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1 },
    passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#2D3748" },
    eyeIconWrapper: { paddingHorizontal: 12 },
    passwordHintRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#A0AEC0", marginRight: 6 },
    passwordHintText: { fontSize: 12, color: "#A0AEC0" },
    dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
    divider: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
    dividerText: { marginHorizontal: 8, fontSize: 16, color: "#A0AEC0" },
    googleButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", paddingVertical: 12, marginBottom: 20 },
    googleLogo: { width: 20, height: 20, marginRight: 10 },
    googleButtonText: { fontSize: 16, color: "#4A5568" },
    primaryButton: { backgroundColor: "#4A4A4A", borderRadius: 24, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
    primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
    footerText: { fontSize: 11, color: "#A0AEC0", textAlign: "center", marginTop: 6 },
    footerLinkText: { color: "#7185A8", textDecorationLine: "underline" },
    errorText: { color: "#E53E3E", fontSize: 12, marginTop: 4 }
});