import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';
import DocumentUpload from './uploads';

export default function DocumentUploadController() {
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [currentStage, setCurrentStage] = useState('admission');
    const [error, setError] = useState(null);

    // This function ONLY gets the stage from the server - doesn't modify anything else
    const fetchStage = useCallback(async (showLoading = true) => {
        console.log("--- 🔄 Controller: Fetching Current Stage ---");
        try {
            if (showLoading) setLoading(true);
            setError(null);

            const res = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            const json = await res.json();
            console.log("📥 Profile Response:", JSON.stringify(json, null, 2));
            
            if (res.ok && json.profile) {
                const profile = json.profile;
                const serverStage = profile.currentProcessStage || 'admission';
                console.log(`📍 Current Stage: [${serverStage.toUpperCase()}]`);
                return serverStage;
            } else {
                console.log("⚠️ No profile found, defaulting to admission stage");
                return 'admission';
            }
        } catch (e) {
            console.error("❌ Controller Sync Error:", e.message);
            setError('Failed to load application status');
            return 'admission';
        } finally {
            if (showLoading) setLoading(false);
            console.log("--- 🏁 Controller: Sync Complete ---");
        }
    }, [userToken]);

    // Initial load - sets the stage
    useEffect(() => { 
        const initialize = async () => {
            const stage = await fetchStage(true);
            setCurrentStage(stage);
        };
        initialize();
    }, []); // Empty dependency array - only run once on mount

    // This is called when the user manually changes stage (via continue button)
    const handleStageTransition = (nextStage) => {
        console.log(`🔄 Manually transitioning to stage: ${nextStage}`);
        setCurrentStage(nextStage);
    };

    // This is called on pull-to-refresh - we DON'T want to change the stage here
    const handleRefresh = () => {
        console.log(`🔄 Refreshing documents for current stage: ${currentStage}`);
        // We don't fetch the stage again - we just pass the refresh signal to DocumentUpload
        // The DocumentUpload component will handle refreshing its own data
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#769FCD" />
                <Text style={styles.loadingText}>Loading application status...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.errorSubtext}>Please try again later</Text>
            </View>
        );
    }

    return (
        <DocumentUpload 
            stage={currentStage} 
            onStageChange={handleStageTransition}
            onRefresh={handleRefresh}
        />
    );
}

const styles = StyleSheet.create({
    center: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 20
    },
    loadingText: { 
        marginTop: 12, 
        color: '#769FCD', 
        fontWeight: '600',
        fontSize: 14
    },
    errorText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#DC2626',
        marginBottom: 8,
        textAlign: 'center'
    },
    errorSubtext: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center'
    }
});