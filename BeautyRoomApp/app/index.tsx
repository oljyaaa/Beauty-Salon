import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, LogBox } from 'react-native'; // <-- ДОДАНО LogBox
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// --- ДОДАНО ЦЕЙ РЯДОК ---
// Ігноруємо набридливу помилку Expo Go, бо ми використовуємо безкоштовні локальні сповіщення!
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);
// -----------------------

import CreatorDashboard from '../components/CreatorDashboard';
import StandardDashboard from '../components/StandardDashboard';
import { API_URL } from '../constants/AppConfig';

// Налаштування для показу сповіщень, навіть коли ми в додатку
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any),
});

export default function Index() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // === ЗМІННІ ДЛЯ POLLING (ОПИТУВАННЯ) ===
  const lastCheckTime = useRef<string>(new Date().toISOString().slice(0, 19).replace('T', ' '));
  const pollingInterval = useRef<any>(null);

  // 1. Перевірка користувача при вході
  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
            setUser(JSON.parse(userData));
        } else {
            router.replace('/login');
        }
      } catch (e) {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  // 2. Логіка опитування сервера (кожні 15 секунд)
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'creator')) {
      pollingInterval.current = setInterval(async () => {
        try {
          const formData = new FormData();
          formData.append('action', 'check_new_appointments');
          formData.append('last_check_time', lastCheckTime.current);

          const response = await fetch(API_URL, { method: 'POST', body: formData });
          const json = await response.json();

          if (json.status === 'success') {
            lastCheckTime.current = json.server_time;

            if (json.new_items && json.new_items.length > 0) {
              json.new_items.forEach((item: any) => {
                 scheduleLocalNotification(item.name, item.phone);
              });
            }
          }
        } catch (error) {
          // Якщо немає інтернету, просто ігноруємо
        }
      }, 15000); 
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [user]);

  // 3. Функція локального сповіщення
  const scheduleLocalNotification = async (name: string, phone: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📞 Нова заявка!",
        body: `Клієнт ${name} (${phone}) просить перетелефонувати.`,
        sound: true,
      },
      trigger: null, // Показати миттєво
    });
  };

  if (loading) return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" /></View>;
  if (!user) return null;

  // Вибір дашборда залежно від ролі
  if (user.role === 'creator') return <CreatorDashboard user={user} />;
  return <StandardDashboard user={user} />;
}