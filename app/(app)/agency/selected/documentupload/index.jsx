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

    const checkStatus = useCallback(async () => {
        console.log("--- 🔄 Controller: Fetching Current Stage ---");
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(`${Config.API_BASE_URL}/students/profile`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            const json = await res.json();
            console.log("📥 Profile Response:", JSON.stringify(json, null, 2));
            
            if (res.ok && json.profile) {
                const profile = json.profile;
                
                // Get current stage from backend (admission, coe, or visa)
                const serverStage = profile.currentProcessStage || 'admission';
                console.log(`📍 Current Stage: [${serverStage.toUpperCase()}]`);
                
                setCurrentStage(serverStage);
            } else {
                console.log("⚠️ No profile found, defaulting to admission stage");
                setCurrentStage('admission');
            }
        } catch (e) {
            console.error("❌ Controller Sync Error:", e.message);
            setError('Failed to load application status');
            setCurrentStage('admission');
        } finally {
            setLoading(false);
            console.log("--- 🏁 Controller: Sync Complete ---");
        }
    }, [userToken]);

    useEffect(() => { 
        checkStatus(); 
    }, [checkStatus]);

    const handleStageTransition = (nextStage) => {
        console.log(`🔄 Transitioning to stage: ${nextStage}`);
        setCurrentStage(nextStage);
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
            onRefresh={checkStatus}
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