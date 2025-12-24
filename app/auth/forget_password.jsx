// app/auth/forget_password.jsx
import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { router } from "expo-router";

export default function ForgetPasswordScreen() {
    const [email, setEmail] = useState("");
    const API_BASE_URL = "https://edu-agent-backend-lfzq.vercel.app/api/auth/user/password-reset";
    const handleSendLink = async () => {
        if (!email || !email.includes("@")) {
            alert("Please enter a valid email address");
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                console.log("OTP sent successfully:", data.message);
                router.replace({
                    pathname: "/auth/verify_forget_password",
                    params: { email }
                });
            } else {
                alert(data.message || "Failed to send OTP");
            }
        }catch(e) {
            console.error("Error sending OTP:", e);
            alert("An error occurred. Please try again.");
        }

    
  };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.content}>
                {/* Title */}
                <Text style={styles.title}>Forgot Password?</Text>

                {/* Description */}
                <Text style={styles.description}>
                    Enter your email address. We will sent a{"\n"}
                    link to retrieve your account
                </Text>

                {/* Email field */}
                <View style={styles.field}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor="#969389"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>
                </View>

                {/* Send link button */}
                <TouchableOpacity style={styles.button} onPress={handleSendLink}>
                    <Text style={styles.buttonText}>SEND LINK</Text>
                </TouchableOpacity>

                {/* Terms text */}
                <Text style={styles.footerText}>
                    By continuing, you agree to our{" "}
                    <Text style={styles.link}>Terms of Service</Text> {"\n"} and{" "}
                    <Text style={styles.link}>Privacy Policy.</Text>
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F7FAFC", // very light grey/blue
    },
    content: {
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 80,
    },
    title: {
        fontSize: 20,
        color: "#769FCD", // blue heading
        fontWeight: "600",
        marginTop: 184,
        marginBottom: 12,
        textAlign: "center",
    },
    description: {
        fontSize: 14,
        color: "#4A5568",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 40,
    },
    field: {
        alignSelf: "stretch",
        marginBottom: 28,
    },
    label: {
        fontSize: 14,
        color: "#4A5568",
        marginBottom: 8,
    },
    inputWrapper: {
        borderWidth: 1,
        borderRadius: 8,
        borderColor: "#A0C4FF", // light blue border similar to screenshot
        backgroundColor: "#FFFFFF",
    },
    input: {
        height: 48,
        paddingHorizontal: 12,
        fontSize: 14,
        color: "#2D3748",
    },
    button: {
        marginTop: 8,
        alignSelf: "stretch",
        height: 52,
        borderRadius: 26,
        backgroundColor: "#769FCD", // blue button
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 14,
        letterSpacing: 1,
    },
    footerText: {
        marginTop: 16,
        fontSize: 11,
        color: "#A0AEC0",
        textAlign: "center",
        lineHeight: 16,
    },
    link: {
        color: "#000000",
        textDecorationLine: "underline",
    },
});
