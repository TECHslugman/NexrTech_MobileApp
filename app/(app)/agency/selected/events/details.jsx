import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, Alert, Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Config } from '../../../../config';

const SEAT_IMAGE_URL = 'https://cdn-icons-png.flaticon.com/512/1723/1723651.png';

const COLORS = {
    bg: '#F8FAFD',
    primary: '#769FCD',
    white: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    border: '#EEF2F7',
    booked: '#E53E3E',
    available: '#718096',
    selected: '#38A169',
    disabled: '#A0AEC0',
};

// MODAL 2: CONFIRMATION SUMMARY
const MultiSeatInfoModal = ({ visible, onClose, selectedSeats, onConfirm, registering }) => {
    const totalPrice = selectedSeats.reduce((sum, s) => sum + Number(s.price || 0), 0);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.infoModalOverlay}>
                <View style={styles.infoModalContent}>
                    <Text style={styles.infoTitle}>Confirm Selection</Text>
                    <View style={styles.infoDetailBox}>
                        <Text style={styles.infoLabel}>SELECTED SEATS ({selectedSeats.length})</Text>
                        <ScrollView style={{ maxHeight: 200 }}>
                            {selectedSeats.map((seat, index) => (
                                <View key={index} style={styles.multiSeatRow}>
                                    <View>
                                        <Text style={styles.boldText}>Seat {seat.label}</Text>
                                        <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>{seat.type}</Text>
                                    </View>
                                    <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Nu {seat.price}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        <View style={styles.divider} />
                        <View style={styles.multiSeatRow}>
                            <Text style={[styles.boldText, { fontSize: 18 }]}>Total Price</Text>
                            <Text style={[styles.boldText, { color: COLORS.primary, fontSize: 18 }]}>Nu {totalPrice}</Text>
                        </View>
                    </View>
                    <View style={styles.infoBtnRow}>
                        <TouchableOpacity style={styles.cancelSubBtn} onPress={onClose}>
                            <Text style={{ color: COLORS.primary }}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmSubBtn}
                            onPress={() => onConfirm(selectedSeats.map(s => s.id))}
                            disabled={registering}
                        >
                            {registering ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Confirm Booking</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// MODAL 1: SEATING GRID
const SeatingChartModal = ({ visible, onClose, seats, onConfirm, registering, eventId, isAlreadyRegistered }) => {
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [isSummaryVisible, setIsSummaryVisible] = useState(false);
    const [fetchingSeatId, setFetchingSeatId] = useState(null);
    const { userToken } = useAuth();

    const { processedRows, maxCols } = useMemo(() => {
        const rowsMap = {};
        let maxC = 0;
        (seats || []).forEach(seat => {
            if (!rowsMap[seat.row]) rowsMap[seat.row] = {};
            const colIdx = parseInt(seat.columns);
            rowsMap[seat.row][colIdx] = seat;
            if (colIdx > maxC) maxC = colIdx;
        });
        return { processedRows: rowsMap, maxCols: maxC };
    }, [seats]);

    const sortedRowKeys = Object.keys(processedRows).sort();

    const handleSeatToggle = async (seat) => {
        const isAlreadySelected = selectedSeats.some(s => s.id === seat._id);

        if (isAlreadySelected) {
            setSelectedSeats(selectedSeats.filter(s => s.id !== seat._id));
            return;
        }

        // Fetch individual seat info from Backend
        setFetchingSeatId(seat._id);
        try {
            const response = await fetch(`${Config.API_BASE_URL}/agency/events/profile/${seat._id}/seats/info`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const json = await response.json();

            if (response.ok && json.seat) {
                const sData = json.seat;
                setSelectedSeats([...selectedSeats, {
                    id: sData._id,
                    label: `${sData.row}${sData.columns}`,
                    price: sData.ticketTypes?.price || 0,
                    type: sData.ticketTypes?.name || 'Standard'
                }]);

                // Optional: Subtle feedback that a seat was added
                Toast.show({
                    type: 'success',
                    text1: 'Seat Added',
                    text2: `Row ${sData.row}, Seat ${sData.columns} added to selection.`,
                    visibilityTime: 1500
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Pricing Error',
                    text2: 'Could not fetch seat pricing.'
                });
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Connection Error',
                text2: 'Network error while fetching seat info.'
            });
        } finally {
            setFetchingSeatId(null);
        }
    };

    const handleReset = () => {
        setSelectedSeats([]);
    };

    // If already registered, disable all seat selection
    if (isAlreadyRegistered) {
        return (
            <Modal visible={visible} animationType="slide" transparent={true} statusBarTranslucent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
                            <Text style={styles.modalTitle}>Already Registered</Text>
                            <View style={{ width: 24 }} />
                        </View>
                        
                        <View style={styles.alreadyRegisteredContainer}>
                            <Ionicons name="checkmark-circle" size={80} color={COLORS.success || '#48BB78'} />
                            <Text style={styles.alreadyRegisteredTitle}>You're Already Registered!</Text>
                            <Text style={styles.alreadyRegisteredText}>
                                You have already registered for this event. You cannot register again.
                            </Text>
                            <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
                                <Text style={styles.closeModalBtnText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={true} statusBarTranslucent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
                        <Text style={styles.modalTitle}>Select Your Seats</Text>
                        <TouchableOpacity onPress={handleReset}><Text style={{ color: COLORS.booked, fontWeight: '600' }}>Reset</Text></TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContainer}>
                        <View style={styles.stageContainer}><View style={styles.stageLine} /><Text style={styles.stageText}>STAGE / SCREEN</Text></View>
                        {sortedRowKeys.map(rowKey => (
                            <View key={rowKey} style={styles.rowWrapper}>
                                <Text style={styles.rowLabel}>{rowKey}</Text>
                                <View style={styles.seatsRow}>
                                    {Array.from({ length: maxCols }, (_, i) => i + 1).map(colNum => {
                                        const seat = processedRows[rowKey][colNum];
                                        if (!seat) return <View key={`empty-${colNum}`} style={styles.seatPlaceholder} />;

                                        const isBooked = seat.isBooked;
                                        const isSelected = selectedSeats.some(s => s.id === seat._id);
                                        const isFetching = fetchingSeatId === seat._id;
                                        let seatColor = isBooked ? COLORS.booked : (isSelected ? COLORS.selected : COLORS.available);

                                        return (
                                            <TouchableOpacity
                                                key={seat._id}
                                                disabled={isBooked || isFetching}
                                                onPress={() => handleSeatToggle(seat)}
                                                style={styles.seatBtn}
                                            >
                                                {isFetching ? (
                                                    <ActivityIndicator size="small" color={COLORS.primary} style={{ width: 32, height: 32 }} />
                                                ) : (
                                                    <>
                                                        <Image source={{ uri: SEAT_IMAGE_URL }} style={[styles.seatIcon, { tintColor: seatColor }]} />
                                                        <Text style={[styles.seatNum, { color: seatColor }]}>{seat.columns}</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    {selectedSeats.length > 0 && (
                        <View style={styles.selectionBar}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.selectionCount}>{selectedSeats.length} Seats Selected</Text>
                                <Text style={styles.selectionList} numberOfLines={1}>
                                    {selectedSeats.map(s => s.label).join(', ')}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.selectionBtn} onPress={() => setIsSummaryVisible(true)}>
                                <Text style={styles.selectionBtnText}>Review Summary</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            <MultiSeatInfoModal
                visible={isSummaryVisible}
                selectedSeats={selectedSeats}
                onClose={() => setIsSummaryVisible(false)}
                onConfirm={onConfirm}
                registering={registering}
            />
        </Modal>
    );
};

export default function EventDetail() {
    const router = useRouter();
    const { id, eventImage } = useLocalSearchParams();
    const { userToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [checkingRegistration, setCheckingRegistration] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [data, setData] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);

    // Check if user is already registered for this event
    useEffect(() => {
        const checkRegistrationStatus = async () => {
            if (!userToken || !id) return;
            
            setCheckingRegistration(true);
            try {
                const response = await fetch(`${Config.API_BASE_URL}/students/events/registration/status/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                
                if (response.ok) {
                    const json = await response.json();
                    setIsRegistered(json.isRegistered || false);
                }
            } catch (error) {
                console.log("Registration check error:", error);
                // Don't show error to user, just assume not registered
                setIsRegistered(false);
            } finally {
                setCheckingRegistration(false);
            }
        };

        checkRegistrationStatus();
    }, [id, userToken]);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await fetch(`${Config.API_BASE_URL}/agency/events/profile/${id}`, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                const json = await response.json();
                if (response.ok && json.event) {
                    const e = json.event;
                    setData({
                        id: e._id, title: e.title, subtitle: e.subtitle,
                        image: e.bannerImageUrl || eventImage,
                        startAt: e.startAt, endAt: e.endAt,
                        venueName: e.location?.venueName,
                        addressLine: e.location?.addressLine,
                        description: e.description, about: e.about,
                        whoShouldAttend: e.whoShouldAttend,
                        agenda: e.agendaItems || [],
                        mode: e.meetings?.[0]?.mode || 'offline',
                        seats: e.seats || []
                    });
                }
            } catch (error) { 
                console.log("Fetch Error:", error); 
            } finally { 
                setLoading(false); 
            }
        };
        fetchDetail();
    }, [id]);

    const formatDateTime = (dateString) => {
        if (!dateString) return { date: "TBA", time: "", day: "" };
        const d = new Date(dateString);
        return {
            date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            day: d.toLocaleDateString('en-GB', { weekday: 'long' })
        };
    };

    const handleConfirmRegistration = async (seatIds = []) => {
        setRegistering(true);
        try {
            const res = await fetch(`${Config.API_BASE_URL}/students/events/registration/${id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ seatIds: seatIds })
            });

            const result = await res.json();
            if (res.ok) {
                setIsRegistered(true); // Update registration status
                Toast.show({
                    type: 'success',
                    text1: 'Registration Successful!',
                    text2: 'You have been registered for this event.',
                    visibilityTime: 2000
                });

                // Smooth transition: close modal and go back after toast shows
                setTimeout(() => {
                    setIsModalVisible(false);
                    router.back();
                }, 2100);

            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Registration Failed',
                    text2: result.message || "Something went wrong."
                });
            }
        } catch (e) {
            Toast.show({
                type: 'error',
                text1: 'Server Error',
                text2: 'Failed to connect to server.'
            });
        } finally {
            setRegistering(false);
        }
    };

    const handleRegisterPress = () => {
        if (isRegistered) {
            // Show already registered message
            Toast.show({
                type: 'info',
                text1: 'Already Registered',
                text2: 'You have already registered for this event.',
                visibilityTime: 2000
            });
            return;
        }
        
        if (data.mode === 'seated') {
            setIsModalVisible(true);
        } else {
            handleConfirmRegistration();
        }
    };

    if (loading || checkingRegistration || !data) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading event details...</Text>
            </View>
        );
    }

    const startInfo = formatDateTime(data.startAt);
    const endInfo = formatDateTime(data.endAt);

    // Determine button state
    const isButtonDisabled = isRegistered || registering;
    const buttonText = isRegistered 
        ? 'Already Registered' 
        : (data.mode === 'seated' ? 'Select Seats & Register' : 'Register for Event');

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#FFF" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Event Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <Image source={{ uri: data.image }} style={styles.eventImage} />
                <View style={styles.contentCard}>
                    <View style={styles.modeBadge}><Text style={styles.modeText}>{data.mode.toUpperCase()}</Text></View>
                    <Text style={styles.eventTitle}>{data.title}</Text>
                    {data.subtitle && <Text style={styles.subtitle}>{data.subtitle}</Text>}

                    <View style={styles.infoCardsContainer}>
                        <View style={styles.infoCard}>
                            <View style={[styles.infoIcon, { backgroundColor: '#EBF4FF' }]}><Feather name="calendar" size={18} color={COLORS.primary} /></View>
                            <View><Text style={styles.infoLabel}>STARTS ON</Text><Text style={styles.infoValue}>{startInfo.day}, {startInfo.date}</Text><Text style={styles.infoSub}>{startInfo.time}</Text></View>
                        </View>
                        <View style={styles.infoCard}>
                            <View style={[styles.infoIcon, { backgroundColor: '#FFF5F5' }]}><Feather name="clock" size={18} color={COLORS.booked} /></View>
                            <View><Text style={styles.infoLabel}>ENDS ON</Text><Text style={styles.infoValue}>{endInfo.day}, {endInfo.date}</Text><Text style={styles.infoSub}>{endInfo.time}</Text></View>
                        </View>
                        {data.mode !== 'online' && (
                            <View style={styles.infoCard}>
                                <View style={[styles.infoIcon, { backgroundColor: '#F0FFF4' }]}><Feather name="map-pin" size={18} color="#48BB78" /></View>
                                <View><Text style={styles.infoLabel}>LOCATION</Text><Text style={styles.infoValue}>{data.venueName}</Text><Text style={styles.infoSub}>{data.addressLine}</Text></View>
                            </View>
                        )}
                    </View>

                    {data.description && <View style={styles.section}><Text style={styles.sectionTitle}>Description</Text><Text style={styles.paragraph}>{data.description}</Text></View>}
                    {data.about && <View style={styles.section}><Text style={styles.sectionTitle}>About Event</Text><Text style={styles.paragraph}>{data.about}</Text></View>}
                    {data.whoShouldAttend && <View style={styles.section}><Text style={styles.sectionTitle}>Who Should Attend</Text><Text style={styles.paragraph}>{data.whoShouldAttend}</Text></View>}

                    {data.agenda?.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Agenda</Text>
                            {data.agenda.map((item, idx) => (
                                <View key={idx} style={styles.agendaRow}>
                                    <View style={styles.agendaDot} />
                                    <Text style={styles.paragraph}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    
                    {/* Show registration status badge if registered */}
                    {isRegistered && (
                        <View style={styles.registeredBadge}>
                            <Ionicons name="checkmark-circle" size={20} color="#48BB78" />
                            <Text style={styles.registeredBadgeText}>You have registered for this event</Text>
                        </View>
                    )}
                </View>
                <View style={{ height: 120 }} />
            </ScrollView>

            {data.mode === 'seated' && (
                <SeatingChartModal
                    visible={isModalVisible}
                    onClose={() => setIsModalVisible(false)}
                    seats={data.seats}
                    eventId={data.id}
                    onConfirm={handleConfirmRegistration}
                    registering={registering}
                    isAlreadyRegistered={isRegistered}
                />
            )}

            <View style={styles.stickyFooter}>
                <TouchableOpacity
                    style={[styles.mainBtn, isButtonDisabled && styles.disabledBtn]}
                    onPress={handleRegisterPress}
                    disabled={isButtonDisabled}
                >
                    {registering ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.mainBtnText}>{buttonText}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: COLORS.primary, fontSize: 14 },
    header: { height: 60, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    eventImage: { width: '100%', height: 250 },
    contentCard: { marginTop: -25, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
    modeBadge: { backgroundColor: COLORS.primary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8 },
    modeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    eventTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 15 },
    infoCardsContainer: { gap: 12, marginBottom: 24 },
    infoCard: { flexDirection: 'row', padding: 12, backgroundColor: COLORS.bg, borderRadius: 12, alignItems: 'center' },
    infoIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    infoLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: 'bold' },
    infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
    infoSub: { fontSize: 12, color: COLORS.textSecondary },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
    paragraph: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
    agendaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    agendaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginRight: 10 },
    stickyFooter: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: COLORS.border },
    mainBtn: { backgroundColor: COLORS.primary, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    disabledBtn: { backgroundColor: COLORS.disabled, opacity: 0.7 },
    mainBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    registeredBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F0FFF4', 
        padding: 12, 
        borderRadius: 8, 
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#C6F6D5'
    },
    registeredBadgeText: { 
        marginLeft: 8, 
        color: '#2F855A', 
        fontSize: 14,
        fontWeight: '500'
    },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', height: '85%', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', justifyContent: 'space-between' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    scrollContainer: { padding: 20 },
    stageContainer: { alignItems: 'center', marginBottom: 40 },
    stageLine: { width: '80%', height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 },
    stageText: { fontSize: 10, color: '#A0AEC0', marginTop: 10, letterSpacing: 2 },
    rowWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    rowLabel: { width: 30, fontSize: 14, fontWeight: 'bold', color: COLORS.textSecondary },
    seatsRow: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 15 },
    seatBtn: { alignItems: 'center' },
    seatIcon: { width: 32, height: 32 },
    seatNum: { fontSize: 10, fontWeight: 'bold', marginTop: 4 },
    seatPlaceholder: { width: 32, height: 32 },
    selectionBar: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFF', padding: 15, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE', elevation: 10 },
    selectionCount: { fontSize: 14, fontWeight: 'bold' },
    selectionList: { fontSize: 12, color: COLORS.textSecondary },
    selectionBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    selectionBtnText: { color: '#FFF', fontWeight: 'bold' },
    
    // Already Registered Modal
    alreadyRegisteredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alreadyRegisteredTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    alreadyRegisteredText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    closeModalBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
    },
    closeModalBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    
    // Info Modal Styles
    infoModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    infoModalContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
    infoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    infoDetailBox: { backgroundColor: COLORS.bg, padding: 15, borderRadius: 12, marginBottom: 20 },
    multiSeatRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
    divider: { height: 1, backgroundColor: '#DDD', marginVertical: 10 },
    boldText: { fontWeight: 'bold' },
    infoBtnRow: { flexDirection: 'row', gap: 10 },
    cancelSubBtn: { flex: 1, height: 45, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    confirmSubBtn: { flex: 1, height: 45, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }
});