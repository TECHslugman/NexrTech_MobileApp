import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StatusBar,
    useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';

const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#87A1C5', 
    white: '#FFFFFF',
    border: '#EEF2F7',
    cardBg: '#87A1C5', 
    cardAlt: '#769FCD', 
};

export default function AllScholarships() {
    const router = useRouter();
    const { id } = useLocalSearchParams(); // Agency ID
    const { userToken } = useAuth();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [scholarships, setScholarships] = useState([]);

    useEffect(() => {
        const fetchScholarships = async () => {
            try {
                const response = await fetch(`${BASE_URL}/agency/scholarships/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                const json = await response.json();
                if (response.ok && (json.scholarships || json.data)) {
                    // API returns array of objects with id and name
                    setScholarships(json.scholarships || json.data);
                } else {
                    throw new Error("API fallback");
                }
            } catch (error) {
                // Provisionary Data for development
                setScholarships([
                    { id: '1', name: "Australia Awards" },
                    { id: '2', name: "The Snow Scholarship" },
                    { id: '3', name: "Fulbright Program" },
                    { id: '4', name: "Chevening Scholarship" }
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchScholarships();
    }, [id]);

    const renderScholarshipItem = ({ item, index }) => (
        <TouchableOpacity 
            style={[
                styles.scholarshipCard, 
                { 
                    width: (width - 50) / 2,
                    backgroundColor: index % 2 === 0 ? COLORS.cardBg : COLORS.cardAlt 
                }
            ]}
            onPress={() => {
                router.push({
                    pathname: `/agency/selected/scholarships/details/${item.id}`,
                    params: { agencyId: id, scholarshipName: item.name }
                });
            }}
        >
            <MaterialCommunityIcons name="school-outline" size={24} color="rgba(255,255,255,0.4)" style={styles.iconPos} />
            <Text style={styles.scholarshipText}>{item.name}</Text>
            <View style={styles.viewBadge}>
                <Text style={styles.viewText}>View Details</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={26} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scholarships</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={scholarships}
                    numColumns={2}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderScholarshipItem}
                    columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
                    contentContainerStyle={{ paddingVertical: 20, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 15, 
        paddingVertical: 15,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.primary },
    backBtn: { padding: 5 },
    scholarshipCard: { 
        height: 140, 
        borderRadius: 20, 
        marginBottom: 15, 
        padding: 15,
        justifyContent: 'space-between',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden'
    },
    iconPos: { position: 'absolute', top: 10, right: 10 },
    scholarshipText: { 
        color: COLORS.white, 
        fontWeight: 'bold', 
        fontSize: 15,
        lineHeight: 20,
        marginTop: 15
    },
    viewBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 10,
        alignSelf: 'flex-start'
    },
    viewText: { color: COLORS.white, fontSize: 11, fontWeight: '600' }
});