// BottomNavBar.js - Updated
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';

export const NAV_BAR_HEIGHT = 70; // Export for use in screens

const COLORS = {
  primary: '#769FCD',
  primaryLight: 'rgba(118, 159, 205, 0.1)',
  white: '#FFFFFF',
  border: '#EEF2F7',
  textInactive: '#94A3B8',
  disabled: '#CBD5E1',
  background: '#FFFFFF',
};

export default function BottomNavBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const [agencyId, setAgencyId] = useState(null);
  
  const scaleAnims = useRef(
    Array(4).fill(null).map(() => new Animated.Value(1))
  ).current;

  useEffect(() => {
    let foundAgencyId = params.agencyId || params.id;

    if (!foundAgencyId) {
      const segments = pathname.split('/');
      if (segments.includes('selected')) {
        const selectedIndex = segments.indexOf('selected');
        const potentialId = segments[selectedIndex + 1];
        
        const staticRoutes = ['profile', 'messages', 'events', 'courses', 'documentupload'];
        if (potentialId && !staticRoutes.includes(potentialId)) {
          foundAgencyId = potentialId;
        }
      }
    }

    if (foundAgencyId && foundAgencyId !== agencyId) {
      setAgencyId(foundAgencyId);
    }
  }, [pathname, params]);

  const navItems = [
    {
      name: 'Home',
      route: 'home',
      icon: 'home-outline',
      iconActive: 'home',
      getScreen: () => agencyId ? `/agency/selected/${agencyId}` : null,
    },
    {
      name: 'Messages',
      route: 'messages',
      icon: 'chatbubble-outline',
      iconActive: 'chatbubble',
      getScreen: () => '/agency/selected/messages',
    },
    {
      name: 'Docs',
      route: 'documentupload', 
      icon: 'document-outline',
      iconActive: 'document',
      getScreen: () => '/agency/selected/documentupload', 
    },
    {
      name: 'Profile',
      route: 'profile',
      icon: 'person-outline',
      iconActive: 'person',
      getScreen: () => '/agency/selected/profile',
    },
  ];

  const checkActive = (route) => {
    const segments = pathname.split('/');
    const currentRoute = segments[segments.length - 1];

    if (route === 'home') {
      return agencyId && currentRoute === agencyId;
    }
    return segments.includes(route);
  };

  const handlePressIn = (index) => {
    Animated.spring(scaleAnims[index], {
      toValue: 0.92,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (index) => {
    Animated.spring(scaleAnims[index], {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleNavigation = (screen) => {
    if (!screen) return;
    router.push({
      pathname: screen,
      params: { agencyId, refresh: Date.now() }
    });
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.navBar}>
        {navItems.map((item, index) => {
          const active = checkActive(item.route);
          const screen = item.getScreen();
          const canNavigate = !!screen;

          return (
            <TouchableOpacity
              key={item.name}
              style={styles.navItem}
              onPress={() => handleNavigation(screen)}
              onPressIn={() => handlePressIn(index)}
              onPressOut={() => handlePressOut(index)}
              disabled={!canNavigate}
              activeOpacity={1}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnims[index] }] }}>
                <Ionicons
                  name={active ? item.iconActive : item.icon}
                  size={22}
                  color={active ? COLORS.primary : (canNavigate ? COLORS.textInactive : COLORS.disabled)}
                />
              </Animated.View>
              
              <Text style={[
                styles.navLabel,
                active && styles.navLabelActive,
                !canNavigate && styles.navLabelDisabled
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navBar: {
    height: NAV_BAR_HEIGHT,
    flexDirection: 'row',
    paddingBottom: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 10,
    color: COLORS.textInactive,
    fontWeight: '500',
    marginTop: 2,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  navLabelDisabled: {
    color: COLORS.disabled,
  },
});