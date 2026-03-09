import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Image, Alert, ActivityIndicator,
  StatusBar, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MASTER_NAMES } from '../constants/AppConfig';

// ── THEMES ──────────────────────────────────────────────────

const LIGHT = {
  bg: '#FDF6F9',
  bgSoft: '#FFF0F5',
  card: '#FFFFFF',
  cardAlt: '#FEF3F7',
  primary: '#E8879E',
  primarySoft: '#F5C6D3',
  primaryText: '#C45E78',
  textMain: '#3B2730',
  textSub: '#9C7D87',
  textMuted: '#C4A8B2',
  border: '#F0DDE4',
  danger: '#E07575',
  inputBg: '#FFF8FA',
  statusBar: 'dark-content' as const,
};

const DARK = {
  bg: '#0E0B12',
  bgSoft: '#150F1C',
  card: '#1A1325',
  cardAlt: '#221830',
  primary: '#D4789A',
  primarySoft: '#3D1F2D',
  primaryText: '#F2AECB',
  textMain: '#F5EEF8',
  textSub: '#9B8FAA',
  textMuted: '#5C4F6B',
  border: '#2A1F35',
  danger: '#E07575',
  inputBg: '#17121F',
  statusBar: 'light-content' as const,
};

export default function ProfileScreen() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const T = isDark ? DARK : LIGHT;

  const [isLoading, setIsLoading] = useState(true);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [activeField, setActiveField] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState({
    name: 'Завантаження...',
    phone: '+380 ',
    info: '',
    avatar: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png'
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          const realName = MASTER_NAMES[userData.username] || userData.username;
          setUserRole(userData.role);
          setUserProfile(prev => ({
            ...prev,
            name: realName,
            info: userData.role === 'creator' ? 'Топ-косметолог / Власник' : 'Старший спеціаліст'
          }));
        }
      } catch (error) {
        console.log('Помилка завантаження профілю', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, []);

  const handleLogout = () => {
    Alert.alert('Вихід з акаунту', 'Ви впевнені, що хочете вийти?', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Вийти', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem('userData');
          router.replace('/login');
        }
      }
    ]);
  };

  const handleSave = () => {
    Alert.alert('Збережено ✨', 'Ваші особисті дані оновлено!');
    router.back();
  };

  const handleTestPush = async () => {
    setIsTestingPush(true);
    try {
      const formData = new FormData();
      formData.append('action', 'add_callback');
      formData.append('name', 'Тест з Додатку');
      formData.append('phone', '099 000 00 00');
      formData.append('service', 'Тест сповіщень');
      const res = await fetch('https://thebeauty-room.com/api.php', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.status === 'success') {
        Alert.alert("Відправлено!", "Сповіщення має з'явитися за кілька секунд.");
      } else {
        Alert.alert('Помилка', json.message);
      }
    } catch (e) {
      Alert.alert('Помилка', 'Не вдалося відправити запит.');
    } finally {
      setIsTestingPush(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      {/* ── HEADER ── */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: T.card, borderColor: T.border }]}
        >
          <Ionicons name="chevron-back" size={22} color={T.textMain} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: T.textMain }]}>Профіль</Text>

        <TouchableOpacity
          onPress={() => setIsDark(d => !d)}
          style={[styles.iconBtn, { backgroundColor: T.card, borderColor: T.border }]}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={20}
            color={isDark ? '#F5C842' : T.textSub}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── HERO CARD ── */}
        <View style={[styles.heroCard, { backgroundColor: T.card, borderColor: T.border }]}>
          {/* Soft petal decoration */}
          <View style={[styles.petalBg, { backgroundColor: T.bgSoft }]} />

          <View style={[styles.avatarRing, { borderColor: T.primarySoft }]}>
            <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
            <TouchableOpacity
              style={[styles.cameraBtn, { backgroundColor: T.primary, borderColor: T.card }]}
              onPress={() => Alert.alert('Фото', 'Відкрити галерею...')}
            >
              <Ionicons name="camera" size={13} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.heroName, { color: T.textMain }]}>{userProfile.name}</Text>

          <View style={[styles.badge, { backgroundColor: T.cardAlt, borderColor: T.border }]}>
            <Ionicons name="flower-outline" size={12} color={T.primary} />
            <Text style={[styles.badgeText, { color: T.primaryText }]}>
              {userRole.toUpperCase() || 'МАЙСТЕР'}
            </Text>
          </View>
        </View>

        {/* ── PERSONAL INFO ── */}
        <View style={[styles.sectionHeader]}>
          <View style={[styles.sectionDot, { backgroundColor: T.primary }]} />
          <Text style={[styles.sectionTitle, { color: T.textSub }]}>Особиста інформація</Text>
        </View>

        <View style={[styles.fieldsCard, { backgroundColor: T.card, borderColor: T.border }]}>

          {/* Name */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconBox, {
              backgroundColor: activeField === 'name' ? T.primarySoft : T.cardAlt,
              borderColor: activeField === 'name' ? T.primary : T.border,
            }]}>
              <Ionicons name="person-outline" size={17}
                color={activeField === 'name' ? T.primaryText : T.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: T.textMuted }]}>Ім'я</Text>
              <TextInput
                style={[styles.fieldInput, { color: T.textMain }]}
                value={userProfile.name}
                onChangeText={t => setUserProfile({ ...userProfile, name: t })}
                onFocus={() => setActiveField('name')}
                onBlur={() => setActiveField(null)}
                placeholderTextColor={T.textMuted}
              />
            </View>
            {activeField === 'name' && <View style={[styles.activePip, { backgroundColor: T.primary }]} />}
          </View>

          <View style={[styles.fieldDivider, { backgroundColor: T.border }]} />

          {/* Phone */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconBox, {
              backgroundColor: activeField === 'phone' ? T.primarySoft : T.cardAlt,
              borderColor: activeField === 'phone' ? T.primary : T.border,
            }]}>
              <Ionicons name="call-outline" size={17}
                color={activeField === 'phone' ? T.primaryText : T.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: T.textMuted }]}>Телефон</Text>
              <TextInput
                style={[styles.fieldInput, { color: T.textMain }]}
                value={userProfile.phone}
                onChangeText={t => setUserProfile({ ...userProfile, phone: t })}
                keyboardType="phone-pad"
                onFocus={() => setActiveField('phone')}
                onBlur={() => setActiveField(null)}
                placeholderTextColor={T.textMuted}
              />
            </View>
            {activeField === 'phone' && <View style={[styles.activePip, { backgroundColor: T.primary }]} />}
          </View>

          <View style={[styles.fieldDivider, { backgroundColor: T.border }]} />

          {/* Specialization */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconBox, {
              backgroundColor: activeField === 'info' ? T.primarySoft : T.cardAlt,
              borderColor: activeField === 'info' ? T.primary : T.border,
            }]}>
              <Ionicons name="sparkles-outline" size={17}
                color={activeField === 'info' ? T.primaryText : T.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: T.textMuted }]}>Спеціалізація</Text>
              <TextInput
                style={[styles.fieldInput, { color: T.textMain }]}
                value={userProfile.info}
                onChangeText={t => setUserProfile({ ...userProfile, info: t })}
                onFocus={() => setActiveField('info')}
                onBlur={() => setActiveField(null)}
                placeholderTextColor={T.textMuted}
              />
            </View>
            {activeField === 'info' && <View style={[styles.activePip, { backgroundColor: T.primary }]} />}
          </View>

        </View>

        {/* ── SAVE ── */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: T.primary }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>Зберегти зміни</Text>
          <Ionicons name="checkmark-circle-outline" size={19} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* ── SETTINGS ── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDot, { backgroundColor: T.primary }]} />
          <Text style={[styles.sectionTitle, { color: T.textSub }]}>Налаштування</Text>
        </View>

        <View style={[styles.fieldsCard, { backgroundColor: T.card, borderColor: T.border }]}>
          <TouchableOpacity
            style={styles.fieldRow}
            onPress={handleTestPush}
            disabled={isTestingPush}
            activeOpacity={0.7}
          >
            <View style={[styles.fieldIconBox, { backgroundColor: T.cardAlt, borderColor: T.border }]}>
              {isTestingPush
                ? <ActivityIndicator size="small" color={T.primary} />
                : <Ionicons name="notifications-outline" size={18} color={T.primary} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldInput, { color: T.textMain }]}>Протестувати сповіщення</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={T.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── LOGOUT ── */}
        <TouchableOpacity
          style={[styles.logoutBtn, {
            backgroundColor: isDark ? '#1F0F0F' : '#FFF0F0',
            borderColor: isDark ? '#3D1515' : '#F5CECE',
          }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={19} color={T.danger} />
          <Text style={[styles.logoutText, { color: T.danger }]}>Вийти з акаунту</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── STYLES ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Hero
  heroCard: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 28,
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  petalBg: {
    position: 'absolute',
    top: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.6,
  },
  avatarRing: {
    width: 112, height: 112,
    borderRadius: 56,
    borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 104, height: 104,
    borderRadius: 52,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2, right: 2,
    width: 28, height: 28,
    borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 26,
    marginTop: 26,
    marginBottom: 12,
  },
  sectionDot: {
    width: 6, height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },

  // Fields
  fieldsCard: {
    marginHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 14,
  },
  fieldIconBox: {
    width: 36, height: 36,
    borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
  },
  activePip: {
    width: 6, height: 6,
    borderRadius: 3,
  },
  fieldDivider: {
    height: 1,
    marginHorizontal: 16,
  },

  // Save
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 16,
    borderRadius: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});