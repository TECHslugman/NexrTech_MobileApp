import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    ScrollView, RefreshControl, Linking, Modal, Animated, Image,
    Dimensions, PixelRatio,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

// ─── Responsive helpers ───────────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Base design width (iPhone 14 Pro = 390pt)
const BASE_W = 390;

// Scale a size relative to screen width
const scale  = (size) => Math.round(PixelRatio.roundToNearestPixel((SCREEN_W / BASE_W) * size));

// Clamp to avoid extremes on tablets / very small phones
const rs = (size, min, max) => {
    const s = scale(size);
    if (min !== undefined && s < min) return min;
    if (max !== undefined && s > max) return max;
    return s;
};

// Responsive font scale — gentler curve than full linear
const rf = (size) => {
    const ratio = SCREEN_W / BASE_W;
    const clamped = Math.min(Math.max(ratio, 0.85), 1.25); // clamp between ~330pt and ~490pt
    return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
};

// Is this a tablet? (rough heuristic: shorter side > 600pt)
const IS_TABLET = Math.min(SCREEN_W, SCREEN_H) >= 600;

// ─── Palette ──────────────────────────────────────────────────────────────────
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
    redSoft:     'rgba(217,64,64,0.06)',
    redBorder:   'rgba(217,64,64,0.16)',
    violet:      '#7B61FF',
    violetSoft:  'rgba(123,97,255,0.07)',
};

const STATUS = {
    pending:      { label: 'Not Uploaded',   color: C.ink3,  bg: C.divider,   accent: C.divider, canUpload: true,  canReupload: false },
    under_review: { label: 'Under Review',   color: C.blue,  bg: C.blueSoft,  accent: C.blue,    canUpload: true,  canReupload: true  },
    reupload:     { label: 'Needs Reupload', color: C.amber, bg: C.amberSoft, accent: C.amber,   canUpload: false, canReupload: true  },
    rejected:     { label: 'Rejected',       color: C.red,   bg: C.redSoft,   accent: C.red,     canUpload: false, canReupload: true  },
    approved:     { label: 'Approved',       color: C.green, bg: C.greenSoft, accent: C.green,   canUpload: false, canReupload: false },
};

function fmtDate(str) {
    if (!str) return '';
    try { return new Date(str).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return ''; }
}

function PDFThumb({ url, label, size = 62 }) {
    const s = rs(size, 44, 80);
    const h = Math.round(s * 1.4);
    return (
        <View style={[styles.thumbPlaceholder, { width: s, height: h }]}>
            <Ionicons name="document-text-outline" size={s * 0.5} color={C.ink2} />
            <View style={styles.thumbFold} />
            <View style={styles.thumbLines}>
                {[86, 68, 90, 58, 76].map((w, i) => (
                    <View key={i} style={[styles.thumbLine, { width: `${w}%` }]} />
                ))}
            </View>
        </View>
    );
}

function CompletionModal({ visible, onGoHome }) {
    const scale = useRef(new Animated.Value(0.86)).current;
    const op    = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scale, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
                Animated.timing(op, { toValue: 1, duration: 240, useNativeDriver: true }),
            ]).start();
        } else {
            scale.setValue(0.86);
            op.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal visible transparent animationType="none">
            <Animated.View style={[styles.completionBg, { opacity: op }]}>
                <Animated.View style={[styles.completionCard, { transform: [{ scale }] }]}>
                    <Text style={styles.completionTitle}>All done!</Text>
                    <Text style={styles.completionSub}>
                        All your documents have been reviewed and approved. Your documentation process is complete.
                    </Text>
                    <TouchableOpacity style={styles.completionBtn} onPress={onGoHome} activeOpacity={0.85}>
                        <Text style={styles.completionBtnTxt}>Back to Home</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

function DocCard({ doc, index, uploading, onUpload, onView }) {
    const cfg  = STATUS[doc.status] || STATUS.pending;
    const fade = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fade, { toValue: 1, duration: 240, delay: index * 45, useNativeDriver: true }).start();
    }, []);

    const needsAction = doc.status === 'rejected' || doc.status === 'reupload';
    const hasFile     = !!doc.file;

    return (
        <Animated.View style={{ opacity: fade }}>
            <View style={[
                styles.docCard,
                { borderLeftColor: cfg.accent },
                needsAction && styles.docCardAlert,
            ]}>
                <View style={styles.dcHeader}>
                    <View style={styles.dcIndex}>
                        <Text style={styles.dcIndexTxt}>{index + 1}</Text>
                    </View>
                    <Text style={styles.dcName} numberOfLines={2}>{doc.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.statusBadgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                </View>

                {!!doc.description && (
                    <Text style={styles.dcDesc}>{doc.description}</Text>
                )}

                {hasFile && (
                    <View style={styles.dcFileRow}>
                        <PDFThumb url={doc.file.fileURL} size={58} />
                        <View style={styles.dcFileMeta}>
                            <Text style={styles.dcDocLabel}>{doc.name}</Text>
                            {!!fmtDate(doc.file.uploadedAt) && (
                                <Text style={styles.dcFileDate}>Uploaded {fmtDate(doc.file.uploadedAt)}</Text>
                            )}
                            <TouchableOpacity style={styles.viewBtn} onPress={() => onView(doc.file.fileURL)} activeOpacity={0.7}>
                                <Text style={styles.viewBtnTxt}>View</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {needsAction && !!doc.rejectionReason && (
                    <View style={styles.rejectBox}>
                        <Text style={[styles.rejectTxt, { color: cfg.color }]}>{doc.rejectionReason}</Text>
                    </View>
                )}

                {uploading ? (
                    <View style={styles.uploadingRow}>
                        <ActivityIndicator size="small" color={C.blue} />
                        <Text style={styles.uploadingTxt}>Uploading…</Text>
                    </View>
                ) : (cfg.canUpload || cfg.canReupload) ? (
                    <TouchableOpacity
                        style={[
                            styles.uploadBtn,
                            cfg.canReupload && { backgroundColor: 'transparent', borderWidth: 1, borderColor: cfg.color },
                        ]}
                        onPress={() => onUpload(doc)}
                        activeOpacity={0.82}
                    >
                        <Text style={[styles.uploadBtnTxt, cfg.canReupload && { color: cfg.color }]}>Upload</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </Animated.View>
    );
}

function AgencyDocCard({ doc, index, onView }) {
    const fade = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fade, { toValue: 1, duration: 240, delay: index * 60, useNativeDriver: true }).start();
    }, []);

    const displayName =
        doc.documentName
        || doc.documentType
        || (doc.documentCategory === 'COE'           ? 'Confirmation of Enrollment'
           : doc.documentCategory === 'offer_letter'  ? 'Offer Letter'
           : doc.fileName?.replace(/\.[^/.]+$/, '')   || 'Document');

    const isCritical = doc.documentCategory === 'COE' || doc.documentCategory === 'offer_letter';

    return (
        <Animated.View style={{ opacity: fade }}>
            <View style={[styles.agencyCard, isCritical && { borderColor: C.blueBorder }]}>
                <PDFThumb url={doc.fileURL} size={52} />
                <View style={styles.agencyMeta}>
                    <Text style={styles.agencyName} numberOfLines={2}>{displayName}</Text>
                    {!!fmtDate(doc.createdAt) && (
                        <Text style={styles.agencyDate}>Received {fmtDate(doc.createdAt)}</Text>
                    )}
                    <TouchableOpacity style={styles.viewBtn} onPress={() => onView(doc.fileURL)} activeOpacity={0.7}>
                        <Text style={styles.viewBtnTxt}>View</Text>
                    </TouchableOpacity>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: C.greenSoft }]}>
                    <Text style={[styles.statusBadgeTxt, { color: C.green }]}>Received</Text>
                </View>
            </View>
        </Animated.View>
    );
}

function Header({ title, onBack }) {
    return (
        <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <Ionicons name="chevron-back" size={rs(22, 18, 26)} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: rs(36, 30, 44) }} />
        </View>
    );
}
function Stat({ label, value, color }) {
    return (
        <View style={styles.stat}>
            <Text style={[styles.statNum, !!color && { color }]}>{value}</Text>
            <Text style={styles.statLbl}>{label}</Text>
        </View>
    );
}
function StickyBar({ children, insets }) {
    return <View style={[styles.stickyBar, { paddingBottom: insets.bottom || rs(16, 12, 24) }]}>{children}</View>;
}
function PrimaryButton({ label, onPress }) {
    return (
        <TouchableOpacity style={styles.primaryBtn} onPress={onPress} activeOpacity={0.85}>
            <Text style={styles.primaryBtnTxt}>{label}</Text>
        </TouchableOpacity>
    );
}

export default function DocumentUpload({ stage, serverStage, onStageChange, onRefresh, onBack, onGoHome }) {
    const insets        = useSafeAreaInsets();
    const { userToken } = useAuth();

    const [checklistDocs, setChecklistDocs] = useState([]);
    const [agencyDocs,    setAgencyDocs]    = useState([]);
    const [refreshing,    setRefreshing]    = useState(false);
    const [initialLoad,   setInitialLoad]   = useState(true);
    const [uploadingId,   setUploadingId]   = useState(null);
    const [showComplete,  setShowComplete]  = useState(false);

    const fetchDocs = useCallback(async (pull = false) => {
        if (!stage) return;
        if (pull) setRefreshing(true);
        try {
            if (stage === 'document_waitlist') {
                const res  = await fetch(`${Config.API_BASE_URL}/students/documents`, { headers: { Authorization: `Bearer ${userToken}` } });
                const json = await res.json();
                if (res.ok && json.data) {
                    setAgencyDocs(json.data.filter(d => ['agent','agency'].includes(d.uploaderModel?.toLowerCase())));
                }
            } else {
                const res  = await fetch(`${Config.API_BASE_URL}/students/documents/status?stage=${stage}`, { headers: { Authorization: `Bearer ${userToken}` } });
                const json = await res.json();
                if (res.ok && json.data) {
                    setChecklistDocs(json.data.map(item => ({
                        id:                 item._id,
                        requiredDocumentId: item.requiredDocument?._id,
                        name:               item.requiredDocument?.name || 'Document',
                        description:        item.requiredDocument?.description || '',
                        status:             item.status || 'pending',
                        rejectionReason:    item.rejectionReason,
                        file: item.document ? {
                            id:         item.document._id,
                            fileName:   item.document.fileName,
                            fileURL:    item.document.fileURL,
                            uploadedAt: item.document.createdAt || item.uploadedAt,
                        } : null,
                    })));
                }
            }
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Could not load documents', text2: err.message });
        } finally {
            setRefreshing(false);
            setInitialLoad(false);
        }
    }, [stage, userToken]);

    useEffect(() => {
        if (stage) { setInitialLoad(true); fetchDocs(false); }
    }, [stage]);

    const handleUpload = async (doc) => {
        try {
            setUploadingId(doc.id);
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
            if (result.canceled) return;
            const asset = result.assets[0];

            const sasRes = await fetch(`${Config.API_BASE_URL}/students/uploads/sas`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mimeType: asset.mimeType || 'application/pdf', size: asset.size, documentType: doc.name, stage, requiredDocumentId: doc.requiredDocumentId }),
            });
            if (!sasRes.ok) throw new Error((await sasRes.json()).message || 'Upload URL failed');
            const { sasUrl, blobName } = await sasRes.json();

            const blob  = await (await fetch(asset.uri)).blob();
            const upRes = await fetch(sasUrl, { method: 'PUT', body: blob, headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': asset.mimeType || 'application/pdf' } });
            if (!upRes.ok) throw new Error('Storage upload failed');

            const confRes = await fetch(`${Config.API_BASE_URL}/students/uploads/confirm`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ blobName, mimeType: asset.mimeType || 'application/pdf', size: asset.size, fileName: asset.name, documentType: doc.name, requiredDocumentId: doc.requiredDocumentId, checklistId: doc.id, stage }),
            });
            if (!confRes.ok) throw new Error((await confRes.json()).message || 'Confirm failed');

            Toast.show({ type: 'success', text1: 'Uploaded', text2: 'Now under review.' });
            await fetchDocs(false);
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Upload failed', text2: err.message });
        } finally {
            setUploadingId(null);
        }
    };

    const handleView    = (url) => Linking.openURL(url).catch(() => Toast.show({ type: 'error', text1: 'Cannot open document' }));
    const handleRefresh = () => { fetchDocs(true); onRefresh?.(); };

    const uploaded    = checklistDocs.filter(d => !!d.file).length;
    const approved    = checklistDocs.filter(d => d.status === 'approved').length;
    const needsAction = checklistDocs.filter(d => ['rejected','reupload'].includes(d.status)).length;
    const total       = checklistDocs.length;
    const pct         = total > 0 ? Math.round((approved / total) * 100) : 0;
    const allApproved = total > 0 && approved === total;

    const hasCOE         = agencyDocs.some(d => d.documentCategory === 'COE');
    const hasOfferLetter = agencyDocs.some(d => d.documentCategory === 'offer_letter');
    const canProceedToVisa = hasCOE || hasOfferLetter;

    // ── WAITLIST VIEW ──
    if (stage === 'document_waitlist') {
        return (
            <View style={[styles.root, { paddingTop: insets.top }]}>
                <Header title="Agency Documents" onBack={onBack} />
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.blue} colors={[C.blue]} />}
                >
                    {agencyDocs.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>No documents yet</Text>
                            <Text style={styles.emptySub}>Pull down to check for updates from your agency.</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.sectionLabel}>
                                {agencyDocs.length} document{agencyDocs.length !== 1 ? 's' : ''} received
                            </Text>
                            {agencyDocs.map((doc, i) => (
                                <AgencyDocCard key={doc._id || i} doc={doc} index={i} onView={handleView} />
                            ))}
                        </>
                    )}
                    <View style={{ height: rs(100, 80, 120) }} />
                </ScrollView>

                {canProceedToVisa && (
                    <StickyBar insets={insets}>
                        <PrimaryButton label="Proceed to Visa Stage" onPress={() => onStageChange('visa')} />
                    </StickyBar>
                )}
            </View>
        );
    }

    // ── CHECKLIST VIEW ──
    const title = stage === 'admission' ? 'Admission Documents' : 'Visa Documents';

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <Header title={title} onBack={onBack} />

            {initialLoad ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={C.blue} />
                    <Text style={styles.loaderTxt}>Loading checklist…</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={styles.scroll}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.blue} colors={[C.blue]} />}
                    >
                        {/* Summary card */}
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryStatsRow}>
                                <Stat label="Uploaded"      value={uploaded} />
                                <View style={styles.statSep} />
                                <Stat label="Approved"      value={approved}    color={C.green} />
                                <View style={styles.statSep} />
                                <Stat label="Action Needed" value={needsAction} color={needsAction > 0 ? C.red : C.ink3} />
                                <View style={styles.statSep} />
                                <Stat label="Total"         value={total} />
                            </View>
                            <View style={styles.progLabelRow}>
                                <Text style={styles.progLbl}>Approval progress</Text>
                                <Text style={[styles.progPct, { color: pct === 100 ? C.green : C.blue }]}>{pct}%</Text>
                            </View>
                            <View style={styles.track}>
                                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: pct === 100 ? C.green : C.blue }]} />
                            </View>
                        </View>

                        {needsAction > 0 && (
                            <View style={styles.alertBox}>
                                <Text style={styles.alertTxt}>
                                    {needsAction} document{needsAction > 1 ? 's' : ''} need{needsAction === 1 ? 's' : ''} your attention
                                </Text>
                            </View>
                        )}

                        {total > 0 && (
                            <Text style={styles.sectionLabel}>Checklist · {total} items</Text>
                        )}

                        {total === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyTitle}>No checklist yet</Text>
                                <Text style={styles.emptySub}>Your officer hasn't assigned documents yet.</Text>
                            </View>
                        ) : checklistDocs.map((doc, i) => (
                            <DocCard
                                key={doc.id}
                                doc={doc}
                                index={i}
                                uploading={uploadingId === doc.id}
                                onUpload={handleUpload}
                                onView={handleView}
                            />
                        ))}

                        <View style={{ height: rs(100, 80, 120) }} />
                    </ScrollView>

                    {allApproved && (
                        <StickyBar insets={insets}>
                            <PrimaryButton
                                label={stage === 'admission' ? 'View Agency Documents' : 'Complete Application'}
                                onPress={() => {
                                    if (stage === 'admission') onStageChange('document_waitlist');
                                    else setShowComplete(true);
                                }}
                            />
                        </StickyBar>
                    )}
                </View>
            )}

            <CompletionModal
                visible={showComplete}
                onGoHome={() => { setShowComplete(false); onGoHome?.(); }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root:      { flex: 1, backgroundColor: C.bg },
    loader:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: rs(12, 8, 16) },
    loaderTxt: { fontSize: rf(14), color: C.ink2 },

    header: {
        backgroundColor: C.blue,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: rs(16, 12, 24),
        paddingTop:        rs(14, 10, 20),
        paddingBottom:     rs(18, 14, 24),
        borderBottomLeftRadius:  rs(20, 14, 28),
        borderBottomRightRadius: rs(20, 14, 28),
    },
    backBtn: {
        width:  rs(36, 30, 44),
        height: rs(36, 30, 44),
        borderRadius: rs(18, 15, 22),
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: rf(17), fontWeight: '700', color: '#fff' },
    scroll:      { padding: rs(16, 12, 24) },

    sectionLabel: {
        fontSize: rf(11), fontWeight: '700', color: C.ink3,
        letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: rs(10, 8, 14),
    },

    summaryCard: {
        backgroundColor: C.surface,
        borderRadius: rs(14, 10, 18),
        padding:      rs(16, 12, 22),
        borderWidth: 1, borderColor: C.divider,
        marginBottom: rs(14, 10, 18),
    },
    summaryStatsRow: { flexDirection: 'row', marginBottom: rs(14, 10, 18) },
    stat:    { flex: 1, alignItems: 'center' },
    statSep: { width: 1, backgroundColor: C.divider },
    statNum: { fontSize: rf(18), fontWeight: '800', color: C.blue },
    statLbl: { fontSize: rf(10), color: C.ink3, marginTop: 2, fontWeight: '500' },

    progLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: rs(5, 4, 7) },
    progLbl: { fontSize: rf(12), color: C.ink2 },
    progPct: { fontSize: rf(12), fontWeight: '700' },
    track:   { height: rs(5, 4, 7), backgroundColor: C.divider, borderRadius: rs(3, 2, 4), overflow: 'hidden' },
    fill:    { height: '100%', borderRadius: rs(3, 2, 4) },

    alertBox: {
        backgroundColor: C.redSoft,
        borderRadius: rs(8, 6, 12),
        padding:      rs(11, 8, 14),
        marginBottom: rs(14, 10, 18),
        borderWidth: 1, borderColor: C.redBorder,
    },
    alertTxt: { fontSize: rf(13), fontWeight: '600', color: C.red },

    docCard: {
        backgroundColor: C.surface,
        borderRadius: rs(12, 8, 16),
        padding:      rs(14, 10, 20),
        marginBottom: rs(10, 8, 14),
        borderWidth: 1, borderColor: C.divider,
        borderLeftWidth: rs(3, 3, 4),
    },
    docCardAlert: { borderColor: C.redBorder, backgroundColor: '#FEFAFA' },
    dcHeader:     { flexDirection: 'row', alignItems: 'center', gap: rs(10, 7, 14), marginBottom: rs(8, 6, 12) },
    dcIndex: {
        width:  rs(23, 18, 30),
        height: rs(23, 18, 30),
        borderRadius: rs(6, 4, 8),
        backgroundColor: C.blueSoft,
        justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },
    dcIndexTxt: { fontSize: rf(11), fontWeight: '700', color: C.blue },
    dcName:     { flex: 1, fontSize: rf(14), fontWeight: '600', color: C.ink1, lineHeight: rf(19) },
    dcDesc:     { fontSize: rf(12), color: C.ink2, marginBottom: rs(10, 8, 14), lineHeight: rf(17) },

    statusBadge:    { paddingHorizontal: rs(8, 6, 11), paddingVertical: rs(3, 2, 4), borderRadius: rs(7, 5, 9) },
    statusBadgeTxt: { fontSize: rf(10), fontWeight: '600' },

    dcFileRow:  { flexDirection: 'row', gap: rs(12, 8, 16), marginBottom: rs(10, 8, 14), alignItems: 'flex-start' },
    dcFileMeta: { flex: 1, gap: rs(3, 2, 5) },
    dcDocLabel: { fontSize: rf(13), fontWeight: '600', color: C.ink1 },
    dcFileDate: { fontSize: rf(11), color: C.ink3 },

    viewBtn: {
        marginTop: rs(6, 4, 8), alignSelf: 'flex-start',
        paddingVertical:   rs(5, 4, 7),
        paddingHorizontal: rs(12, 9, 16),
        borderRadius: rs(7, 5, 9),
        borderWidth: 1, borderColor: C.divider,
        backgroundColor: C.bg,
    },
    viewBtnTxt: { fontSize: rf(12), fontWeight: '600', color: C.ink2 },

    rejectBox: {
        backgroundColor: C.redSoft,
        borderRadius: rs(7, 5, 10),
        padding:      rs(9, 7, 12),
        marginBottom: rs(10, 8, 14),
        borderWidth: 1, borderColor: C.redBorder,
    },
    rejectTxt: { fontSize: rf(12), lineHeight: rf(17) },

    uploadBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: rs(6, 4, 8),
        backgroundColor: C.blue,
        borderRadius:    rs(8, 6, 11),
        paddingVertical: rs(10, 8, 13),
    },
    uploadBtnTxt: { fontSize: rf(13), fontWeight: '600', color: '#fff' },
    uploadingRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: rs(8, 6, 10), paddingVertical: rs(10, 8, 13),
    },
    uploadingTxt: { fontSize: rf(13), color: C.ink2 },

    agencyCard: {
        flexDirection: 'row', alignItems: 'center', gap: rs(12, 8, 16),
        backgroundColor: C.surface,
        borderRadius: rs(12, 8, 16),
        padding:      rs(14, 10, 20),
        marginBottom: rs(10, 8, 14),
        borderWidth: 1, borderColor: C.divider,
    },
    agencyMeta: { flex: 1, gap: rs(2, 1, 4) },
    agencyName: { fontSize: rf(13), fontWeight: '600', color: C.ink1, lineHeight: rf(18) },
    agencyDate: { fontSize: rf(11), color: C.ink3 },

    emptyCard: {
        backgroundColor: C.surface,
        borderRadius: rs(12, 8, 16),
        padding:      rs(36, 24, 48),
        alignItems: 'center', gap: rs(6, 4, 8),
        borderWidth: 1, borderColor: C.divider,
    },
    emptyTitle: { fontSize: rf(14), fontWeight: '600', color: C.ink2 },
    emptySub:   { fontSize: rf(12), color: C.ink3, textAlign: 'center', lineHeight: rf(17) },

    stickyBar: {
        backgroundColor: C.surface,
        paddingHorizontal: rs(16, 12, 24),
        paddingTop: rs(12, 10, 16),
        borderTopWidth: 1, borderTopColor: C.divider,
    },
    primaryBtn: {
        backgroundColor: C.blue,
        borderRadius:    rs(11, 8, 15),
        paddingVertical: rs(14, 11, 18),
        alignItems: 'center', justifyContent: 'center',
    },
    primaryBtnTxt: { fontSize: rf(15), fontWeight: '700', color: '#fff' },

    thumbPlaceholder: {
        borderRadius: rs(7, 5, 9),
        borderWidth: 1, borderColor: C.divider,
        backgroundColor: C.surface,
        padding: rs(5, 4, 7),
        overflow: 'hidden', position: 'relative',
        justifyContent: 'center', alignItems: 'center',
    },
    thumbFold: {
        position: 'absolute', top: 0, right: 0,
        width: rs(10, 8, 13), height: rs(10, 8, 13),
        backgroundColor: C.divider,
        borderBottomLeftRadius: rs(4, 3, 5),
    },
    thumbLines: {
        position: 'absolute', bottom: rs(8, 6, 10),
        left: rs(8, 6, 10), right: rs(8, 6, 10),
        gap: rs(2.5, 2, 3.5),
    },
    thumbLine: { height: rs(2.5, 2, 3.5), backgroundColor: C.divider, borderRadius: 2 },

    completionBg:   { flex: 1, backgroundColor: 'rgba(15,20,35,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: rs(24, 16, 40) },
    completionCard: {
        backgroundColor: C.surface,
        borderRadius: rs(20, 14, 26),
        padding:      rs(28, 20, 36),
        alignItems: 'center', width: '100%',
        maxWidth: IS_TABLET ? 480 : 340,
        borderWidth: 1, borderColor: C.divider,
    },
    completionTitle:  { fontSize: rf(22), fontWeight: '800', color: C.ink1, marginBottom: rs(10, 8, 14) },
    completionSub:    { fontSize: rf(14), color: C.ink2, textAlign: 'center', lineHeight: rf(21), marginBottom: rs(22, 16, 28) },
    completionBtn:    { backgroundColor: C.blue, borderRadius: rs(10, 7, 13), paddingVertical: rs(13, 10, 16), paddingHorizontal: rs(32, 22, 44) },
    completionBtnTxt: { fontSize: rf(15), fontWeight: '700', color: '#fff' },
});