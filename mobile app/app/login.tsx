import React, { useState } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';

const API_URL = 'https://thebeauty-room.com/api.php'; 

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
          // ВАЖЛИВО: Зберігаємо сесію, щоб не викидало на логін
          await AsyncStorage.setItem('userData', JSON.stringify(json.user));
          router.replace('/');
        } else {
          Alert.alert('Помилка входу', json.message);
        }
      } catch (parseError) {
        console.error("Помилка JSON:", textResponse);
        Alert.alert('Помилка сервера', 'Некоректна відповідь.');
      }
    } catch (error) {
      Alert.alert('Помилка мережі', 'Перевірте інтернет');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}><Ionicons name="rose" size={60} color="#FFF" /></View>
          <Text style={styles.title}>Beauty Room</Text>
          <Text style={styles.subtitle}>Workspace</Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="Введіть email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholderTextColor="#999" />
          <Text style={styles.label}>Пароль</Text>
          <TextInput style={styles.input} placeholder="••••••" secureTextEntry value={password} onChangeText={setPassword} placeholderTextColor="#999" />
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.loginBtnText}>Увійти</Text><Ionicons name="arrow-forward" size={20} color="#FFF" /></>}
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