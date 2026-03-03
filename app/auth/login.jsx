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
    ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

    /**
     * Central post-login navigation.
     * If the student already has an agency → go straight to their agency home.
     * If not → go to decision page to pick one.
     */
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

            const responseText = await res.text();
            const data = JSON.parse(responseText);

            if (res.ok) {
                console.log("Login success:", data.message);
                // signIn now returns the resolved agency (or null for new users)
                const agency = await signIn(data.accessToken);
                navigateAfterLogin(agency);
            } else {
                alert(data.message || "Login failed");
            }
        } catch (error) {
            console.error("Login error detail:", error);
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
            const res = await fetch("https://edu-agent-backend.vercel.app/google-signin-student", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_token: idtoken }),
            });
            console.log("Google ID Token:", idtoken);

            const data = await res.json();

            if (res.ok) {
                // signIn returns resolved agency — use it to route correctly
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
                    onBlur={() => {
                        setEmailTouched(true);
                        setFocusedField(null);
                    }}
                />
                {emailerror && (
                    <Text style={{ color: "#E53E3E", fontSize: 12, marginTop: 4 }}>
                        Please enter valid email address
                    </Text>
                )}
            </View>

            {/* Password */}
            <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View
                    style={[
                        styles.passwordWrapper,
                        { borderColor: getInputBorderColor("password") },
                    ]}
                >
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

                <Text
                    style={styles.forgotText}
                    onPress={() => router.push("/auth/forget_password")}
                >
                    Forgot password?
                </Text>

                <View style={styles.passwordHintRow}>
                    <View
                        style={[
                            styles.bullet,
                            passwordIsValid && { backgroundColor: "#38A169" },
                        ]}
                    />
                    <Text
                        style={[
                            styles.passwordHintText,
                            passwordIsValid && { color: "#38A169" },
                        ]}
                    >
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
                <Text style={styles.footerLinkText}>Terms of Service</Text> {"\n"} and{" "}
                <Text style={styles.footerLinkText}>Privacy Policy</Text>.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F7FAFC",
        paddingHorizontal: 24,
        paddingTop: 150,
    },
    title: {
        fontSize: 25,
        fontWeight: "600",
        color: "#769FCD",
        textAlign: "center",
        marginBottom: 56,
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: "#4A5568",
        marginBottom: 12,
    },
    input: {
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: "#2D3748",
    },
    passwordWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        borderWidth: 1,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: "#2D3748",
    },
    eyeIconWrapper: {
        paddingHorizontal: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    forgotText: {
        marginTop: 3,
        fontSize: 12,
        color: "#718096",
        textAlign: "right",
        textDecorationLine: "underline",
    },
    passwordHintRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#A0AEC0",
        marginRight: 6,
    },
    passwordHintText: {
        fontSize: 12,
        color: "#A0AEC0",
    },
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 18,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: "#E2E8F0",
    },
    dividerText: {
        marginHorizontal: 8,
        fontSize: 16,
        color: "#A0AEC0",
    },
    googleButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingVertical: 12,
        marginBottom: 173,
    },
    googleLogo: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
    googleButtonText: {
        fontSize: 16,
        color: "#4A5568",
    },
    primaryButton: {
        backgroundColor: "#4A4A4A",
        borderRadius: 24,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 12,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
    footerText: {
        fontSize: 11,
        color: "#A0AEC0",
        textAlign: "center",
        marginTop: 6,
        lineHeight: 16,
    },
    footerLinkText: {
        color: "#7185A8",
        textDecorationLine: "underline",
    },
});