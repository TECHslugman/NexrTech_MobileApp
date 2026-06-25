import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
    View,
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    Image,
    ActivityIndicator,
    Dimensions,
    PixelRatio,
} from "react-native";
import { Config, config } from '../config.js';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// ─── Responsive helpers ───────────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BASE_W = 390;

const rs = (size, min, max) => {
    const s = Math.round(PixelRatio.roundToNearestPixel((SCREEN_W / BASE_W) * size));
    if (min !== undefined && s < min) return min;
    if (max !== undefined && s > max) return max;
    return s;
};

const rf = (size) => {
    const ratio = Math.min(Math.max(SCREEN_W / BASE_W, 0.85), 1.25);
    return Math.round(PixelRatio.roundToNearestPixel(size * ratio));
};

// Height-relative top padding so content sits well on tall/short/tablet screens
const TOP_PAD = Math.round(SCREEN_H * 0.08);
// ─────────────────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
    const { signIn } = useAuth();
    const router = useRouter();
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState("");
    const [phoneTouched, setPhoneTouched] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [emailtouch, setEmailTouched] = useState(false);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const isEmailValid = emailRegex.test(email);
    const isPhoneValid = phone.length === 8;
    const showPhoneError = phoneTouched && !isPhoneValid;
    const showEmailError = emailtouch && !isEmailValid && email.length > 0;
    const passwordIsValid = password.length >= 8;
    const allValid = fullName && email && isEmailValid && passwordIsValid;

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
            offlineAccess: true,
        });
    }, []);

    const navigateAfterLogin = (agency) => {
        if (agency?.id) {
            router.replace({
                pathname: `/agency/selected/${agency.id}`,
                params: { name: agency.name, agencyLogo: agency.logo },
            });
        } else {
            router.replace("/(app)/decision");
        }
    };

    const handleGoogleSignUp = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo.data?.idToken || userInfo.idToken;
            if (idToken) {
                setIsGoogleLoading(true);
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

    const handleBackendGoogleSignIn = async (idtoken) => {
        try {
            const res = await fetch("https://edu-agent-backend-psi.vercel.app/google-signin-student", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_token: idtoken }),
            });
            const data = await res.json();
            if (res.ok) {
                const agency = await signIn(data.accessToken);
                navigateAfterLogin(agency);
            } else {
                setIsGoogleLoading(false);
                console.log("Backend verification failed:", data.message);
            }
        } catch (e) {
            setIsGoogleLoading(false);
            console.log("Backend Connection error:", e);
        }
    };

    const handleRegister = async () => {
        if (!allValid) return;
        setLoading(true);
        try {
            const res = await fetch(Config.url.sendOtp(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: fullName,
                    phone: phone,
                    email: email.toLowerCase().trim(),
                    password: password,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                if (res.status === 409 || data?.message?.includes("already registered")) {
                    Alert.alert(
                        "Account Exists",
                        "This email is already registered. Please login instead.",
                        [{ text: "Login", onPress: () => router.push("/auth/login") }]
                    );
                } else {
                    Alert.alert("Error", data?.message || "Something went wrong.");
                }
                return;
            }
            router.push({ pathname: "/auth/verify_register", params: { email, phone } });
        } catch (e) {
            console.error("Register request failed:", e);
            Alert.alert("Network Error", "Please check your internet connection.");
        } finally {
            setLoading(false);
        }
    };

    const getInputBorderColor = (field) =>
        focusedField === field ? "#B9D7EA" : "#E2E8F0";

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create an Account</Text>

            {/* Name */}
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

            {/* Phone */}
            <View style={styles.field}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={[styles.input, { borderColor: showPhoneError ? '#E53E3E' : getInputBorderColor("phone") }]}
                    placeholder="Enter your Phone Number"
                    placeholderTextColor="#969389"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    onFocus={() => setFocusedField("phone")}
                    onBlur={() => { setFocusedField(null); setPhoneTouched(true); }}
                />
                {showPhoneError && <Text style={styles.errorText}>Please enter a valid phone number</Text>}
            </View>

            {/* Email */}
            <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={[styles.input, { borderColor: showEmailError ? '#E53E3E' : getInputBorderColor("email") }]}
                    placeholder="Enter your Email"
                    placeholderTextColor="#969389"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => { setFocusedField(null); setEmailTouched(true); }}
                />
                {showEmailError && <Text style={styles.errorText}>Please enter a valid email address</Text>}
            </View>

            {/* Password */}
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
                    <Pressable style={styles.eyeIconWrapper} onPress={() => setShowPassword((p) => !p)}>
                        <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={rs(20, 16, 24)}
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

            {/* Google */}
            <TouchableOpacity
                style={[styles.googleButton, isGoogleLoading && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleGoogleSignUp}
                disabled={isGoogleLoading}
            >
                {isGoogleLoading ? (
                    <ActivityIndicator color="#4A5568" />
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

            {/* Create Account */}
            <TouchableOpacity
                style={[styles.primaryButton, allValid && { backgroundColor: "#769FCD" }]}
                activeOpacity={allValid ? 0.9 : 1}
                onPress={handleRegister}
            >
                {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.primaryButtonText}>CREATE ACCOUNT</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchAuthWrapper} onPress={() => router.push("/auth/login")}>
                <Text style={styles.switchAuthText}>
                    Already have an account? <Text style={styles.switchAuthLink}>Login</Text>
                </Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
                By continuing, you agree to our{" "}
                <Text style={styles.footerLinkText}>Terms of Service</Text>{"\n"} and{" "}
                <Text style={styles.footerLinkText}>Privacy Policy</Text>.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F7FAFC",
        paddingHorizontal: rs(24, 16, 48),
        paddingTop: TOP_PAD,
    },
    title: {
        fontSize: rf(25),
        fontWeight: "600",
        color: "#769FCD",
        textAlign: "center",
        marginBottom: rs(40, 28, 52),
        marginTop: rs(30, 20, 40),
    },
    field: {
        marginBottom: rs(20, 14, 28),
    },
    label: {
        fontSize: rf(14),
        color: "#4A5568",
        marginBottom: rs(8, 6, 11),
    },
    input: {
        backgroundColor: "#FFFFFF",
        borderRadius: rs(10, 7, 13),
        borderWidth: 1,
        paddingHorizontal: rs(14, 10, 18),
        paddingVertical: rs(12, 9, 16),
        fontSize: rf(14),
        color: "#2D3748",
    },
    passwordWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: rs(10, 7, 13),
        borderWidth: 1,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: rs(14, 10, 18),
        paddingVertical: rs(12, 9, 16),
        fontSize: rf(14),
        color: "#2D3748",
    },
    eyeIconWrapper: {
        paddingHorizontal: rs(12, 9, 16),
        justifyContent: "center",
        alignItems: "center",
    },
    passwordHintRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: rs(6, 4, 8),
    },
    bullet: {
        width:  rs(6, 5, 8),
        height: rs(6, 5, 8),
        borderRadius: rs(3, 2, 4),
        backgroundColor: "#A0AEC0",
        marginRight: rs(6, 4, 8),
    },
    passwordHintText: {
        fontSize: rf(12),
        color: "#A0AEC0",
    },
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: rs(18, 12, 24),
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: "#E2E8F0",
    },
    dividerText: {
        marginHorizontal: rs(8, 6, 11),
        fontSize: rf(16),
        color: "#A0AEC0",
    },
    googleButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: rs(10, 7, 13),
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingVertical: rs(12, 9, 16),
        marginBottom: rs(20, 14, 28),
    },
    googleLogo: {
        width:  rs(20, 16, 26),
        height: rs(20, 16, 26),
        marginRight: rs(10, 7, 13),
    },
    googleButtonText: {
        fontSize: rf(16),
        color: "#4A5568",
    },
    primaryButton: {
        backgroundColor: "#4A4A4A",
        borderRadius: rs(24, 18, 30),
        paddingVertical: rs(14, 11, 18),
        alignItems: "center",
        marginBottom: rs(12, 8, 16),
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: rf(16),
        fontWeight: "600",
    },
    errorText: {
        color: "#E53E3E",
        fontSize: rf(12),
        marginTop: rs(4, 3, 6),
    },
    switchAuthWrapper: {
        marginTop: rs(20, 14, 28),
        alignItems: "center",
        marginBottom: rs(30, 20, 40),
    },
    switchAuthText: {
        color: "#4A5568",
        fontSize: rf(14),
    },
    switchAuthLink: {
        color: "#769FCD",
        fontWeight: "600",
    },
    footerText: {
        fontSize: rf(11),
        color: "#A0AEC0",
        textAlign: "center",
        marginTop: rs(6, 4, 8),
        lineHeight: rf(16),
    },
    footerLinkText: {
        color: "#7185A8",
        textDecorationLine: "underline",
    },
});