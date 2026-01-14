import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
const COLORS = {
    primary: '#769FCD',
    textMain: '#4A4A4A',
    textLight: '#BFC7D1',
    background: '#F8FAFD',
    white: '#FFFFFF',
    line: '#EEF2F7',
};

export default function UpdatesScreen() {
    const params = useLocalSearchParams(); // Get all params
    const agencyId = params.id || params.agencyId; // Try both parameter names

    // Add debug logging
    console.log('=== UPDATES PAGE ===');
    console.log('All params:', params);
    console.log('Agency ID:', agencyId);
    console.log('=== END DEBUG ===');


    const steps = [
        { id: 1, title: 'Selected course, and institute', date: '10/07/25', completed: true },
        { id: 2, title: 'Support in English course for those requiring Academic English Programs', date: '1/08/25', completed: true },
        { id: 3, title: 'Obtain Offer Letter from the selected institute', date: '10/10/25', completed: false },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Application Status</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    {steps.map((step, index) => (
                        <View key={step.id} style={styles.stepRow}>
                            {/* Left Side: Timeline Line and Dot */}
                            <View style={styles.timelineContainer}>
                                <View style={[styles.dot, step.completed ? styles.dotCompleted : styles.dotPending]} />
                                {index !== steps.length - 1 && <View style={styles.line} />}
                            </View>

                            {/* Right Side: Text Content */}
                            <View style={styles.textContainer}>
                                <View style={styles.titleRow}>
                                    <Text style={[styles.stepTitle, !step.completed && styles.textIncomplete]}>
                                        {step.title}
                                    </Text>
                                    <Text style={styles.stepDate}>{step.date}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.primary,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 15,
        padding: 20,
        // Soft shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    stepRow: {
        flexDirection: 'row',
        minHeight: 80,
    },
    timelineContainer: {
        alignItems: 'center',
        marginRight: 15,
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        zIndex: 1,
        backgroundColor: COLORS.white,
    },
    dotCompleted: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    dotPending: {
        borderColor: COLORS.primary,
        opacity: 0.3,
    },
    line: {
        width: 2,
        flex: 1,
        backgroundColor: COLORS.line,
        marginVertical: -2,
    },
    textContainer: {
        flex: 1,
        paddingBottom: 25,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stepTitle: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textMain,
        fontWeight: '500',
        lineHeight: 20,
        paddingRight: 10,
    },
    textIncomplete: {
        color: COLORS.textLight,
    },
    stepDate: {
        fontSize: 12,
        color: COLORS.textLight,
    },
});