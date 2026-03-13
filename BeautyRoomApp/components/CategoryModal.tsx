import React, { useRef, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  ScrollView, StyleSheet, Animated, Easing, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── PALETTE (matches app theme) ───────────────────────────
const T = {
  bg: '#FDF6F9',
  card: '#FFFFFF',
  cardAlt: '#FEF3F7',
  primary: '#E8879E',
  primaryDark: '#C45E78',
  primarySoft: '#F5C6D3',
  primaryPale: '#FFF0F5',
  textMain: '#3B2730',
  textSub: '#9C7D87',
  textMuted: '#C4A8B2',
  border: '#F0DDE4',
  danger: '#E07575',
};

// Category icon map
const CATEGORY_ICONS: Record<string, string> = {
  'Всі записи':           'list',
  'Масаж':                'hand-left-outline',
  'Elos-епіляція':        'flash-outline',
  'Доглядові процедури':  'sparkles-outline',
  'Архів':                'archive-outline',
  'Перетелефонувати':     'call-outline',
  'Прайс-лист':           'pricetag-outline',
  'Історія':              'time-outline',
};

const DEFAULT_CATEGORIES = [
  'Всі записи', 'Масаж', 'Elos-епіляція',
  'Доглядові процедури', 'Архів', 'Перетелефонувати',
];

interface Props {
  visible: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (category: string) => void;
  customCategories?: string[];
  title?: string;
}

export default function CategoryModal({
  visible, selected, onClose, onSelect,
  customCategories, title = 'Оберіть категорію',
}: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const categories = customCategories && customCategories.length > 0
    ? customCategories
    : DEFAULT_CATEGORIES;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, tension: 68, friction: 11, useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1, duration: 250, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT, duration: 240,
          easing: Easing.in(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0, duration: 220, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getIcon = (cat: string) =>
    (CATEGORY_ICONS[cat] || 'layers-outline') as any;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="auto"
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconBox}>
            <Ionicons name="options-outline" size={18} color={T.primaryDark} />
          </View>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color={T.textSub} />
          </TouchableOpacity>
        </View>

        {/* Category list */}
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {categories.map((cat, index) => {
            const isActive = selected === cat;
            const isLast = index === categories.length - 1;
            return (
              <React.Fragment key={cat}>
                <TouchableOpacity
                  style={[styles.item, isActive && styles.itemActive]}
                  onPress={() => { onSelect(cat); onClose(); }}
                  activeOpacity={0.7}
                >
                  {/* Left icon box */}
                  <View style={[
                    styles.iconBox,
                    isActive ? styles.iconBoxActive : styles.iconBoxInactive,
                  ]}>
                    <Ionicons
                      name={getIcon(cat)}
                      size={17}
                      color={isActive ? '#fff' : T.primaryDark}
                    />
                  </View>

                  {/* Label */}
                  <Text style={[styles.itemText, isActive && styles.itemTextActive]}>
                    {cat}
                  </Text>

                  {/* Checkmark / chevron */}
                  {isActive
                    ? <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      </View>
                    : <Ionicons name="chevron-forward" size={15} color={T.textMuted} />
                  }
                </TouchableOpacity>

                {/* Divider — not after last item */}
                {!isLast && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </ScrollView>

        {/* Footer close pill */}
        <TouchableOpacity style={styles.footerClose} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.footerCloseText}>Закрити</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(59,39,48,0.4)',
  },

  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    maxHeight: SCREEN_HEIGHT * 0.72,
    backgroundColor: T.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 24,
    paddingBottom: 12,
  },

  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: T.primarySoft,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: 12,
  },
  headerIconBox: {
    width: 34, height: 34,
    borderRadius: 11,
    backgroundColor: T.primaryPale,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: T.textMain,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: T.cardAlt,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  itemActive: {
    backgroundColor: T.primaryPale,
  },

  iconBox: {
    width: 38, height: 38,
    borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  iconBoxActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  iconBoxInactive: {
    backgroundColor: T.cardAlt,
    borderColor: T.border,
  },

  itemText: {
    flex: 1,
    fontSize: 15,
    color: T.textSub,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  itemTextActive: {
    color: T.primaryDark,
    fontWeight: '800',
  },

  checkCircle: {
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: T.primary,
    justifyContent: 'center', alignItems: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: T.border,
    marginHorizontal: 14,
  },

  footerClose: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: T.cardAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  footerCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: T.danger,
    letterSpacing: 0.2,
  },
});