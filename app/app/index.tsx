// app/index.tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Імпортуємо компоненти
import CreatorDashboard from '../components/CreatorDashboard';
import StandardDashboard from '../components/StandardDashboard';

export default function Index() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) setUser(JSON.parse(userData));
        else router.replace('/login');
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