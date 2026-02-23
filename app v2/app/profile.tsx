import React, { useState } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  SafeAreaView, ScrollView, Image, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { API_URL } from '../constants/AppConfig'; // ДОДАНО ІМПОРТ API_URL

export default function ProfileScreen() {
  const router = useRouter();
  const [isTestingPush, setIsTestingPush] = useState(false);
  
  // Дані про профіль (поки статичні)
  const [userProfile, setUserProfile] = useState({
    name: 'Адміністратор',
    email: 'admin@beautyroom.com',
    phone: '+380 99 999 99 99',
    info: 'Старший косметолог',
    avatar: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png'
  });

  const handleLogout = () => {
    Alert.alert("Вихід", "Ви впевнені?", [
        { text: "Ні", style: "cancel" },
        { text: "Так", style: "destructive", onPress: () => router.replace('/login') }
    ]);
  };

  const handleSave = () => {
    Alert.alert("Успіх", "Профіль оновлено!");
    router.back(); 
  };

  // --- ФУНКЦІЯ ТЕСТУВАННЯ ПУШ-СПОВІЩЕНЬ ---
  const handleTestPush = async () => {
    setIsTestingPush(true);
    try {
      const formData = new FormData();
      formData.append('action', 'add_callback');
      formData.append('name', 'Тестовий Клієнт з Додатку');
      formData.append('phone', '099 000 00 00');
      formData.append('service', 'Тест пуш-сповіщень');

      const res = await fetch(API_URL, {
        method: 'POST',
        body: formData
      });
      
      const json = await res.json();
      
      if (json.status === 'success') {
        Alert.alert("Відправлено!", "Запит пішов на сервер. Сповіщення має прийти за кілька секунд.");
      } else {
        Alert.alert("Помилка сервера", json.message);
      }
    } catch (e) {
      Alert.alert("Помилка мережі", "Не вдалося відправити тестовий запит.");
    } finally {
      setIsTestingPush(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textMain} />
            <Text style={styles.backText}>Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Мій профіль</Text>
        <View style={{width: 60}} /> 
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
        <View style={styles.avatarContainer}>
            <Image source={{ uri: userProfile.avatar }} style={styles.avatarLarge} />
            <TouchableOpacity onPress={() => Alert.alert('Фото', 'Відкрити галерею...')} style={{marginTop: 10}}>
                 <Text style={{color: Colors.primary, fontWeight: 'bold'}}>Змінити фото</Text>
            </TouchableOpacity>
        </View>

        <Text style={styles.label}>Ім'я</Text>
        <TextInput style={styles.input} value={userProfile.name} onChangeText={t => setUserProfile({...userProfile, name: t})} />
        
        <Text style={styles.label}>Пошта</Text>
        <TextInput style={styles.input} value={userProfile.email} onChangeText={t => setUserProfile({...userProfile, email: t})} />

        <Text style={styles.label}>Телефон</Text>
        <TextInput style={styles.input} value={userProfile.phone} onChangeText={t => setUserProfile({...userProfile, phone: t})} />

        <Text style={styles.label}>Посада / Про себе</Text>
        <TextInput style={styles.input} value={userProfile.info} onChangeText={t => setUserProfile({...userProfile, info: t})} />

        {/* --- КНОПКА ТЕСТУВАННЯ ПУШІВ --- */}
        <TouchableOpacity style={styles.testPushBtn} onPress={handleTestPush} disabled={isTestingPush}>
            {isTestingPush ? (
               <ActivityIndicator color="#FFF" />
            ) : (
               <>
                 <Ionicons name="notifications-outline" size={20} color="#FFF" />
                 <Text style={styles.testPushBtnText}>Протестувати Push-сповіщення</Text>
               </>
            )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Зберегти</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveBtn, styles.logoutBtn]} onPress={handleLogout}>
            <Text style={[styles.saveBtnText, {color: Colors.danger}]}>Вийти з акаунту</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  backText: { fontSize: 16, color: Colors.textMain },
  title: { fontSize: 18, fontWeight: 'bold' },
  avatarContainer: { alignItems: 'center', marginBottom: 30 },
  avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee' },
  label: { fontSize: 14, color: Colors.textSecondary, marginBottom: 6, marginTop: 15 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: '#000' },
  
  testPushBtn: { backgroundColor: '#FF9800', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 30, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  testPushBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  saveBtn: { backgroundColor: Colors.primaryDark, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 15 },
  saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#ffe6e6', marginTop: 15 },
});