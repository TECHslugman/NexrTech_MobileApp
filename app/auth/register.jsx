// app/auth/register.jsx
import React, { useState } from "react";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";


export default function RegisterScreen() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [emailtouch, setEmailTouched] = useState(false);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [focusedField, setFocusedField] = useState(null); // 'name' | 'email' | 'password'

    const isEmailValid = emailRegex.test(email);
    const showEmailError = emailtouch && !isEmailValid && email.length > 0;
    const passwordIsValid = password.length >= 8;
    const allValid = fullName && email && isEmailValid && passwordIsValid;

    const handleRegister = () => {
        if (!allValid) return;
        console.log({ fullName, email, password });
        router.replace({
            pathname: "/auth/verify_register",
            params: {email},
        });
    };

    const handleGoogleSignUp = () => {
        console.log("Continue with Google");
    };

    const getInputBorderColor = (field) =>
        focusedField === field ? "#B9D7EA" : "#E2E8F0";

    return (
        <View style={styles.container}>
            {/* Title */}
            <Text style={styles.title}>Create an Account</Text>

            {/* Name */}
            <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                    style={[
                        styles.input,
                        { borderColor: getInputBorderColor("name") },
                    ]}
                    placeholder="Enter your Full Name"
                    placeholderTextColor="#969389"
                    value={fullName}
                    onChangeText={setFullName}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                />
            </View>

            {/* Email */}
            <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={[
                        styles.input,
                        showEmailError ? styles.inputError : null,
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
                    <Text style={{ color: "#E53E3E", fontSize: 12, marginTop: 4 }}>Please enter valid email adress</Text>
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

            {/* Google button with real colored icon style */}
            <TouchableOpacity
                style={styles.googleButton}
                activeOpacity={0.85}
                onPress={handleGoogleSignUp}
            >
                <Image
                    source={require("../../assets/images/google-logo.png")} // adjust path
                    style={styles.googleLogo}
                    resizeMode="contain"
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>


            {/* Create Account button */}
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

            {/* Footer */}
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
    },
    passwordHintRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
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
        marginBottom: 66,
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
