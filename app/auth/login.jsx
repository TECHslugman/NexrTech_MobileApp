// app/auth/login.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";
import { Config } from "../config";
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import {
    View,
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
import { Ionicons } from "@expo/vector-icons";

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

// Responsive top padding — scales with screen height so content sits well on
// tall phones, compact phones, and tablets alike
const TOP_PAD = Math.round(SCREEN_H * 0.18);

// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
    const { signIn } = useAuth();
    const router = useRouter();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const [email, setEmail] = useState("");
    const [emailtouch, setEmailTouched] = useState(false);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const isemailvalid = emailRegex.test(email);
    const passwordIsValid = password.length >= 8;
    const emailerror = emailtouch && !isemailvalid && email.length > 0;
    const allValid = email && isemailvalid && passwordIsValid;

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

    const handleLogin = async () => {
        if (!allValid || loading) return;
        setLoading(true);
        try {
            const res = await fetch(Config.url.login(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = JSON.parse(await res.text());
            if (res.ok) {
                const agency = await signIn(data.accessToken);
                navigateAfterLogin(agency);
            } else {
                alert(data.message || "Login failed");
            }
        } catch (error) {
            alert("Server returned an invalid response.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
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

    const getInputBorderColor = (field) =>
        focusedField === field ? "#B9D7EA" : "#E2E8F0";

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            {/* Email */}
            <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={[
                        styles.input,
                        { borderColor: emailerror ? "#E53E3E" : getInputBorderColor("email") },
                    ]}
                    placeholder="Enter your Email"
                    placeholderTextColor="#969389"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => { setEmailTouched(true); setFocusedField(null); }}
                />
                {emailerror && (
                    <Text style={styles.emailError}>Please enter valid email address</Text>
                )}
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

                <Text style={styles.forgotText} onPress={() => router.push("/auth/forget_password")}>
                    Forgot password?
                </Text>

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

            {/* Google button */}
            <TouchableOpacity
                style={[styles.googleButton, isGoogleLoading && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleGoogleSignIn}
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

            {/* Login button */}
            <TouchableOpacity
                style={[
                    styles.primaryButton,
                    allValid && !loading && { backgroundColor: "#769FCD" },
                    loading && { opacity: 0.7 },
                ]}
                disabled={!allValid || loading}
                onPress={handleLogin}
            >
                {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.primaryButtonText}>LOGIN</Text>
                )}
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
        marginBottom: rs(56, 36, 72),
    },
    field: {
        marginBottom: rs(20, 14, 28),
    },
    label: {
        fontSize: rf(14),
        color: "#4A5568",
        marginBottom: rs(12, 8, 16),
    },
    input: {
        backgroundColor: "#FFFFFF",
        borderRadius: rs(10, 7, 13),
        borderWidth: 1,
        paddingHorizontal: rs(14, 10, 18),
        paddingVertical: rs(10, 8, 14),
        fontSize: rf(14),
        color: "#2D3748",
    },
    emailError: {
        color: "#E53E3E",
        fontSize: rf(12),
        marginTop: rs(4, 3, 6),
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
        paddingVertical: rs(10, 8, 14),
        fontSize: rf(14),
        color: "#2D3748",
    },
    eyeIconWrapper: {
        paddingHorizontal: rs(12, 9, 16),
        justifyContent: "center",
        alignItems: "center",
    },
    forgotText: {
        marginTop: rs(3, 2, 5),
        fontSize: rf(12),
        color: "#718096",
        textAlign: "right",
        textDecorationLine: "underline",
    },
    passwordHintRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: rs(4, 3, 6),
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
        // Original had a large fixed marginBottom to push the login button down.
        // Use flex-based spacing via the container instead — avoids overflow on small screens.
        marginBottom: rs(24, 16, 36),
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
        letterSpacing: 0.5,
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