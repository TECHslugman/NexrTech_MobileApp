// app/decision.jsx
import React, { useMemo, useRef, useState } from 'react';
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

const bodhi5 = require('../../assets/images/agencies/bodhi5.png');
const eduPro = require('../../assets/images/agencies/edupro.png');
const yarab = require('../../assets/images/agencies/yarab.png');
const globalreach = require('../../assets/images/agencies/globalreach.png');

const INITIAL_AGENCIES = [
  {
    id: 'bodhi5',
    name: 'BODHI5',
    subtitle: 'Education Consultancy & Placement Firm',
    image: bodhi5,
    imageUri: '',
    country: 'Australia',
    city: 'Thimphu',
    levels: ['Undergraduate', 'Postgraduate'],
    rating: 4.7,
    stats: { placed: 820, visaRate: 0.93, partners: 38 },
  },
  {
    id: 'educationpro',
    name: 'EducationPro',
    subtitle: 'Your Door to the Future',
    image: eduPro,
    imageUri: '',
    country: 'Australia',
    city: 'Phuentsholing',
    levels: ['Undergraduate'],
    rating: 4.3,
    stats: { placed: 610, visaRate: 0.88, partners: 24 },
  },
  {
    id: 'yarab',
    name: 'YARAB GLOBAL',
    subtitle: 'Education Consultancy & Placement Firm',
    image: yarab,
    imageUri: '',
    country: 'Canada',
    city: 'Thimphu',
    levels: ['Undergraduate', 'Postgraduate'],
    rating: 4.9,
    stats: { placed: 1040, visaRate: 0.96, partners: 45 },
  },
  {
    id: 'globalreach',
    name: 'GLOBAL REACH',
    subtitle: 'Education matters',
    image: globalreach,
    imageUri: '',
    country: 'Australia',
    city: 'Paro',
    levels: ['Postgraduate'],
    rating: 4.1,
    stats: { placed: 540, visaRate: 0.85, partners: 19 },
  },
];

const COUNTRY_OPTIONS = ['Australia', 'Canada'];
const LEVEL_OPTIONS = ['Undergraduate', 'Postgraduate'];
const CITY_OPTIONS = ['Thimphu', 'Paro', 'Phuentsholing'];

const CARD_HEIGHT = 172;

// Compact read-only star bar (front badge)
function StarRatingCompact({ rating, size = 12 }) {
  const filled = Math.round(rating);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <AntDesign
            key={i}
            name={i < filled ? 'star' : 'star'}
            size={size}
            color={i < filled ? COLORS.star : COLORS.starEmpty}
          />
        ))}
      </View>
      <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '600' }}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

// Thin progress bar (for visa success rate)
function ProgressBar({ value, height = 5, color = COLORS.success }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{ width: '100%', height, backgroundColor: '#E9F3ED', borderRadius: height / 2, overflow: 'hidden', borderWidth: 1, borderColor: '#DAE9E1' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

// Half-width stat tile
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

// Full-width Visa tile
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

// Animated list-style dropdown
function DropSection({ icon, title, children, open, onToggle }) {
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [contentH, setContentH] = useState(0);

  React.useEffect(() => {
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

function RatingSelector({ value, onChange }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 8 }}>Minimum rating</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => {
          const n = i + 1;
          const filled = value >= n;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ padding: 2 }}
              activeOpacity={0.85}
            >
              <AntDesign name={filled ? 'star' : 'star'} size={20} color={filled ? COLORS.star : COLORS.starEmpty} />
            </TouchableOpacity>
          );
        })}
        <Text style={{ color: COLORS.textMuted, fontWeight: '600', fontSize: 12 }}>
          {value > 0 ? `${value}+` : 'Any'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => onChange(5)}
        style={{ marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8 }}
        activeOpacity={0.85}
      >
        <AntDesign name={value >= 5 ? 'star' : 'star'} size={16} color={value >= 5 ? COLORS.star : COLORS.starEmpty} />
        <Text style={{ color: COLORS.text, fontWeight: '600', fontSize: 12 }}>Top recommended (5.0)</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();

  const [query, setQuery] = useState('');
  const [agencies] = useState(INITIAL_AGENCIES);

  // Track which card is open
  const [openCardId, setOpenCardId] = useState(null);
  const slideAnimRefs = useRef({});

  // Sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });
  const sheetTranslateX = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_WIDTH, 0] });

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

  // Dropdowns
  const [openCountry, setOpenCountry] = useState(true);
  const [openLevel, setOpenLevel] = useState(false);
  const [openCity, setOpenCity] = useState(false);
  const [openRating, setOpenRating] = useState(false);

  // Filters
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [minRating, setMinRating] = useState(0);

  // Logout Handler
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              console.log('Logged out successfully');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
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
      pathname: '/agency/[id]',
      params: { id: item.id, name: item.name, heroUri: item.imageUri || '' },
    });
  };

  // Get or create slide animation for a card
  const getSlideAnim = (id) => {
    if (!slideAnimRefs.current[id]) {
      slideAnimRefs.current[id] = new Animated.Value(0);
    }
    return slideAnimRefs.current[id];
  };

  // Handle card press (tap on card)
  const handleCardPress = (item) => {
    const id = item.id;
    const slideAnim = getSlideAnim(id);

    if (openCardId === id) {
      // Card is open, close it
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setOpenCardId(null);
      });
    } else {
      // Close any open card first
      if (openCardId) {
        const prevSlideAnim = getSlideAnim(openCardId);
        Animated.timing(prevSlideAnim, {
          toValue: 0,
          duration: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }

      // Open this card
      setOpenCardId(id);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  };

  // Close all cards
  const closeAllCards = () => {
    if (openCardId) {
      const slideAnim = getSlideAnim(openCardId);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setOpenCardId(null);
      });
    }
  };

  // FRONT: image + rating badge
  const Front = ({ item }) => {
    const source = item.imageUri ? { uri: item.imageUri } : item.image;
    return (
      <View style={styles.frontFill}>
        {source ? <Image source={source} style={styles.fullImage} resizeMode="contain" /> : <View style={styles.fullImage} />}
        <View style={styles.ratingBadge}>
          <StarRatingCompact rating={item.rating || 0} />
        </View>
      </View>
    );
  };

  // BACK: Stats overlay that slides in
  const Back = ({ item }) => {
    const s = item.stats || { placed: 0, visaRate: 0, partners: 0 };
    const visaPct = Math.round((s.visaRate || 0) * 100);

    return (
      <Pressable
        style={styles.backContainer}
        onPress={() => {
          const slideAnim = getSlideAnim(item.id);
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            setOpenCardId(null);
          });
        }}
      >
        <View style={styles.statsContent}>
          <View style={styles.statsGrid}>
            <StatTile
              label="Students Placed"
              value={s.placed}
              icon={<Feather name="users" size={14} color={COLORS.accent} />}
            />
            <StatTile
              label="Partner Unis"
              value={s.partners}
              icon={<Feather name="award" size={14} color={COLORS.accent} />}
            />
            <StatVisaFull percent={visaPct} rate={s.visaRate} />
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
    const slideAnim = getSlideAnim(item.id);
    const isOpen = openCardId === item.id;

    // Stats slide in from right to left
    const translateX = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [SCREEN_WIDTH, 0], // From off-screen right to position
    });

    return (
      <View style={styles.cardContainer}>
        {/* Card base (fixed in place) */}
        <Pressable
          style={styles.card}
          onPress={() => handleCardPress(item)}
        >
          <Front item={item} />
        </Pressable>

        {/* Stats overlay - slides in from right */}
        <Animated.View
          style={[
            styles.statsOverlay,
            {
              transform: [{ translateX }],
              opacity: slideAnim,
            }
          ]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <Back item={item} />
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <Text style={styles.headerTitle}>
          Choose an Agency before{'\n'}proceeding with your application.
        </Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={openSheet}>
            <Feather name="sliders" size={18} color={COLORS.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Feather name="log-out" size={18} color="#E63946" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{ height: 8 }} />}
        onScrollBeginDrag={closeAllCards} // Close cards when scrolling
      />

      {sheetOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={{ flex: 1 }} onPress={closeSheet} />
        </Animated.View>
      )}

      {sheetOpen && (
        <Animated.View
          style={[
            styles.sheet,
            { paddingTop: Math.max(insets.top + 6, 12), transform: [{ translateX: sheetTranslateX }] },
          ]}
        >
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
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity style={styles.sheetApply} onPress={closeSheet}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Apply</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => {
              setSelectedCountries([]);
              setSelectedLevels([]);
              setSelectedCities([]);
              setMinRating(0);
              closeAllCards();
            }}
            style={{ alignSelf: 'flex-end', marginBottom: 8 }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.clearAll}>Clear all</Text>
          </TouchableOpacity>

          <DropSection icon="globe" title="Country" open={openCountry} onToggle={() => setOpenCountry((s) => !s)}>
            {COUNTRY_OPTIONS.map((c) => (
              <OptionRow
                key={c}
                label={c}
                selected={selectedCountries.includes(c)}
                onPress={() => toggleIn(selectedCountries, setSelectedCountries, c)}
              />
            ))}
          </DropSection>

          <DropSection icon="book-open" title="Level" open={openLevel} onToggle={() => setOpenLevel((s) => !s)}>
            {LEVEL_OPTIONS.map((lv) => (
              <OptionRow
                key={lv}
                label={lv}
                selected={selectedLevels.includes(lv)}
                onPress={() => toggleIn(selectedLevels, setSelectedLevels, lv)}
              />
            ))}
          </DropSection>

          <DropSection icon="map-pin" title="City" open={openCity} onToggle={() => setOpenCity((s) => !s)}>
            {CITY_OPTIONS.map((ct) => (
              <OptionRow
                key={ct}
                label={ct}
                selected={selectedCities.includes(ct)}
                onPress={() => toggleIn(selectedCities, setSelectedCities, ct)}
              />
            ))}
          </DropSection>

          <DropSection icon="star" title="Rating" open={openRating} onToggle={() => setOpenRating((s) => !s)}>
            <RatingSelector value={minRating} onChange={setMinRating} />
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

  // Card container
  cardContainer: {
    marginBottom: 14,
    position: 'relative',
  },

  // Card (fixed in place)
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    height: CARD_HEIGHT,
  },

  // Stats overlay that slides in
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

  // Stats grid
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

  // View profile button
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