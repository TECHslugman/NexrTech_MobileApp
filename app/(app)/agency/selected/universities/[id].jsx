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

const DEFAULT_IMAGE = 'https://via.placeholder.com/150';
const BASE_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#87A1C5',
    white: '#FFFFFF',
    border: '#EEF2F7',
    text: '#444',
    textMuted: '#B0BCCB',
};

export default function AllUniversities() {
    const router = useRouter();
    const { id } = useLocalSearchParams(); 
    const { userToken } = useAuth();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [universities, setUniversities] = useState([]);

    useEffect(() => {
        const fetchUniversities = async () => {
            try {
                const response = await fetch(`${BASE_URL}/agency/universities/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });

                const json = await response.json();
                if (response.ok && (json.universities || json.data)) {
                    setUniversities(json.universities || json.data);
                } else {
                    throw new Error("Fallback required");
                }
            } catch (error) {
                setUniversities([
                    { _id: '1', name: 'Royal Thimphu College', location: 'Thimphu, Bhutan', logo: null },
                    { _id: '2', name: 'University of Canberra', location: 'ACT, Australia', logo: null },
                    { _id: '3', name: 'Toronto Metropolitan', location: 'Ontario, Canada', logo: null },
                    { _id: '4', name: 'Edith Cowan University', location: 'Perth, Australia', logo: null },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchUniversities();
    }, [id]);

    const renderUniItem = ({ item }) => (
        <TouchableOpacity 
            style={[styles.uniCard, { width: (width - 50) / 2 }]}
            onPress={() => {
                router.push({
                    pathname: `/agency/selected/universities/details/${item._id}`,
                    params: { uniName: item.name } 
                });
            }}
        >
            <View style={styles.logoWrapper}>
                <Image 
                    source={item.logo ? { uri: item.logo } : { uri: DEFAULT_IMAGE }} 
                    style={styles.logoImg}
                    resizeMode="contain"
                />
            </View>
            <Text style={styles.uniName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.uniLoc}>{item.location}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={26} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Universities</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={universities}
                    numColumns={2}
                    keyExtractor={(item) => item._id}
                    renderItem={renderUniItem}
                    columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
                    contentContainerStyle={{ paddingVertical: 20, paddingBottom: 50 }}
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
    uniCard: { 
        backgroundColor: COLORS.white, 
        borderRadius: 20, 
        padding: 15, 
        marginBottom: 15, 
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    logoWrapper: { width: 70, height: 70, marginBottom: 12, justifyContent: 'center', alignItems: 'center' },
    logoImg: { width: '100%', height: '100%' },
    uniName: { fontSize: 13, fontWeight: 'bold', color: '#444', textAlign: 'center', marginBottom: 4 },
    uniLoc: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' }
});