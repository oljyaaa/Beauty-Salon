import React, { useState } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    const login = email.trim().toLowerCase();
    const pass = password.trim();

    if (login === 'creator' && pass === '1111') {
      router.replace({ pathname: '/', params: { role: 'creator' } });
    } 
    else if (login === 'admin' && pass === '1234') {
      router.replace({ pathname: '/', params: { role: 'admin' } });
    } 
    else {
      Alert.alert('Помилка', 'Невірний логін або пароль');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="rose" size={60} color="#FFF" />
          </View>
          <Text style={styles.title}>Beauty Room</Text>
          <Text style={styles.subtitle}>Workspace</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Логін</Text>
          <TextInput 
            style={styles.input} placeholder="Введіть логін" autoCapitalize="none"
            value={email} onChangeText={setEmail} placeholderTextColor="#999"
          />
          <Text style={styles.label}>Пароль</Text>
          <TextInput 
            style={styles.input} placeholder="••••••" secureTextEntry
            value={password} onChangeText={setPassword} placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Увійти</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', padding: 30 },
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: Colors.primary, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.primaryDark },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginTop: 5, textTransform: 'uppercase', letterSpacing: 2 },
  form: { backgroundColor: '#FFF', padding: 25, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  label: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 12, padding: 15, fontSize: 16, color: Colors.textMain },
  loginBtn: { backgroundColor: Colors.primaryDark, borderRadius: 12, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 30 },
  loginBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});