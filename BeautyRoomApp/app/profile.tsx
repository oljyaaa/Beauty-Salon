// import React, { useState } from 'react';
// import { 
//   StyleSheet, View, Text, TextInput, TouchableOpacity, 
//   SafeAreaView, ScrollView, Image, Alert, ActivityIndicator
// } from 'react-native';
// import { useRouter } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import { Colors } from '../constants/Colors';
// import { API_URL } from '../constants/AppConfig'; // ДОДАНО ІМПОРТ API_URL

// export default function ProfileScreen() {
//   const router = useRouter();
//   const [isTestingPush, setIsTestingPush] = useState(false);
  
//   // Дані про профіль (поки статичні)
//   const [userProfile, setUserProfile] = useState({
//     name: 'Адміністратор',
//     email: 'admin@beautyroom.com',
//     phone: '+380 99 999 99 99',
//     info: 'Старший косметолог',
//     avatar: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png'
//   });

//   const handleLogout = () => {
//     Alert.alert("Вихід", "Ви впевнені?", [
//         { text: "Ні", style: "cancel" },
//         { text: "Так", style: "destructive", onPress: () => router.replace('/login') }
//     ]);
//   };

//   const handleSave = () => {
//     Alert.alert("Успіх", "Профіль оновлено!");
//     router.back(); 
//   };

//   // --- ФУНКЦІЯ ТЕСТУВАННЯ ПУШ-СПОВІЩЕНЬ ---
//   const handleTestPush = async () => {
//     setIsTestingPush(true);
//     try {
//       const formData = new FormData();
//       formData.append('action', 'add_callback');
//       formData.append('name', 'Тестовий Клієнт з Додатку');
//       formData.append('phone', '099 000 00 00');
//       formData.append('service', 'Тест пуш-сповіщень');

//       const res = await fetch(API_URL, {
//         method: 'POST',
//         body: formData
//       });
      
//       const json = await res.json();
      
//       if (json.status === 'success') {
//         Alert.alert("Відправлено!", "Запит пішов на сервер. Сповіщення має прийти за кілька секунд.");
//       } else {
//         Alert.alert("Помилка сервера", json.message);
//       }
//     } catch (e) {
//       Alert.alert("Помилка мережі", "Не вдалося відправити тестовий запит.");
//     } finally {
//       setIsTestingPush(false);
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
//             <Ionicons name="arrow-back" size={24} color={Colors.textMain} />
//             <Text style={styles.backText}>Назад</Text>
//         </TouchableOpacity>
//         <Text style={styles.title}>Мій профіль</Text>
//         <View style={{width: 60}} /> 
//       </View>

//       <ScrollView contentContainerStyle={{padding: 20}}>
//         <View style={styles.avatarContainer}>
//             <Image source={{ uri: userProfile.avatar }} style={styles.avatarLarge} />
//             <TouchableOpacity onPress={() => Alert.alert('Фото', 'Відкрити галерею...')} style={{marginTop: 10}}>
//                  <Text style={{color: Colors.primary, fontWeight: 'bold'}}>Змінити фото</Text>
//             </TouchableOpacity>
//         </View>

//         <Text style={styles.label}>Ім'я</Text>
//         <TextInput style={styles.input} value={userProfile.name} onChangeText={t => setUserProfile({...userProfile, name: t})} />
        
//         <Text style={styles.label}>Пошта</Text>
//         <TextInput style={styles.input} value={userProfile.email} onChangeText={t => setUserProfile({...userProfile, email: t})} />

//         <Text style={styles.label}>Телефон</Text>
//         <TextInput style={styles.input} value={userProfile.phone} onChangeText={t => setUserProfile({...userProfile, phone: t})} />

//         <Text style={styles.label}>Посада / Про себе</Text>
//         <TextInput style={styles.input} value={userProfile.info} onChangeText={t => setUserProfile({...userProfile, info: t})} />

//         {/* --- КНОПКА ТЕСТУВАННЯ ПУШІВ --- */}
//         <TouchableOpacity style={styles.testPushBtn} onPress={handleTestPush} disabled={isTestingPush}>
//             {isTestingPush ? (
//                <ActivityIndicator color="#FFF" />
//             ) : (
//                <>
//                  <Ionicons name="notifications-outline" size={20} color="#FFF" />
//                  <Text style={styles.testPushBtnText}>Протестувати Push-сповіщення</Text>
//                </>
//             )}
//         </TouchableOpacity>

//         <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
//             <Text style={styles.saveBtnText}>Зберегти</Text>
//         </TouchableOpacity>

//         <TouchableOpacity style={[styles.saveBtn, styles.logoutBtn]} onPress={handleLogout}>
//             <Text style={[styles.saveBtnText, {color: Colors.danger}]}>Вийти з акаунту</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#FFF' },
//   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
//   backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
//   backText: { fontSize: 16, color: Colors.textMain },
//   title: { fontSize: 18, fontWeight: 'bold' },
//   avatarContainer: { alignItems: 'center', marginBottom: 30 },
//   avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee' },
//   label: { fontSize: 14, color: Colors.textSecondary, marginBottom: 6, marginTop: 15 },
//   input: { backgroundColor: Colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: '#000' },
  
//   testPushBtn: { backgroundColor: '#FF9800', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 30, flexDirection: 'row', justifyContent: 'center', gap: 10 },
//   testPushBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

//   saveBtn: { backgroundColor: Colors.primaryDark, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 15 },
//   saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
//   logoutBtn: { backgroundColor: '#ffe6e6', marginTop: 15 },
// });
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  SafeAreaView, ScrollView, Image, Alert, ActivityIndicator, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MASTER_NAMES } from '../constants/AppConfig';

// === ПРЕМІУМ ПАЛІТРА "BEAUTY BOOKING APP" ===
const BeautyTheme = {
  bg: '#FDFBFB',
  card: '#FFFFFF',
  primary: '#F0A3B1', 
  primaryDark: '#D48392', 
  primaryLight: '#FEF4F6', 
  textMain: '#3A3333', 
  textSecondary: '#9C9292', 
  danger: '#F2A2A2', 
  border: '#F4EDED',
  inputBg: '#FDFBFB',
};

export default function ProfileScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [userRole, setUserRole] = useState('');
  
  const [userProfile, setUserProfile] = useState({
    name: 'Завантаження...',
    phone: '+380 ',
    info: '',
    avatar: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png'
  });

  // Підтягуємо реальні дані користувача при завантаженні
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
        console.log("Помилка завантаження профілю", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, []);

  const handleLogout = () => {
    Alert.alert("Вихід з акаунту", "Ви впевнені, що хочете вийти?", [
        { text: "Скасувати", style: "cancel" },
        { text: "Вийти", style: "destructive", onPress: async () => {
            await AsyncStorage.removeItem('userData');
            router.replace('/login');
        }}
    ]);
  };

  const handleSave = () => {
    Alert.alert("Успіх ✨", "Ваші особисті дані оновлено!");
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
        Alert.alert("Помилка", json.message);
      }
    } catch (e) {
      Alert.alert("Помилка", "Не вдалося відправити запит.");
    } finally {
      setIsTestingPush(false);
    }
  };

  if (isLoading) {
      return <View style={[styles.container, {justifyContent: 'center'}]}><ActivityIndicator size="large" color={BeautyTheme.primaryDark} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BeautyTheme.bg} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={BeautyTheme.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Профіль</Text>
        <View style={{width: 26}} /> 
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 50}} showsVerticalScrollIndicator={false}>
        
        {/* АВАТАР І СТАТУС */}
        <View style={styles.profileTopCard}>
            <View style={styles.avatarWrapper}>
                <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
                <TouchableOpacity style={styles.editAvatarBtn} onPress={() => Alert.alert('Фото', 'Відкрити галерею...')}>
                    <Ionicons name="camera" size={16} color="#FFF" />
                </TouchableOpacity>
            </View>
            <Text style={styles.nameText}>{userProfile.name}</Text>
            <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{userRole.toUpperCase()}</Text>
            </View>
        </View>

        {/* СТАТИСТИКА (Візуальна частина) */}
        <View style={styles.statsContainer}>
            <View style={styles.statBox}>
                <Ionicons name="star" size={22} color="#FFD700" style={{marginBottom: 4}} />
                <Text style={styles.statValue}>4.9</Text>
                <Text style={styles.statLabel}>Рейтинг</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
                <Ionicons name="people" size={22} color={BeautyTheme.primaryDark} style={{marginBottom: 4}} />
                <Text style={styles.statValue}>320+</Text>
                <Text style={styles.statLabel}>Клієнтів</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
                <Ionicons name="ribbon" size={22} color={BeautyTheme.primaryDark} style={{marginBottom: 4}} />
                <Text style={styles.statValue}>5 р.</Text>
                <Text style={styles.statLabel}>Досвід</Text>
            </View>
        </View>

        {/* ФОРМА ДАНИХ */}
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Особиста інформація</Text>
            
            <Text style={styles.label}>Ім'я</Text>
            <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={BeautyTheme.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={userProfile.name} onChangeText={t => setUserProfile({...userProfile, name: t})} />
            </View>
            
            <Text style={styles.label}>Телефон</Text>
            <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color={BeautyTheme.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={userProfile.phone} onChangeText={t => setUserProfile({...userProfile, phone: t})} keyboardType="phone-pad" />
            </View>

            <Text style={styles.label}>Спеціалізація / Про себе</Text>
            <View style={styles.inputWrapper}>
                <Ionicons name="information-circle-outline" size={20} color={BeautyTheme.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={userProfile.info} onChangeText={t => setUserProfile({...userProfile, info: t})} />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Зберегти зміни</Text>
            </TouchableOpacity>
        </View>

        {/* НАЛАШТУВАННЯ ТА ВИХІД */}
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Налаштування додатку</Text>

            <TouchableOpacity style={styles.testPushBtn} onPress={handleTestPush} disabled={isTestingPush}>
                {isTestingPush ? (
                    <ActivityIndicator color={BeautyTheme.primaryDark} />
                ) : (
                    <>
                    <View style={styles.testPushIconBox}>
                        <Ionicons name="notifications" size={20} color={BeautyTheme.primaryDark} />
                    </View>
                    <Text style={styles.testPushBtnText}>Протестувати сповіщення</Text>
                    <Ionicons name="chevron-forward" size={20} color={BeautyTheme.textSecondary} />
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={22} color={BeautyTheme.danger} />
                <Text style={styles.logoutBtnText}>Вийти з акаунту</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BeautyTheme.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: BeautyTheme.card, justifyContent: 'center', alignItems: 'center', shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: BeautyTheme.textMain, letterSpacing: -0.5 },
  
  profileTopCard: { alignItems: 'center', marginTop: 10, paddingHorizontal: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 15 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: BeautyTheme.primaryLight, borderWidth: 4, borderColor: BeautyTheme.card },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: BeautyTheme.primaryDark, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: BeautyTheme.card },
  nameText: { fontSize: 26, fontWeight: '800', color: BeautyTheme.textMain, letterSpacing: -0.5 },
  roleBadge: { backgroundColor: BeautyTheme.primaryLight, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  roleText: { color: BeautyTheme.primaryDark, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },

  statsContainer: { flexDirection: 'row', backgroundColor: BeautyTheme.card, marginHorizontal: 25, marginTop: 25, borderRadius: 24, paddingVertical: 20, shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 5 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: BeautyTheme.textMain },
  statLabel: { fontSize: 11, color: BeautyTheme.textSecondary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: BeautyTheme.border, marginVertical: 5 },

  formSection: { paddingHorizontal: 25, marginTop: 35 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: BeautyTheme.textMain, marginBottom: 15, letterSpacing: -0.5 },
  label: { fontSize: 13, color: BeautyTheme.textSecondary, marginBottom: 8, fontWeight: '600', paddingLeft: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: BeautyTheme.card, borderRadius: 20, borderWidth: 1, borderColor: BeautyTheme.border, paddingHorizontal: 15, marginBottom: 18 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 18, fontSize: 16, color: BeautyTheme.textMain, fontWeight: '500' },
  
  saveBtn: { backgroundColor: BeautyTheme.primary, borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginTop: 10, shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 5 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  testPushBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: BeautyTheme.card, padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: BeautyTheme.border },
  testPushIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: BeautyTheme.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  testPushBtnText: { flex: 1, fontSize: 16, color: BeautyTheme.textMain, fontWeight: '600' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDF2F2', paddingVertical: 18, borderRadius: 20, gap: 10, marginTop: 10 },
  logoutBtnText: { color: BeautyTheme.danger, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});