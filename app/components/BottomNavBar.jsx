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

    if (!foundAgencyId) {
      const segments = pathname.split('/');
      if (segments.includes('selected')) {
        const selectedIndex = segments.indexOf('selected');
        const potentialId = segments[selectedIndex + 1];
        
        // Static routes to ignore when extracting ID
        const staticRoutes = ['profile', 'messages', 'events', 'courses', 'uploads'];
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
      name: 'Messages',
      route: 'messages',
      icon: 'mail-outline',
      getScreen: () => '/agency/selected/messages',
    },
    {
      name: 'Documents',
      route: 'uploads', 
      icon: 'document-text-outline',
      getScreen: () => '/agency/selected/documentupload/uploads',
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

    const needsAgencyId = ['Profile', 'Messages', 'Documents'].includes(itemName);

    if (needsAgencyId && agencyId) {
      router.push({
        pathname: screen,
        params: { agencyId, refresh: Date.now() } 
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
                <Ionicons name={item.icon.replace('-outline', '')} size={24} color={COLORS.white} />
              </View>
            ) : (
              <Ionicons
                name={item.icon}
                size={24}
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
    height: 85,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 25,
    paddingHorizontal: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    // Add a slight shadow for the active state
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  navLabel: {
    fontSize: 11,
    color: COLORS.textInactive,
    fontWeight: '500',
    marginTop: 2,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});