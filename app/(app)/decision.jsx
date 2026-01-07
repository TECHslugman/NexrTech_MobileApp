import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Pressable,
  Animated,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Easing } from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bg: '#F6F9FC',
  headerText: '#87A1C5',
  accent: '#769FCD',
  cardBg: '#FFFFFF',
  cardBorder: '#E6EEF7',
  inputBg: '#F7FBFC',
  inputBorder: '#D6E6F2',
  text: '#1E1E1E',
  textMuted: '#7B7B7B',
  link: '#9AA7BC',
  star: '#F2C265',
  starEmpty: '#DCE6F5',
  listBg: '#F7FBFF',
  success: '#57C785',
};

// --- API CONFIG ---
const API_URL = 'https://edu-agent-backend-nine.vercel.app/api/v1/agency/';

const CARD_HEIGHT = 172;


function ProgressBar({ value, height = 5, color = COLORS.success }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{ width: '100%', height, backgroundColor: '#E9F3ED', borderRadius: height / 2, overflow: 'hidden', borderWidth: 1, borderColor: '#DAE9E1' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

function StatTile({ label, value, suffix, icon }) {
  return (
    <View style={styles.statTile}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>
        {value}
        {suffix || ''}
      </Text>
    </View>
  );
}

function StatVisaFull({ percent, rate }) {
  return (
    <View style={styles.statCardFull}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name="shield" size={14} color={COLORS.accent} />
          <Text style={styles.statLabel}>Visa Success</Text>
        </View>
        <Text style={[styles.statValue, { fontSize: 15 }]}>{percent}%</Text>
      </View>
      <View style={{ marginTop: 6 }}>
        <ProgressBar value={rate || 0} />
      </View>
    </View>
  );
}

function DropSection({ icon, title, children, open, onToggle }) {
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [contentH, setContentH] = useState(0);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [open]);

  const height = anim.interpolate({ inputRange: [0, 1], outputRange: [0, contentH] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });

  return (
    <View>
      <TouchableOpacity onPress={onToggle} style={styles.filterRow} activeOpacity={0.85}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name={icon} size={16} color={COLORS.accent} />
          <Text style={styles.filterRowText}>{title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="chevron-down" size={18} color="#6B7280" />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={{
          height,
          overflow: 'hidden',
          backgroundColor: COLORS.listBg,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: COLORS.cardBorder,
          marginBottom: 10,
        }}
      >
        <View style={{ paddingVertical: 6 }} onLayout={(e) => setContentH(e.nativeEvent.layout.height)}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

function OptionRow({ label, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.optionRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Feather
          name={selected ? 'check-circle' : 'circle'}
          size={18}
          color={selected ? COLORS.accent : '#C6CFDA'}
        />
        <Text style={{ color: COLORS.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { userToken } = useAuth();

  // --- STATE ---
  const [dynamicOptions, setDynamicOptions] = useState({ countries: [], levels: [], cities: [] });
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [openCardId, setOpenCardId] = useState(null);
  const slideAnimRefs = useRef({});

  // Filter States
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [minRating, setMinRating] = useState(0);

  // Dropdown States
  const [openCountry, setOpenCountry] = useState(true);
  const [openLevel, setOpenLevel] = useState(false);
  const [openCity, setOpenCity] = useState(false);

  // Sheet States
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });
  const sheetTranslateX = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_WIDTH, 0] });

  // --- DATA FETCHING ---
  const fetchAgencies = async (isRefresh = false) => {
    if (!userToken) return;

    try {
      isRefresh ? setRefreshing(true) : setLoading(true);

      console.log("DEBUG: Sending Token ->", userToken);
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      });

      // ----------------------------
      if (!response.ok) {
        console.log(`Fetch failed with status: ${response.status}`);
        const errorText = await response.text();
        console.log("DECISION PAGE ERROR RAW:", errorText);
        throw new Error(`Server Error: ${response.status}`);
      }
      // ----------------------------

      if (!response.ok) throw new Error('Could not connect to database');

      const jsonResponse = await response.json();
      const rawData = jsonResponse.agency;
      const agenciesArray = Array.isArray(rawData) ? rawData : [rawData];

      const formattedData = agenciesArray.map((item) => ({
        ...item,
        id: item._id,

        // FRONT OF CARD
        name: item.organizationName || "Unknown Agency",
        imageUri: item.logo || null,

        // BACK OF CARD
        stats: {
          placed: item.studentsPlaced || 0,
          visaRate: item.visaRate || 0.90,
          partners: item.partnerUniversities?.length || 0,
        },

        // FILTERING DATA
        city: item.address ? item.address.split(',')[0].trim() : 'Bhutan',
        country: item.country || 'Bhutan',
        rating: item.rating || 5.0, // Default to 5 if null
        levels: item.levels || ['Undergraduate'],
      }));

      setAgencies(formattedData);

    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    if (userToken) {
      fetchAgencies();
    }
  }, [userToken]);

  useEffect(() => {
    if (agencies.length > 0) {
      const uniqueCountries = [...new Set(agencies.map(a => a.country).filter(Boolean))];
      const uniqueCities = [...new Set(agencies.map(a => a.city).filter(Boolean))];
      const uniqueLevels = [...new Set(agencies.flatMap(a => a.levels || []).filter(Boolean))];

      setDynamicOptions({
        countries: uniqueCountries.sort(),
        cities: uniqueCities.sort(),
        levels: uniqueLevels.sort(),
      });
    }
  }, [agencies]);

  const openSheet = () => {
    setSheetOpen(true);
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 240,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => finished && setSheetOpen(false));
  };

  const toggleIn = (arr, setArr, value) => {
    setArr((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agencies.filter((a) => {
      const matchesText = !q || a.name.toLowerCase().includes(q) || (a.subtitle || '').toLowerCase().includes(q);
      const matchesCountry = selectedCountries.length === 0 || selectedCountries.includes(a.country);
      const matchesLevel = selectedLevels.length === 0 || selectedLevels.some((lvl) => (a.levels || []).includes(lvl));
      const matchesCity = selectedCities.length === 0 || selectedCities.includes(a.city);
      const matchesRating = (a.rating || 0) >= (minRating || 0);
      return matchesText && matchesCountry && matchesLevel && matchesCity && matchesRating;
    });
  }, [agencies, query, selectedCountries, selectedLevels, selectedCities, minRating]);

  const handleLearnMore = (item) => {
    router.push({
      pathname: `/agency/${item.id}`,
      params: {
        id: item.id,
        name: item.name,
        heroUri: item.imageUri || ''
      },
    });
  };

  const getSlideAnim = (id) => {
    if (!slideAnimRefs.current[id]) {
      slideAnimRefs.current[id] = new Animated.Value(0);
    }
    return slideAnimRefs.current[id];
  };

  const handleCardPress = (item) => {
    const id = item.id;
    const slideAnim = getSlideAnim(id);
    if (openCardId === id) {
      Animated.timing(slideAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => setOpenCardId(null));
    } else {
      if (openCardId) Animated.timing(getSlideAnim(openCardId), { toValue: 0, duration: 100, useNativeDriver: true }).start();
      setOpenCardId(id);
      Animated.timing(slideAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  };

  const closeAllCards = () => {
    if (openCardId) {
      Animated.timing(getSlideAnim(openCardId), { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setOpenCardId(null));
    }
  };

  const Front = ({ item }) => {
    const source = item.imageUri
      ? { uri: item.imageUri } : item.image;

    return (
      <View style={styles.frontFill}>
        {source ? (
          <Image
            source={source}
            style={styles.fullImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.fullImage, { backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' }]}>
            <Feather name="image" size={30} color="#CCC" />
          </View>
        )}

      </View>
    );
  };

  const Back = ({ item }) => {
    const s = item.stats || { placed: 0, visaRate: 0, partners: 0 };
    const visaPct = s.visaRate <= 1
      ? Math.round(s.visaRate * 100)
      : Math.round(s.visaRate);
    const barRate = s.visaRate > 1 ? s.visaRate / 100 : s.visaRate;

    return (
      <Pressable style={styles.backContainer} onPress={() => handleCardPress(item)}>
        <View style={styles.statsContent}>
          <View style={styles.statsGrid}>
            {/* Displays organizationName-based stats */}
            <StatTile
              label="Students Placed"
              value={s.placed || 0}
              icon={<Feather name="users" size={14} color={COLORS.accent} />}
            />

            <StatTile
              label="Partner Unis"
              value={s.partners || 0}
              icon={<Feather name="award" size={14} color={COLORS.accent} />}
            />

            {/* Pass the calculated percent and rate to the progress bar component */}
            <StatVisaFull percent={visaPct} rate={barRate} />
          </View>

          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => handleLearnMore(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.viewProfileText}>View profile →</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  const renderItem = ({ item }) => {
    if (!item || !item.id) return null;
    const slideAnim = getSlideAnim(item.id);
    const isOpen = openCardId === item.id;
    const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_WIDTH, 0] });
    return (
      <View style={styles.cardContainer}>
        <Pressable style={styles.card} onPress={() => handleCardPress(item)}>
          <Front item={item} />
        </Pressable>
        <Animated.View style={[styles.statsOverlay, { transform: [{ translateX }], opacity: slideAnim }]} pointerEvents={isOpen ? 'auto' : 'none'}>
          <Back item={item} />
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <Text style={styles.headerTitle}>Choose an Agency before{'\n'}proceeding with your application.</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Search" placeholderTextColor="#9CA3AF" style={styles.searchInput} returnKeyType="search" />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={openSheet}><Feather name="sliders" size={18} color={COLORS.accent} /></TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => fetchAgencies(true)}
          refreshing={refreshing}
          onScrollBeginDrag={closeAllCards}
          ListFooterComponent={<View style={{ height: 8 }} />}
        />
      )}

      {sheetOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={{ flex: 1 }} onPress={closeSheet} />
        </Animated.View>
      )}

      {sheetOpen && (
        <Animated.View style={[styles.sheet, { paddingTop: Math.max(insets.top + 6, 12), transform: [{ translateX: sheetTranslateX }] }]}>
          <View style={styles.sheetTopRow}>
            <TouchableOpacity onPress={closeSheet} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="chevron-left" size={22} color="#52606B" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Filter</Text>
            <View style={{ width: 32 }} />
          </View>
          <View style={styles.sheetSearchRow}>
            <View style={styles.searchBox}>
              <Feather name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search" placeholderTextColor="#9CA3AF" style={styles.searchInput} returnKeyType="search" />
            </View>
            <TouchableOpacity style={styles.sheetApply} onPress={closeSheet}><Text style={{ color: '#fff', fontWeight: '700' }}>Apply</Text></TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => { setSelectedCountries([]); setSelectedLevels([]); setSelectedCities([]); setMinRating(0); closeAllCards(); }} style={{ alignSelf: 'flex-end', marginBottom: 8 }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={styles.clearAll}>Clear all</Text>
          </TouchableOpacity>

          <DropSection icon="globe" title="Country" open={openCountry} onToggle={() => setOpenCountry(!openCountry)}>
            {dynamicOptions.countries.map((c, index) => (
              <OptionRow
                key={`country-${c}-${index}`}
                label={c}
                selected={selectedCountries.includes(c)}
                onPress={() => toggleIn(selectedCountries, setSelectedCountries, c)}
              />
            ))}
          </DropSection>

          <DropSection icon="book-open" title="Level" open={openLevel} onToggle={() => setOpenLevel(!openLevel)}>
            {dynamicOptions.levels.map((lv) => (
              <OptionRow
                key={lv}
                label={lv}
                selected={selectedLevels.includes(lv)}
                onPress={() => toggleIn(selectedLevels, setSelectedLevels, lv)}
              />
            ))}
          </DropSection>
          <DropSection icon="map-pin" title="City" open={openCity} onToggle={() => setOpenCity((s) => !s)}>
            {dynamicOptions.cities.map((ct) => (<OptionRow key={ct} label={ct} selected={selectedCities.includes(ct)} onPress={() => toggleIn(selectedCities, setSelectedCities, ct)} />))}
          </DropSection>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: {
    textAlign: 'center',
    color: COLORS.headerText,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 21,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, color: COLORS.text },
  filterBtn: {
    height: 42,
    width: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    height: 42,
    width: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardContainer: {
    marginBottom: 14,
    position: 'relative',
  },

  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    height: CARD_HEIGHT,
  },

  statsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    zIndex: 10,
  },

  backContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },

  statsContent: {
    flex: 1,
  },

  frontFill: { width: '100%', height: '100%' },
  fullImage: { width: '100%', height: '100%' },
  ratingBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: '#FFFFFFEE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 4,
    paddingHorizontal: 8,
    zIndex: 1,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statTile: {
    width: '48%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.listBg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  statCardFull: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  statLabel: { color: COLORS.headerText, fontWeight: '700', fontSize: 11 },
  statValue: { color: COLORS.text, fontWeight: '700', fontSize: 16, marginTop: 4 },

  viewProfileButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  viewProfileText: {
    color: COLORS.link,
    fontWeight: '700',
    fontSize: 14,
  },

  learnMore: { alignSelf: 'flex-end', color: COLORS.link, fontWeight: '700', fontSize: 12, marginTop: 6 },
  listContent: { padding: 16, paddingBottom: 18 },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000' },
  sheet: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: Math.min(SCREEN_WIDTH * 0.9, 380),
    backgroundColor: '#F7FBFF',
    borderLeftWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
  },
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF2FF',
  },
  sheetTitle: { color: COLORS.headerText, fontWeight: '700' },
  sheetSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sheetApply: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAll: { color: '#9AA7BC', fontWeight: '700', fontSize: 12 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  filterRowText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  optionRow: { paddingVertical: 10, paddingHorizontal: 12 },
});