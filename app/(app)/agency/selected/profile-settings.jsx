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
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'expo-router';


const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    primaryLight: 'rgba(118, 159, 205, 0.1)',
    white: '#FFFFFF',
    border: '#EEF2F7',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    danger: '#FF6B6B',
    dangerLight: 'rgba(255, 107, 107, 0.1)',
    warning: '#FF9800',
    warningLight: 'rgba(255, 152, 0, 0.1)',
    info: '#2196F3',
    infoLight: 'rgba(33, 150, 243, 0.1)',
};

export default function Settings() {
    const router = useRouter();
    const { signOut } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: signOut }
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "This action is irreversible. All your data will be permanently deleted.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => console.log("Delete account") }
            ]
        );
    };

    const openSupport = () => {
        Linking.openURL('mailto:support@eduagent.com?subject=Support Request');
    };

    const openFAQ = () => {
        // You can link to your FAQ page or webview
        router.push('/faq');
    };

    const handleChangePassword = () => {
        router.push('/profile/change-password');
    };

    const menuItems = [
        {
            title: "Account",
            icon: "user",
            items: [
                {
                    title: "Edit Profile",
                    subtitle: "Update your personal information",
                    icon: <Feather name="user" size={22} color={COLORS.primary} />,
                    onPress: () => router.back(),
                },
                {
                    title: "Change Password",
                    subtitle: "Update your account password",
                    icon: <Feather name="lock" size={22} color={COLORS.primary} />,
                    onPress: handleChangePassword,
                },
            ]
        },
        {
            title: "Support",
            icon: "help-circle",
            items: [
                {
                    title: "Help & Support",
                    subtitle: "Get help with your account",
                    icon: <Feather name="help-circle" size={22} color={COLORS.info} />,
                    onPress: openSupport,
                },
                {
                    title: "FAQ",
                    subtitle: "Frequently asked questions",
                    icon: <MaterialIcons name="contact-support" size={22} color={COLORS.info} />,
                    onPress: openFAQ,
                },
                {
                    title: "Contact Us",
                    subtitle: "Get in touch with our team",
                    icon: <Feather name="mail" size={22} color={COLORS.info} />,
                    onPress: () => Linking.openURL('mailto:contact@eduagent.com'),
                },
            ]
        },
    ];

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
                    <View style={{ width: 44 }} />
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollBody}
            >
                {menuItems.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name={section.icon} size={20} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                        </View>
                        
                        <View style={styles.menuCard}>
                            {section.items.map((item, itemIndex) => (
                                <TouchableOpacity
                                    key={itemIndex}
                                    style={[
                                        styles.menuItem,
                                        itemIndex < section.items.length - 1 && styles.menuItemBorder
                                    ]}
                                    onPress={item.onPress}
                                >
                                    <View style={styles.menuItemContent}>
                                        <View style={[styles.menuIcon, { backgroundColor: getIconBgColor(item) }]}>
                                            {item.icon}
                                        </View>
                                        <View style={styles.menuText}>
                                            <Text style={styles.menuTitle}>{item.title}</Text>
                                            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Danger Zone */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="alert-triangle" size={20} color={COLORS.danger} />
                        <Text style={[styles.sectionTitle, { color: COLORS.danger }]}>Danger Zone</Text>
                    </View>
                    
                    <View style={[styles.menuCard, { borderColor: 'rgba(255, 107, 107, 0.3)' }]}>
                        <TouchableOpacity
                            style={[styles.menuItem, styles.dangerItem]}
                            onPress={handleLogout}
                        >
                            <View style={styles.menuItemContent}>
                                <View style={[styles.menuIcon, { backgroundColor: COLORS.dangerLight }]}>
                                    <Feather name="log-out" size={22} color={COLORS.danger} />
                                </View>
                                <View style={styles.menuText}>
                                    <Text style={[styles.menuTitle, { color: COLORS.danger }]}>Log Out</Text>
                                    <Text style={styles.menuSubtitle}>Sign out from this device</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.danger} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleDeleteAccount}
                        >
                            <View style={styles.menuItemContent}>
                                <View style={[styles.menuIcon, { backgroundColor: COLORS.dangerLight }]}>
                                    <Feather name="trash-2" size={22} color={COLORS.danger} />
                                </View>
                                <View style={styles.menuText}>
                                    <Text style={[styles.menuTitle, { color: COLORS.danger }]}>Delete Account</Text>
                                    <Text style={styles.menuSubtitle}>Permanently delete your account</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appVersion}>EduAgent v1.0.0</Text>
                    <Text style={styles.appCopyright}>© 2024 EduAgent. All rights reserved.</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const getIconBgColor = (item) => {
    if (item.icon.props.color === COLORS.primary) return COLORS.primaryLight;
    if (item.icon.props.color === COLORS.info) return COLORS.infoLight;
    if (item.icon.props.color === COLORS.danger) return COLORS.dangerLight;
    return COLORS.primaryLight;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    // Header
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
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
    // Scroll Body
    scrollBody: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 20,
    },
    // Section
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginLeft: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginLeft: 10,
    },
    // Menu Card
    menuCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        minHeight: 70,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuText: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    dangerItem: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 107, 107, 0.2)',
    },
    // App Info
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