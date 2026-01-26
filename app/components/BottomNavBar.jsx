// app/components/BottomNavBar.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';

const COLORS = {
  primary: '#769FCD',
  white: '#FFFFFF',
  border: '#EEF2F7',
  textInactive: '#BFC7D1',
  disabled: '#CCCCCC'
};

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const [agencyId, setAgencyId] = useState(null);

  useEffect(() => {
    let foundAgencyId = params.agencyId || params.id;

    // Fallback: extract from URL path if params are empty
    if (!foundAgencyId) {
      const segments = pathname.split('/');
      if (segments.includes('selected')) {
        const selectedIndex = segments.indexOf('selected');
        const potentialId = segments[selectedIndex + 1];
        
        // List of routes that are NOT IDs
        const staticRoutes = ['profile', 'updates', 'messages', 'events', 'courses'];
        if (potentialId && !staticRoutes.includes(potentialId)) {
          foundAgencyId = potentialId;
        }
      }
    }

    if (foundAgencyId !== agencyId) {
      setAgencyId(foundAgencyId);
    }
  }, [pathname, params]);

  const navItems = [
    {
      name: 'Home',
      route: 'home',
      icon: 'home',
      getScreen: () => agencyId ? `/agency/selected/${agencyId}` : null,
    },
    {
      name: 'Updates',
      route: 'updates',
      icon: 'refresh-outline',
      getScreen: () => '/agency/selected/updates',
    },
    {
      name: 'Messages',
      route: 'messages',
      icon: 'mail-outline',
      getScreen: () => '/agency/selected/messages',
    },
    {
      name: 'Profile',
      route: 'profile',
      icon: 'person-outline',
      getScreen: () => '/agency/selected/profile',
    },
  ];

  const checkActive = (route) => {
    const segments = pathname.split('/');
    const currentRoute = segments[segments.length - 1];

    if (route === 'home') {
      return agencyId && currentRoute === agencyId;
    }
    return currentRoute === route;
  };

  const handleNavigation = (screen, itemName) => {
    if (!screen) return;

    // Only log navigation actions (useful for debugging clicks)
    console.log(`🚀 Navigating to ${itemName}`);

    const needsAgencyId = ['Updates', 'Profile', 'Messages'].includes(itemName);

    if (needsAgencyId && agencyId) {
      router.push({
        pathname: screen,
        params: { agencyId, refresh: Date.now()} // Force refresh
      });
    } else {
      router.push(screen);
    }
  };

  return (
    <View style={styles.navBar}>
      {navItems.map((item) => {
        const active = checkActive(item.route);
        const screen = item.getScreen();
        const canNavigate = !!screen;

        return (
          <TouchableOpacity
            key={item.name}
            style={styles.navItem}
            onPress={() => handleNavigation(screen, item.name)}
            disabled={!canNavigate}
          >
            {active ? (
              <View style={styles.navIconActive}>
                <Ionicons name={item.icon} size={22} color={COLORS.white} />
              </View>
            ) : (
              <Ionicons
                name={item.icon}
                size={22}
                color={canNavigate ? COLORS.textInactive : COLORS.disabled}
              />
            )}
            <Text
              style={[
                styles.navLabel,
                active && styles.navLabelActive,
                !canNavigate && { color: COLORS.disabled }
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    height: 75,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 11,
    color: COLORS.textInactive,
    fontWeight: '500',
  },
  navLabelActive: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
});