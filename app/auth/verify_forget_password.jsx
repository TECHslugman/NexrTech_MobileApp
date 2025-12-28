// app/auth/verify_register.jsx
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,

} from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function VerifyforgotpasswordScreen() {
    const { email } = useLocalSearchParams();;
    const router = useRouter();
    const API_BASE_URL = "https://edu-agent-backend-bplxyxizo-dendups-projects.vercel.app/api/auth/user/password-reset";
    const [code, setCode] = useState(["", "", "", ""]);
    const [secondsLeft, setSecondsLeft] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const allInput = code.every((digit) => digit !== "");
    const inputRefs = useRef([]);

    useEffect(() => {
        setSecondsLeft(60);
        setCanResend(false);
        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleChange = (value, index) => {
        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleResend = async() => {
        if (!canResend) return;
        try{
            const res = await fetch(`${API_BASE_URL}/send-otp`, {
                method: "POST",
                headers: {"content-Type": "application/json"},
                body: JSON.stringify({
                    email,
                }),
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                console.log("Resend OTP error:", errorData);
                return;
            }
            console.log("OTP resent successfully");
        } catch (e) {
            console.log("Resend OTP request failed:", e);
        }
        setSecondsLeft(60);
        setCanResend(false);
        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleVerify = async () => {
        const otp = code.join("");
        if (otp.length !== 4) return; // or 6

        try {
            const res = await fetch(`${API_BASE_URL}/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                console.log("Verify error:", errorData);
                return;
            }

            // if backend returns token/user you can store it here if you want
            const data = await res.json();
            console.log("Verify success:", data);

            // after successful verification → go to login screen
            router.replace({
                pathname: "/auth/create_new_password",
                params: {resetToken: data.resetToken}
            });
        } catch (e) {
            console.log("Verify request failed:", e);
        }
    };

    const formattedTime = `00:${secondsLeft.toString().padStart(2, "0")}`;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.content}>
                <Text style={styles.title}>Verify Account</Text>

                <Text style={styles.subtitle}>Code has been sent to {email}.</Text>
                <Text style={styles.subtitle}>
                    Enter the code to verify your account
                </Text>

                <View style={styles.otpContainer}>
                    {code.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => (inputRefs.current[index] = ref)}
                            style={styles.otpInput}
                            keyboardType="number-pad"
                            maxLength={1}
                            value={digit}
                            onChangeText={(value) => handleChange(value, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                        />
                    ))}
                </View>

                <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>
                        Didn&apos;t receive a code?{" "}
                        <Text
                            style={[styles.resendLink, canResend && styles.resendLinkActive]
                            }
                            onPress={canResend ? handleResend : undefined}
                        >
                            Resend Code
                        </Text>
                    </Text>
                    <Text style={styles.timerText}>Resend code in {formattedTime}</Text>
                </View>
            </View>

            <TouchableOpacity style={[
                styles.verifyButton, allInput && { backgroundColor: "#769FCD" },
            ]}
                onPress={handleVerify}>
                <Text style={styles.verifyButtonText}>VERIFY ACCOUNT</Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7FAFC', // light grey similar to screenshot
        justifyContent: 'space-between',
    },
    content: {
        alignItems: 'center',
        marginTop: 80,
    },
    title: {
        fontSize: 20,
        color: '#4A5568',
        fontWeight: '600',
        marginBottom: 16,
        marginTop: 83,
    },
    subtitle: {
        fontSize: 14,
        color: '#718096',
        textAlign: 'center',
        marginHorizontal: 32,
    },
    otpContainer: {
        flexDirection: 'row',
        marginTop: 42,
        justifyContent: 'space-between',
        width: 260,
    },
    otpInput: {
        width: 60,
        height: 60,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        textAlign: 'center',
        fontSize: 30,
        color: '#2D3748',
    },
    resendContainer: {
        marginTop: 123,
        alignItems: 'center',
    },
    resendText: {
        fontSize: 14,
        color: '#4A5568',
    },
    resendLink: {
        color: '#5E5C58',
        textDecorationLine: 'underline',
    },
    resendLinkActive: {
        color: '#3182CE',
    },
    timerText: {
        marginTop: 4,
        fontSize: 13,
        color: '#A0AEC0',
    },
    verifyButton: {
        marginHorizontal: 24,
        marginBottom: 121,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#5E5C58',
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifyButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        letterSpacing: 1,
    },
});

