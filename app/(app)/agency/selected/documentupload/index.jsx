import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    ScrollView, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';
import DocumentUpload from './uploads';
import { useRouter } from 'expo-router';

const C = {
    blue:        '#769FCD',
    blueSoft:    'rgba(118,159,205,0.08)',
    blueBorder:  'rgba(118,159,205,0.18)',
    bg:          '#F6F8FC',
    surface:     '#FFFFFF',
    divider:     '#EDEEF2',
    ink1:        '#1E2533',
    ink2:        '#5A6478',
    ink3:        '#A0A8B8',
    green:       '#3DAD72',
    greenSoft:   'rgba(61,173,114,0.07)',
    greenBorder: 'rgba(61,173,114,0.18)',
    amber:       '#C98A00',
    amberSoft:   'rgba(201,138,0,0.07)',
    amberBorder: 'rgba(201,138,0,0.18)',
    red:         '#D94040',
};

function HubCard({ title, subtitle, icon, progress, stats, isEnabled, isCurrent, isCompleted, onPress, index }) {
    const scale   = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(opacity, { toValue: 1, duration: 340, delay: index * 110, useNativeDriver: true }).start();
    }, []);

    const pct      = progress || 0;
    const barColor = isCompleted ? C.green : isCurrent ? C.blue : C.ink3;

    return (
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
            <TouchableOpacity
                onPress={isEnabled ? onPress : undefined}
                onPressIn={() => isEnabled && Animated.spring(scale, { toValue: 0.975, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
                activeOpacity={1}
                style={[
                    styles.hubCard,
                    !isEnabled  && styles.hubCardDisabled,
                    isCompleted && styles.hubCardCompleted,
                    isCurrent   && !isCompleted && styles.hubCardActive,
                ]}
            >
                <View style={styles.hubTop}>
                    <View style={[
                        styles.hubIconBox,
                        isCompleted && { backgroundColor: C.greenSoft },
                        isCurrent && !isCompleted && { backgroundColor: C.blueSoft },
                    ]}>
                        <Ionicons name={icon} size={20} color={isCompleted ? C.green : isCurrent ? C.blue : C.ink3} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.hubTitleRow}>
                            <Text style={[styles.hubTitle, !isEnabled && { color: C.ink3 }]}>{title}</Text>
                            {isCurrent && !isCompleted && (
                                <View style={[styles.pill, { backgroundColor: C.blueSoft, borderColor: C.blueBorder }]}>
                                    <Text style={[styles.pillTxt, { color: C.blue }]}>Active</Text>
                                </View>
                            )}
                            {isCompleted && (
                                <View style={[styles.pill, { backgroundColor: C.greenSoft, borderColor: C.greenBorder }]}>
                                    <Text style={[styles.pillTxt, { color: C.green }]}>Done</Text>
                                </View>
                            )}
                            {!isEnabled && !isCompleted && (
                                <View style={[styles.pill, { backgroundColor: C.divider, borderColor: 'transparent' }]}>
                                    <Text style={[styles.pillTxt, { color: C.ink3 }]}>Locked</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.hubSubtitle, !isEnabled && { color: C.ink3 }]}>{subtitle}</Text>
                    </View>

                    {isEnabled && <Ionicons name="chevron-forward" size={16} color={C.ink3} />}
                </View>

                {isEnabled && stats && (
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNum, { color: C.blue }]}>{stats.uploaded}</Text>
                            <Text style={styles.statLbl}>Uploaded</Text>
                        </View>
                        <View style={styles.statSep} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statNum, { color: C.green }]}>{stats.approved}</Text>
                            <Text style={styles.statLbl}>Approved</Text>
                        </View>
                        <View style={styles.statSep} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statNum, { color: stats.needsAction > 0 ? C.red : C.ink3 }]}>{stats.needsAction}</Text>
                            <Text style={styles.statLbl}>Action Needed</Text>
                        </View>
                    </View>
                )}

                {isEnabled && (
                    <>
                        <View style={styles.progRow}>
                            <Text style={styles.progLbl}>{pct}% approved</Text>
                        </View>
                        <View style={styles.track}>
                            <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
                        </View>
                    </>
                )}

                {!isEnabled && (
                    <View style={styles.lockedRow}>
                        <Text style={styles.lockedTxt}>Complete the admission stage to unlock</Text>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function DocumentUploadController() {
    const { userToken, activeAgency } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [loading,        setLoading]       = useState(true);
    const [currentStage,   setCurrentStage]  = useState(null);
    const [serverStage,    setServerStage]   = useState('admission');
    const [error,          setError]         = useState(null);
    const [agencyDocCount, setAgencyDocCount] = useState(0);
    const [stagesStatus,   setStagesStatus]  = useState({
        admission: { total: 0, uploaded: 0, approved: 0, needsAction: 0 },
        visa:      { total: 0, uploaded: 0, approved: 0, needsAction: 0 },
    });

    const fetchServerStage = useCallback(async () => {
        try {
            const res  = await fetch(`${Config.API_BASE_URL}/students/profile`, { headers: { Authorization: `Bearer ${userToken}` } });
            const json = await res.json();
            if (res.ok && json.profile) {
                const s = json.profile.currentProcessStage || 'admission';
                setServerStage(s);
                return s;
            }
            return 'admission';
        } catch { return 'admission'; }
    }, [userToken]);

    const fetchStagesStatus = useCallback(async () => {
        try {
            const [aRes, vRes, agRes] = await Promise.all([
                fetch(`${Config.API_BASE_URL}/students/documents/status?stage=admission`, { headers: { Authorization: `Bearer ${userToken}` } }),
                fetch(`${Config.API_BASE_URL}/students/documents/status?stage=visa`,      { headers: { Authorization: `Bearer ${userToken}` } }),
                fetch(`${Config.API_BASE_URL}/students/documents`,                         { headers: { Authorization: `Bearer ${userToken}` } }),
            ]);
            const [aData, vData, agData] = await Promise.all([aRes.json(), vRes.json(), agRes.json()]);
            const calc = (data) => {
                const docs = data.data || [];
                return {
                    total:       docs.length,
                    uploaded:    docs.filter(d => !!d.document).length,
                    approved:    docs.filter(d => d.status === 'approved').length,
                    needsAction: docs.filter(d => ['rejected','reupload'].includes(d.status)).length,
                };
            };
            setStagesStatus({ admission: calc(aData), visa: calc(vData) });
            if (agRes.ok && agData.data) {
                const agencyDocs = agData.data.filter(d => ['agent','agency'].includes(d.uploaderModel?.toLowerCase()));
                setAgencyDocCount(agencyDocs.length);
            }
        } catch (e) { console.error('fetchStagesStatus:', e); }
    }, [userToken]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            setError(null);
            try { await Promise.all([fetchServerStage(), fetchStagesStatus()]); }
            catch { setError('Failed to load application status'); }
            finally { setLoading(false); }
        };
        init();
    }, []);

    const handleReturnToHub = useCallback(async () => {
        setCurrentStage(null);
        await Promise.all([fetchServerStage(), fetchStagesStatus()]);
    }, [fetchServerStage, fetchStagesStatus]);

    const handleStageTransition = useCallback((nextStage) => {
        if (nextStage === null || nextStage === 'hub') handleReturnToHub();
        else setCurrentStage(nextStage);
    }, [handleReturnToHub]);

    const admissionCompleted    = stagesStatus.admission.total > 0 && stagesStatus.admission.approved === stagesStatus.admission.total;
    const visaCompleted         = stagesStatus.visa.total > 0 && stagesStatus.visa.approved === stagesStatus.visa.total;
    const isAgencyDocsEnabled   = admissionCompleted || ['document_waitlist','visa'].includes(serverStage);
    const isAgencyDocsCurrent   = serverStage === 'document_waitlist';
    const isAgencyDocsCompleted = isAgencyDocsEnabled && agencyDocCount > 0 && serverStage !== 'document_waitlist';
    const isVisaEnabled         = isAgencyDocsEnabled && (agencyDocCount > 0 || serverStage === 'visa');

    const admissionProgress = stagesStatus.admission.total > 0 ? Math.round((stagesStatus.admission.approved / stagesStatus.admission.total) * 100) : 0;
    const visaProgress      = stagesStatus.visa.total > 0      ? Math.round((stagesStatus.visa.approved / stagesStatus.visa.total) * 100) : 0;

    const handleGoHome = useCallback(() => {
        if (activeAgency?.id) {
            router.replace({ pathname: `/agency/selected/${activeAgency.id}`, params: { name: activeAgency.name, agencyLogo: activeAgency.logo } });
        } else {
            router.replace('/(app)/decision');
        }
    }, [activeAgency, router]);

    if (currentStage) {
        return (
            <DocumentUpload
                stage={currentStage}
                serverStage={serverStage}
                onStageChange={handleStageTransition}
                onRefresh={fetchStagesStatus}
                onBack={handleReturnToHub}
                onGoHome={handleGoHome}
            />
        );
    }

    if (loading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={C.blue} />
                <Text style={styles.loadingTxt}>Loading your application…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <Text style={styles.errorTxt}>{error}</Text>
                <TouchableOpacity onPress={() => { fetchServerStage(); fetchStagesStatus(); }}>
                    <Text style={styles.retryTxt}>Tap to retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Documents</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>Application Stages</Text>

                <HubCard
                    index={0}
                    title="Admission Documents"
                    subtitle="Documents required by the university"
                    icon="school-outline"
                    progress={admissionProgress}
                    stats={stagesStatus.admission}
                    isEnabled={true}
                    isCurrent={serverStage === 'admission'}
                    isCompleted={admissionCompleted}
                    onPress={() => setCurrentStage('admission')}
                />

                <View style={styles.connector}>
                    <View style={[styles.connLine, admissionCompleted && { backgroundColor: C.green }]} />
                </View>

                <HubCard
                    index={1}
                    title="Agency Documents"
                    subtitle="COE, offer letters and other docs from your agency"
                    icon="briefcase-outline"
                    progress={isAgencyDocsCompleted ? 100 : 0}
                    stats={null}
                    isEnabled={isAgencyDocsEnabled}
                    isCurrent={isAgencyDocsCurrent}
                    isCompleted={isAgencyDocsCompleted}
                    onPress={() => setCurrentStage('document_waitlist')}
                />

                <View style={styles.connector}>
                    <View style={[styles.connLine, isAgencyDocsCompleted && { backgroundColor: C.green }]} />
                </View>

                <HubCard
                    index={2}
                    title="Visa Documents"
                    subtitle="Documents required for your visa application"
                    icon="document-text-outline"
                    progress={visaProgress}
                    stats={stagesStatus.visa}
                    isEnabled={isVisaEnabled}
                    isCurrent={serverStage === 'visa'}
                    isCompleted={visaCompleted}
                    onPress={() => setCurrentStage('visa')}
                />

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root:       { flex: 1, backgroundColor: C.bg },
    center:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 10 },
    loadingTxt: { fontSize: 14, color: C.ink2, fontWeight: '500' },
    errorTxt:   { fontSize: 15, color: C.red,  fontWeight: '600' },
    retryTxt:   { fontSize: 14, color: C.blue, marginTop: 6 },

    header: {
        backgroundColor: C.blue,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18,
        borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
    scroll:      { padding: 16 },

    sectionLabel: {
        fontSize: 11, fontWeight: '700', color: C.ink3,
        letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 12,
    },

    hubCard:          { backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.divider, marginBottom: 0 },
    hubCardDisabled:  { opacity: 0.45 },
    hubCardCompleted: { borderColor: C.greenBorder },
    hubCardActive:    { borderColor: C.blueBorder },

    hubTop:      { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    hubIconBox:  { width: 40, height: 40, borderRadius: 11, backgroundColor: C.divider, justifyContent: 'center', alignItems: 'center' },
    hubTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
    hubTitle:    { fontSize: 14, fontWeight: '700', color: C.ink1 },
    hubSubtitle: { fontSize: 12, color: C.ink2 },

    pill:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    pillTxt: { fontSize: 10, fontWeight: '600' },

    statsRow: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 10, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: C.divider },
    statItem: { flex: 1, alignItems: 'center' },
    statSep:  { width: 1, backgroundColor: C.divider },
    statNum:  { fontSize: 17, fontWeight: '800' },
    statLbl:  { fontSize: 10, color: C.ink3, marginTop: 1, fontWeight: '500' },

    progRow: { marginBottom: 5 },
    progLbl: { fontSize: 11, color: C.ink3 },
    track:   { height: 5, backgroundColor: C.divider, borderRadius: 3, overflow: 'hidden' },
    fill:    { height: '100%', borderRadius: 3 },

    lockedRow: { paddingTop: 10, marginTop: 2, borderTopWidth: 1, borderTopColor: C.divider },
    lockedTxt: { fontSize: 12, color: C.ink3 },

    connector: { alignItems: 'center', marginVertical: 4, minHeight: 28 },
    connLine:  { width: 1.5, height: 28, backgroundColor: C.divider },
});