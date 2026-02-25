
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    ScrollView, RefreshControl, Linking, Modal, Animated, Image,
} from 'react-native';
import PdfThumbnail from 'react-native-pdf-thumbnail';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

// ─────────────────────────────────────────
// DESIGN TOKENS  — muted palette
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// STATUS CONFIG — muted colors, no icon in the badge (text only)
// ─────────────────────────────────────────
const STATUS = {
    pending:      { label: 'Not Uploaded',   color: C.ink3,   bg: C.divider,    accent: C.divider, canUpload: true,  canReupload: false },
    under_review: { label: 'Under Review',   color: C.violet, bg: C.violetSoft, accent: C.violet,  canUpload: false, canReupload: false },
    reupload:     { label: 'Needs Reupload', color: C.amber,  bg: C.amberSoft,  accent: C.amber,   canUpload: false, canReupload: true  },
    rejected:     { label: 'Rejected',       color: C.red,    bg: C.redSoft,    accent: C.red,     canUpload: false, canReupload: true  },
    approved:     { label: 'Approved',       color: C.green,  bg: C.greenSoft,  accent: C.green,   canUpload: false, canReupload: false },
};

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function fmtDate(str) {
    if (!str) return '';
    try { return new Date(str).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return ''; }
}

// ─────────────────────────────────────────
// PDF THUMBNAIL
//
// Uses react-native-pdf-thumbnail (native module).
// Given a URL it downloads/accesses the file and renders page 0 to a
// local image path, which we display in an <Image>.
// Falls back to a clean placeholder on error.
// ─────────────────────────────────────────
function PDFThumb({ url, label, size = 62 }) {
    const [thumbUri, setThumbUri] = useState(null);
    const [failed,   setFailed]   = useState(false);
    const h = Math.round(size * 1.4);

    useEffect(() => {
        let cancelled = false;
        if (!url) { setFailed(true); return; }

        PdfThumbnail.generate(url, 0)
            .then(result => {
                if (!cancelled) setThumbUri(result.uri);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });

        return () => { cancelled = true; };
    }, [url]);

    if (thumbUri) {
        return (
            <Image
                source={{ uri: thumbUri }}
                style={[styles.thumbImg, { width: size, height: h }]}
                resizeMode="cover"
            />
        );
    }

    // Placeholder while loading or on error
    return (
        <View style={[styles.thumbPlaceholder, { width: size, height: h }]}>
            <View style={styles.thumbFold} />
            <View style={styles.thumbLines}>
                {[86, 68, 90, 58, 76].map((w, i) => (
                    <View key={i} style={[styles.thumbLine, { width: `${w}%` }]} />
                ))}
            </View>
            {failed ? null : (
                <ActivityIndicator size="small" color={C.ink3} style={{ marginTop: 6 }} />
            )}
        </View>
    );
}

// ─────────────────────────────────────────
// COMPLETION MODAL
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// DOC CARD
// ─────────────────────────────────────────
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
                {/* ── Header: number · name · status badge (text only, no icon) ── */}
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

                {/* ── File preview row (thumbnail + checklist name + date + View btn) ── */}
                {hasFile && (
                    <View style={styles.dcFileRow}>
                        {/* Real PDF thumbnail via native module */}
                        <PDFThumb url={doc.file.fileURL} size={58} />

                        <View style={styles.dcFileMeta}>
                            {/* Show checklist name (e.g. "Passport"), NOT the raw filename */}
                            <Text style={styles.dcDocLabel}>{doc.name}</Text>
                            {!!fmtDate(doc.file.uploadedAt) && (
                                <Text style={styles.dcFileDate}>
                                    Uploaded {fmtDate(doc.file.uploadedAt)}
                                </Text>
                            )}
                            {/* Plain View button */}
                            <TouchableOpacity
                                style={styles.viewBtn}
                                onPress={() => onView(doc.file.fileURL)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.viewBtnTxt}>View</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Rejection reason ── */}
                {needsAction && !!doc.rejectionReason && (
                    <View style={styles.rejectBox}>
                        <Text style={[styles.rejectTxt, { color: cfg.color }]}>{doc.rejectionReason}</Text>
                    </View>
                )}

                {/* ── Upload / Re-upload action ── */}
                {uploading ? (
                    <View style={styles.uploadingRow}>
                        <ActivityIndicator size="small" color={C.blue} />
                        <Text style={styles.uploadingTxt}>Uploading…</Text>
                    </View>
                ) : (cfg.canUpload || cfg.canReupload) ? (
                    <TouchableOpacity
                        style={[
                            styles.uploadBtn,
                            cfg.canReupload && {
                                backgroundColor: 'transparent',
                                borderWidth: 1,
                                borderColor: cfg.color,
                            },
                        ]}
                        onPress={() => onUpload(doc)}
                        activeOpacity={0.82}
                    >
                        <Text style={[styles.uploadBtnTxt, cfg.canReupload && { color: cfg.color }]}>
                            {cfg.canReupload ? 'Re-upload' : 'Upload'}
                        </Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </Animated.View>
    );
}

// ─────────────────────────────────────────
// AGENCY DOC CARD
// ─────────────────────────────────────────
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
                {/* Real PDF thumbnail */}
                <PDFThumb url={doc.fileURL} size={52} />

                <View style={styles.agencyMeta}>
                    <Text style={styles.agencyName} numberOfLines={2}>{displayName}</Text>
                    {!!fmtDate(doc.createdAt) && (
                        <Text style={styles.agencyDate}>Received {fmtDate(doc.createdAt)}</Text>
                    )}
                    {/* Plain View button */}
                    <TouchableOpacity
                        style={styles.viewBtn}
                        onPress={() => onView(doc.fileURL)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.viewBtnTxt}>View</Text>
                    </TouchableOpacity>
                </View>

                {/* Received badge — text only */}
                <View style={[styles.statusBadge, { backgroundColor: C.greenSoft }]}>
                    <Text style={[styles.statusBadgeTxt, { color: C.green }]}>Received</Text>
                </View>
            </View>
        </Animated.View>
    );
}

// ─────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────
function Header({ title, onBack }) {
    return (
        <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 36 }} />
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
    return <View style={[styles.stickyBar, { paddingBottom: insets.bottom || 16 }]}>{children}</View>;
}
function PrimaryButton({ label, onPress }) {
    return (
        <TouchableOpacity style={styles.primaryBtn} onPress={onPress} activeOpacity={0.85}>
            <Text style={styles.primaryBtnTxt}>{label}</Text>
        </TouchableOpacity>
    );
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
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

    // ─────────────────────────────────────────
    // WAITLIST VIEW
    // ─────────────────────────────────────────
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
                    <View style={{ height: 100 }} />
                </ScrollView>

                {canProceedToVisa && (
                    <StickyBar insets={insets}>
                        <PrimaryButton label="Proceed to Visa Stage" onPress={() => onStageChange('visa')} />
                    </StickyBar>
                )}
            </View>
        );
    }

    // ─────────────────────────────────────────
    // CHECKLIST VIEW
    // ─────────────────────────────────────────
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
                        {/* ── Summary card ── */}
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

                        {/* Action alert */}
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

                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {allApproved && (
                        <StickyBar insets={insets}>
                            <PrimaryButton
                                label={stage === 'admission' ? 'Continue to Next Stage' : 'Complete Application'}
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

// ─────────────────────────────────────────
// STYLES — no shadows anywhere
// ─────────────────────────────────────────
const styles = StyleSheet.create({
    root:      { flex: 1, backgroundColor: C.bg },
    loader:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loaderTxt: { fontSize: 14, color: C.ink2 },

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
        letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10,
    },

    // ── Summary card — no shadow ──
    summaryCard: {
        backgroundColor: C.surface, borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: C.divider, marginBottom: 14,
    },
    summaryStatsRow: { flexDirection: 'row', marginBottom: 14 },
    stat:    { flex: 1, alignItems: 'center' },
    statSep: { width: 1, backgroundColor: C.divider },
    statNum: { fontSize: 18, fontWeight: '800', color: C.blue },
    statLbl: { fontSize: 10, color: C.ink3, marginTop: 2, fontWeight: '500' },

    progLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    progLbl: { fontSize: 12, color: C.ink2 },
    progPct: { fontSize: 12, fontWeight: '700' },
    track:   { height: 5, backgroundColor: C.divider, borderRadius: 3, overflow: 'hidden' },
    fill:    { height: '100%', borderRadius: 3 },

    // ── Alert ──
    alertBox: {
        backgroundColor: C.redSoft, borderRadius: 8, padding: 11, marginBottom: 14,
        borderWidth: 1, borderColor: C.redBorder,
    },
    alertTxt: { fontSize: 13, fontWeight: '600', color: C.red },

    // ── Doc card — no shadow ──
    docCard: {
        backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: C.divider, borderLeftWidth: 3,
    },
    docCardAlert: { borderColor: C.redBorder, backgroundColor: '#FEFAFA' },
    dcHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    dcIndex:      { width: 23, height: 23, borderRadius: 6, backgroundColor: C.blueSoft, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    dcIndexTxt:   { fontSize: 11, fontWeight: '700', color: C.blue },
    dcName:       { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink1, lineHeight: 19 },
    dcDesc:       { fontSize: 12, color: C.ink2, marginBottom: 10, lineHeight: 17 },

    // Status badge — text only, no icon
    statusBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
    statusBadgeTxt: { fontSize: 10, fontWeight: '600' },

    // File row
    dcFileRow:   { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
    dcFileMeta:  { flex: 1, gap: 3 },
    dcDocLabel:  { fontSize: 13, fontWeight: '600', color: C.ink1 },
    dcFileDate:  { fontSize: 11, color: C.ink3 },

    // View button — plain, text only
    viewBtn:    { marginTop: 6, alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: C.divider, backgroundColor: C.bg },
    viewBtnTxt: { fontSize: 12, fontWeight: '600', color: C.ink2 },

    rejectBox: { backgroundColor: C.redSoft, borderRadius: 7, padding: 9, marginBottom: 10, borderWidth: 1, borderColor: C.redBorder },
    rejectTxt: { fontSize: 12, lineHeight: 17 },

    uploadBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.blue, borderRadius: 8, paddingVertical: 10 },
    uploadBtnTxt: { fontSize: 13, fontWeight: '600', color: '#fff' },
    uploadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
    uploadingTxt: { fontSize: 13, color: C.ink2 },

    // ── Agency card — no shadow ──
    agencyCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: C.divider,
    },
    agencyMeta: { flex: 1, gap: 2 },
    agencyName: { fontSize: 13, fontWeight: '600', color: C.ink1, lineHeight: 18 },
    agencyDate: { fontSize: 11, color: C.ink3 },

    // ── Empty ──
    emptyCard:  { backgroundColor: C.surface, borderRadius: 12, padding: 36, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.divider },
    emptyTitle: { fontSize: 14, fontWeight: '600', color: C.ink2 },
    emptySub:   { fontSize: 12, color: C.ink3, textAlign: 'center', lineHeight: 17 },

    // ── Sticky / buttons ──
    stickyBar:     { backgroundColor: C.surface, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.divider },
    primaryBtn:    { backgroundColor: C.blue, borderRadius: 11, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    primaryBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

    // ── PDF thumbnail (real, from native module) ──
    thumbImg: {
        borderRadius: 7, borderWidth: 1, borderColor: C.divider,
    },

    // Placeholder shown while generating or on error
    thumbPlaceholder: {
        borderRadius: 7, borderWidth: 1, borderColor: C.divider,
        backgroundColor: C.surface, padding: 5,
        overflow: 'hidden', position: 'relative',
    },
    thumbFold:  { position: 'absolute', top: 0, right: 0, width: 10, height: 10, backgroundColor: C.divider, borderBottomLeftRadius: 4 },
    thumbLines: { gap: 2.5, marginTop: 8 },
    thumbLine:  { height: 2.5, backgroundColor: C.divider, borderRadius: 2 },

    // ── Completion modal ──
    completionBg:     { flex: 1, backgroundColor: 'rgba(15,20,35,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    completionCard:   { backgroundColor: C.surface, borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 340, borderWidth: 1, borderColor: C.divider },
    completionTitle:  { fontSize: 22, fontWeight: '800', color: C.ink1, marginBottom: 10 },
    completionSub:    { fontSize: 14, color: C.ink2, textAlign: 'center', lineHeight: 21, marginBottom: 22 },
    completionBtn:    { backgroundColor: C.blue, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 32 },
    completionBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});