import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'expo-router';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.1)',
    white: '#FFFFFF',
    border: '#EEF2F7',
    cardBg: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    danger: '#FF6B6B',
    dangerLight: 'rgba(255, 107, 107, 0.1)',
};

export default function Settings() {
    const router = useRouter();
    const { signOut } = useAuth();

    const handleLogout = async () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Log Out", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            // Show loading indicator or disable button
                            console.log('[Settings] Logging out...');
                            
                            // Call signOut and wait for it to complete
                            await signOut();
                            
                            console.log('[Settings] Sign out complete, navigating to register');
                            
                            // Force navigation to register page
                            // Use a small timeout to ensure state updates are processed
                            setTimeout(() => {
                                router.replace("/auth/register");
                            }, 100);
                            
                        } catch (error) {
                            console.error('[Settings] Logout error:', error);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "This action is irreversible. All your data will be permanently deleted.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: () => console.log("Delete account") 
                }
            ]
        );
    };

    const openSupport = () => {
        Linking.openURL('mailto:support@eduagent.com?subject=Support Request');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Support Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>

                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={openSupport}
                        >
                            <View style={styles.infoLeft}>
                                <Ionicons name="help-circle-outline" size={18} color={COLORS.textSecondary} />
                                <Text style={styles.infoLabel}>Help & Support</Text>
                            </View>
                            <View style={styles.infoRight}>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={() => Linking.openURL('mailto:contact@eduagent.com')}
                        >
                            <View style={styles.infoLeft}>
                                <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
                                <Text style={styles.infoLabel}>Contact Us</Text>
                            </View>
                            <View style={styles.infoRight}>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Account Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>

                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={handleLogout}
                        >
                            <View style={styles.infoLeft}>
                                <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
                                <Text style={[styles.infoLabel, { color: COLORS.danger }]}>Log Out</Text>
                            </View>
                            <View style={styles.infoRight}>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.danger} />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={handleDeleteAccount}
                        >
                            <View style={styles.infoLeft}>
                                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                                <Text style={[styles.infoLabel, { color: COLORS.danger }]}>Delete Account</Text>
                            </View>
                            <View style={styles.infoRight}>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.danger} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appVersion}>EduAgent v1.0.0</Text>
                    <Text style={styles.appCopyright}>© 2024 EduAgent. All rights reserved.</Text>
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.white,
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginLeft: 12,
    },
    infoRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
    },
    appInfo: {
        alignItems: 'center',
        marginTop: 20,
        padding: 20,
    },
    appVersion: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    appCopyright: {
        fontSize: 12,
        color: COLORS.textSecondary,
        opacity: 0.8,
    },
});