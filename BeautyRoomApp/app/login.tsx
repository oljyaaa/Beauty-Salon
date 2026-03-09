import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Animated, Easing, StatusBar, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://thebeauty-room.com/api.php';

// ── PALETTE (matches profile light theme) ──────────────────
const C = {
  bg: '#FDF6F9',
  bgSoft: '#FFF0F5',
  card: '#FFFFFF',
  primary: '#E8879E',
  primaryDark: '#C45E78',
  primarySoft: '#F5C6D3',
  primaryPale: '#FEF3F7',
  textMain: '#3B2730',
  textSub: '#9C7D87',
  textMuted: '#C4A8B2',
  border: '#F0DDE4',
  inputBg: '#FFF8FA',
  orb1: '#F9D0DC',
  orb2: '#FADADD',
  orb3: '#F5E6EA',
};

// ── FLOATING ORB ───────────────────────────────────────────
function FloatingOrb({ size, color, startX, startY, duration, delay }: {
  size: number; color: string; startX: number; startY: number;
  duration: number; delay: number;
}) {
  const floatY = useRef(new Animated.Value(0)).current;
  const floatX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    const loopY = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -18, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const loopX = Animated.loop(
      Animated.sequence([
        Animated.timing(floatX, { toValue: 10, duration: duration * 1.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatX, { toValue: -10, duration: duration * 1.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    setTimeout(() => { loopY.start(); loopX.start(); }, delay);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: Animated.multiply(opacity, new Animated.Value(0.65)),
        transform: [{ translateY: floatY }, { translateX: floatX }],
      }}
    />
  );
}

// ── MAIN ───────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  // Mount animations
  const logoAnim   = useRef(new Animated.Value(0)).current;
  const titleAnim  = useRef(new Animated.Value(0)).current;
  const formAnim   = useRef(new Animated.Value(0)).current;
  const btnAnim    = useRef(new Animated.Value(0)).current;

  // Logo pulse
  const logoScale  = useRef(new Animated.Value(1)).current;

  // Shimmer for button
  const shimmer    = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.stagger(120, [
      Animated.spring(logoAnim,  { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.spring(titleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.spring(formAnim,  { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
      Animated.spring(btnAnim,   { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();

    // Logo gentle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.07, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1.00, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Shimmer sweep
    Animated.loop(
      Animated.timing(shimmer, { toValue: 2, duration: 2200, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Увага', 'Введіть Email та Пароль');
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('action', 'login');
      formData.append('email', email);
      formData.append('password', password);

      const response = await fetch(API_URL, { method: 'POST', body: formData });
      const textResponse = await response.text();
      try {
        const json = JSON.parse(textResponse);
        if (json.status === 'success') {
          await AsyncStorage.setItem('userData', JSON.stringify(json.user));
          router.replace('/');
        } else {
          Alert.alert('Помилка входу', json.message);
        }
      } catch {
        Alert.alert('Помилка сервера', 'Некоректна відповідь.');
      }
    } catch {
      Alert.alert('Помилка мережі', 'Перевірте інтернет');
    } finally {
      setIsLoading(false);
    }
  };

  // Derived animated styles
  const logoStyle = {
    opacity: logoAnim,
    transform: [
      { scale: Animated.multiply(logoScale, logoAnim) },
      { translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
    ],
  };
  const titleStyle = {
    opacity: titleAnim,
    transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };
  const formStyle = {
    opacity: formAnim,
    transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }],
  };
  const btnStyle = {
    opacity: btnAnim,
    transform: [{ translateY: btnAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };
  const shimmerTranslate = shimmer.interpolate({
    inputRange: [-1, 2],
    outputRange: [-160, 320],
  });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── BACKGROUND ORBS ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <FloatingOrb size={220} color={C.orb1} startX={-70}         startY={-60}          duration={3200} delay={0}   />
        <FloatingOrb size={160} color={C.orb2} startX={width - 110} startY={height * 0.1} duration={2800} delay={400} />
        <FloatingOrb size={130} color={C.orb3} startX={width * 0.2} startY={height * 0.7} duration={3600} delay={200} />
        <FloatingOrb size={90}  color={C.orb1} startX={width - 60}  startY={height * 0.6} duration={2500} delay={600} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* ── LOGO ── */}
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Ionicons name="rose" size={36} color={C.primary} />
            </View>
          </View>
        </Animated.View>

        {/* ── TITLE ── */}
        <Animated.View style={[styles.titleWrap, titleStyle]}>
          <Text style={styles.brandName}>Beauty Room</Text>
          <View style={styles.subtitleRow}>
            <View style={styles.subtitleLine} />
            <Text style={styles.subtitle}>WORKSPACE</Text>
            <View style={styles.subtitleLine} />
          </View>
        </Animated.View>

        {/* ── FORM CARD ── */}
        <Animated.View style={[styles.card, formStyle]}>

          {/* Email */}
          <View style={styles.fieldLabel}>
            <Text style={styles.labelText}>Email</Text>
          </View>
          <View style={[
            styles.inputRow,
            activeField === 'email' && styles.inputRowActive
          ]}>
            <Ionicons
              name="mail-outline" size={18}
              color={activeField === 'email' ? C.primaryDark : C.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Введіть email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setActiveField('email')}
              onBlur={() => setActiveField(null)}
              placeholderTextColor={C.textMuted}
            />
          </View>

          {/* Password */}
          <View style={[styles.fieldLabel, { marginTop: 16 }]}>
            <Text style={styles.labelText}>Пароль</Text>
          </View>
          <View style={[
            styles.inputRow,
            activeField === 'password' && styles.inputRowActive
          ]}>
            <Ionicons
              name="lock-closed-outline" size={18}
              color={activeField === 'password' ? C.primaryDark : C.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setActiveField('password')}
              onBlur={() => setActiveField(null)}
              placeholderTextColor={C.textMuted}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(s => !s)}
              style={styles.eyeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={C.textMuted}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── LOGIN BUTTON ── */}
        <Animated.View style={[styles.btnWrap, btnStyle]}>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.88}
          >
            {/* Shimmer overlay */}
            {!isLoading && (
              <Animated.View
                style={[
                  styles.shimmer,
                  { transform: [{ translateX: shimmerTranslate }] }
                ]}
                pointerEvents="none"
              />
            )}

            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.btnText}>Увійти</Text>
                <View style={styles.btnArrow}>
                  <Ionicons name="arrow-forward" size={16} color={C.primaryDark} />
                </View>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* ── FOOTER ── */}
        <Animated.View style={[styles.footer, { opacity: btnAnim }]}>
          <Ionicons name="flower-outline" size={13} color={C.textMuted} />
          <Text style={styles.footerText}>Beauty Room © 2026</Text>
          <Ionicons name="flower-outline" size={13} color={C.textMuted} />
        </Animated.View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── STYLES ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  kav: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 20,
  },

  // Logo
  logoWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRing: {
    width: 90, height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center',
  },
  logoInner: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: C.primaryPale,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  // Title
  titleWrap: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '800',
    color: C.textMain,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtitleLine: {
    width: 28,
    height: 1,
    backgroundColor: C.primarySoft,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 3,
  },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    shadowColor: C.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textSub,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputRowActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryPale,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: C.textMain,
    height: '100%',
  },
  eyeBtn: {
    paddingLeft: 8,
  },

  // Button
  btnWrap: {
    marginBottom: 6,
  },
  loginBtn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: C.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 7,
  },
  shimmer: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.22)',
    transform: [{ skewX: '-20deg' }],
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnArrow: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});