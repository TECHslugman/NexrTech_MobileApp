import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext'; 

export default function AgencyCourseList() {
    // This 'id' is the Agency ID passed from the previous screen
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { userToken } = useAuth();
    
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCourses = async () => {
            try {
                // Fetching courses for this specific Agency ID
                const res = await fetch(`https://edu-agent-backend-nine.vercel.app/api/v1/agency/courses/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                
                const contentType = res.headers.get("content-type");
                if (res.ok && contentType && contentType.includes("application/json")) {
                    const json = await res.json();
                    setCourses(json.courses || []);
                } else {
                    // Fallback Provisionary Data
                    setCourses([
                        { id: 'c1', name: "Bachelors of Nursing" },
                        { id: 'c2', name: "Bachelors of Political Sci." },
                        { id: 'c3', name: "Business Management" },
                        { id: 'c4', name: "IT & Computer Science" },
                        { id: 'c5', name: "Architecture" },
                        { id: 'c6', name: "Public Health" }
                    ]);
                }
            } catch (e) {
                console.log("Fetch error, using fallback");
                setCourses([{ id: 'c1', name: "Nursing" }, { id: 'c2', name: "Politics" }]);
            } finally {
                setLoading(false);
            }
        };
        loadCourses();
    }, [id]);

    const renderCourseItem = ({ item, index }) => (
        <TouchableOpacity 
            style={[styles.card, { backgroundColor: index % 2 === 0 ? '#FF6B6B' : '#949BFF' }]}
            onPress={() => {
                // Navigate to the specific course detail
                // We pass the course ID so the next page knows which info to show
                router.push({
                    pathname: `/agency/selected/courses/details/${item.id}`,
                    params: { agencyId: id, courseName: item.name } // Optional: pass extra info
                });
            }}
        >
            <Text style={styles.cardText}>{item.name || item}</Text>
            <Ionicons name="arrow-forward-circle-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.icon} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Available Courses</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#769FCD" />
                </View>
            ) : (
                <FlatList
                    data={courses}
                    numColumns={2}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    renderItem={renderCourseItem}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.listPadding}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFD' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingVertical: 15, 
        alignItems: 'center' 
    },
    backBtn: { padding: 5 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#87A1C5' },
    listPadding: { paddingBottom: 40 },
    row: { justifyContent: 'space-between', paddingHorizontal: 20 },
    card: { 
        width: '47%', 
        height: 110, 
        borderRadius: 20, 
        padding: 15, 
        marginBottom: 15, 
        justifyContent: 'space-between',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    cardText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    icon: { alignSelf: 'flex-end' }
});