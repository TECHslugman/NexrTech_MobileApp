import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    StatusBar,
    useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';

const COLORS = {
    bg: '#FFFFFF',
    primary: '#769FCD',
    text: '#769FCD',
    textMuted: '#64748B',
    cardBg: '#FFFFFF',
    border: '#E2E8F0',
};

export default function AllUniversities() {
    const router = useRouter();
    const { id } = useLocalSearchParams(); // Agency ID
    const { userToken } = useAuth();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [universities, setUniversities] = useState([]);

 useEffect(() => {
    const fetchUniversities = async () => {
        if (!userToken || !id) return;
        setLoading(true);

        try {
            const response = await fetch(`${BASE_URL}/agency/universities/agency/${id}`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            if (response.ok) {
                const json = await response.json();
                
                const partnerUnis = json.university?.partnerUniversities || [];
                setUniversities(partnerUnis);
            } else {
                throw new Error("Failed to fetch university data");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchUniversities();
}, [id, userToken]);

    const renderUniItem = ({ item }) => {
        const universityId = item._id;
        const cardWidth = (width - 48) / 2;
        
        return (
            <TouchableOpacity 
                style={[styles.universityCard, { width: cardWidth }]}
                activeOpacity={0.85}
                onPress={() => {
                    router.push({
                        pathname: '/agency/selected/universities/details',
                        params: { 
                            id: universityId,
                            uniName: item.name || "University",
                            uniLogo: item.logo || "" // Pass the logo URL here
                        }
                    });
                }}
            >
                {item.logo ? (
                    <Image 
                        source={{ uri: item.logo }} 
                        style={styles.universityLogo}
                        resizeMode="contain"
                    />
                ) : (
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoPlaceholderText}>
                            {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Universities</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : universities.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="school-outline" size={48} color="#CBD5E1" />
                    <Text style={styles.emptyText}>No universities available</Text>
                </View>
            ) : (
                <FlatList
                    data={universities}
                    numColumns={2}
                    keyExtractor={(item, index) => (item._id || index).toString()}
                    renderItem={renderUniItem}
                    contentContainerStyle={styles.listContainer}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { 
        flex: 1, 
        backgroundColor: COLORS.bg 
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.bg,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
        textAlign: 'center',
        marginLeft: -40,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textMuted,
    },
    listContainer: { 
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 24,
    },
    columnWrapper: { 
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    universityCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    universityLogo: {
        width: '100%',
        height: '100%',
    },
    logoPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoPlaceholderText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#64748B',
    },
});