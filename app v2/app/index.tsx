// app/index.tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Імпортуємо компоненти та конфіг
import CreatorDashboard from '../components/CreatorDashboard';
import StandardDashboard from '../components/StandardDashboard';
import { API_URL } from '../constants/AppConfig';

// Налаштування поведінки сповіщень
// Налаштування поведінки сповіщень
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any),
});

// Функція для запиту дозволів та отримання токена
async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Немає дозволу на push-сповіщення!');
      return;
    }
    
    // Отримуємо унікальний токен пристрою
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } else {
    console.log('Push-сповіщення працюють лише на фізичному пристрої (не в симуляторі)');
  }

  return token;
}

export default function Index() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);

            // --- ДОДАНО: Логіка Push-сповіщень ---
            registerForPushNotificationsAsync().then(async (token) => {
              if (token) {
                 // Відправляємо отриманий токен на ваш сервер
                 const f = new FormData();
                 f.append('action', 'save_push_token');
                 f.append('user_id', String(parsedUser.id)); // Обов'язково як рядок
                 f.append('token', token);
                 
                 try {
                     await fetch(API_URL, { method: 'POST', body: f });
                 } catch (err) {
                     console.log("Помилка відправки токена:", err);
                 }
              }
            });
            // ------------------------------------

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

  if (loading) return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" /></View>;
  if (!user) return null;

  // Вибір дашборда залежно від ролі
  if (user.role === 'creator') return <CreatorDashboard user={user} />;
  return <StandardDashboard user={user} />;
}