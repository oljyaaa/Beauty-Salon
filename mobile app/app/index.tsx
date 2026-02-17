import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, 
  Modal, TextInput, ScrollView, Alert, Platform, StatusBar 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '../constants/Colors';
import RecordCard from '../components/RecordCard';
import RecordFormModal from '../components/RecordFormModal';
import CategoryModal from '../components/CategoryModal';

const API_URL = 'https://thebeauty-room.com/api.php'; 

// Усі існуючі категорії в системі
const ALL_CATEGORIES = ['Всі записи', 'Масаж', 'Elos-епіляція', 'Доглядові процедури', 'Архів', 'Перетелефонувати', 'Прайс', 'Історія'];

// ФУНКЦІЯ ПЕРЕВІРКИ ПРАВ
const canAccess = (tab: string, role: string, permissionsStr: string) => {
  if (role === 'admin' || role === 'creator') return true;
  if (!permissionsStr) return false;
  const perms = permissionsStr.split(',').map(p => p.trim());
  if (tab === 'Всі записи' && perms.includes('all')) return true;
  const map: any = { 'Архів': 'archive', 'Перетелефонувати': 'call', 'Коментарі': 'comments' };
  const tabToCheck = map[tab] || tab;
  return perms.includes(tabToCheck) || perms.includes('all');
};

// ====================================================================
// 1. CREATOR DASHBOARD
// ====================================================================
function CreatorDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const role = (params.role as string) || 'creator';
  const permissions = (params.permissions as string) || '';
  const username = (params.username as string) || 'Creator';

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  const [records, setRecords] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true); 

  const [pricingData, setPricingData] = useState<any[]>([]);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [pricingForm, setPricingForm] = useState({ category_id: '', name: '', price_string: '', price_numeric: '' });

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userData');
    router.replace('/login');
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=get_all_data`);
      const textResponse = await response.text(); 
      try {
        const json = JSON.parse(textResponse); 
        if (json.status === 'success') {
          let combinedData: any[] = [];
          if (json.data.records) {
            combinedData = [...combinedData, ...json.data.records.map((item: any) => ({
              id: `rec_${item.id}`, realId: item.id, clientName: item.client_name, phone: item.phone,
              category: item.category, service: item.service_name, date: item.record_date,
              time: item.record_time, note: item.note, type: 'record'
            }))];
          }
          if (json.data.archive) {
            combinedData = [...combinedData, ...json.data.archive.map((item: any) => {
              const parts = item.service ? item.service.split(' → ') : [];
              const dtParts = item.datetime ? item.datetime.split(' ') : [];
              return {
                id: `arch_${item.id}`, realId: item.id, clientName: item.name, phone: item.phone,
                category: 'Архів', service: parts[1] || item.service, date: dtParts[0] || '',
                time: dtParts[1] ? dtParts[1].substring(0, 5) : '', note: '', type: 'archive'
              };
            })];
          }
          if (json.data.calls) {
            combinedData = [...combinedData, ...json.data.calls.map((item: any) => {
              const dt = new Date(item.created_at);
              return {
                id: `call_${item.id}`, realId: item.id, clientName: item.name, phone: item.phone,
                category: 'Перетелефонувати', service: item.service || 'Не вказано', date: dt.toISOString().split('T')[0],
                time: dt.toTimeString().slice(0, 5), note: item.message, type: 'call'
              };
            })];
          }
          setRecords(combinedData);
        }
      } catch (parseError) {}
    } catch (error) {} finally { setIsLoading(false); }
  };

  const fetchPricing = async () => {
    try {
      const response = await fetch(`${API_URL}?action=get_pricing`);
      const json = await response.json();
      if (json.status === 'success') setPricingData(json.data);
    } catch (error) {}
  };

  useEffect(() => {
    if (activeSection === 'pricing') fetchPricing();
    else if (['all', 'Масаж', 'Elos-епіляція', 'Доглядові процедури', 'archive', 'call'].includes(activeSection)) fetchRecords();
  }, [activeSection]);

  const handleArchive = async (id: string, realId: string) => {
    try {
      const form = new FormData(); form.append('move_one', realId);
      await fetch(API_URL, { method: 'POST', body: form });
      fetchRecords();
    } catch (e) {}
  };

  const handleRestore = async (id: string, realId: string) => {
    try {
      const form = new FormData(); form.append('restore', realId);
      await fetch(API_URL, { method: 'POST', body: form });
      fetchRecords();
    } catch (e) {}
  };

  const handleDelete = async (id: string, realId: string, type: string) => {
    Alert.alert("Видалити?", "Безповоротно.", [
      { text: "Ні", style: "cancel" },
      { text: "Так", style: "destructive", onPress: async () => {
          try {
            const form = new FormData();
            if (type === 'call') form.append('delete_appointment', realId);
            else form.append('delete_id', realId);
            await fetch(API_URL, { method: 'POST', body: form });
            fetchRecords();
          } catch (e) {}
      }}
    ]);
  };

  // Прайс логіка
  const openAddService = () => {
    setEditingService(null);
    setPricingForm({ category_id: pricingData[0]?.category_id || '', name: '', price_string: '', price_numeric: '' });
    setPricingModalVisible(true);
  };
  const openEditService = (service: any, categoryId: string) => {
    setEditingService(service);
    setPricingForm({ category_id: categoryId, name: service.name, price_string: service.price_string, price_numeric: service.price_numeric.toString() });
    setPricingModalVisible(true);
  };
  const handleSaveService = async () => {
    try {
      const form = new FormData();
      form.append('name', pricingForm.name);
      form.append('price_string', pricingForm.price_string);
      form.append('price_numeric', pricingForm.price_numeric);
      if (editingService) {
        form.append('update_service', '1');
        form.append('service_id', editingService.service_id);
      } else {
        form.append('add_service', '1');
        form.append('category_id', pricingForm.category_id);
      }
      const response = await fetch(API_URL, { method: 'POST', body: form });
      const res = await response.json();
      if(res.status === 'success') {
        setPricingModalVisible(false);
        fetchPricing();
      } else Alert.alert("Помилка", res.message);
    } catch (e) {}
  };
  const handleDeleteService = (service_id: string) => {
    Alert.alert("Видалити послугу?", "Цю дію неможливо скасувати.", [
      { text: "Ні", style: "cancel" },
      { text: "Так, видалити", style: "destructive", onPress: async () => {
          const form = new FormData(); form.append('delete_service', service_id);
          await fetch(API_URL, { method: 'POST', body: form });
          fetchPricing();
      }}
    ]);
  };

  const getFilteredRecords = () => {
    if (activeSection === 'all') return records.filter(r => r.category !== 'Архів' && r.category !== 'Перетелефонувати');
    if (activeSection === 'archive') return records.filter(r => r.category === 'Архів');
    if (activeSection === 'call') return records.filter(r => r.category === 'Перетелефонувати'); 
    if (['Масаж', 'Elos-епіляція', 'Доглядові процедури'].includes(activeSection)) return records.filter(r => r.category === activeSection);
    return [];
  };

  const [currentTime, setCurrentTime] = useState(new Date());
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer); }, []);

  const generateCalendar = () => {
    const year = calDate.getFullYear(), month = calDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };
  const changeMonth = (dir: number) => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + dir, 1));
  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  const menuItems = ['dashboard', 'all', 'Масаж', 'Elos-епіляція', 'Доглядові процедури', 'archive', 'call', 'pricing', 'history'];
  const allowedMenuItems = menuItems.filter(item => {
      if (item === 'dashboard') return true;
      const checkMap: any = { 'all': 'Всі записи', 'archive': 'Архів', 'call': 'Перетелефонувати', 'pricing': 'pricing', 'history': 'history' };
      return canAccess(checkMap[item] || item, role, permissions);
  });

  const renderContent = () => {
    if (activeSection === 'dashboard') {
      return (
        <ScrollView contentContainerStyle={{padding: 20}}>
            <View style={styles.calendarContainer}>
                <View style={styles.calHeader}>
                    <TouchableOpacity onPress={() => changeMonth(-1)}><Ionicons name="chevron-back" size={20} color="#333" /></TouchableOpacity>
                    <Text style={{fontSize: 16, fontWeight: 'bold'}}>{calDate.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })}</Text>
                    <TouchableOpacity onPress={() => changeMonth(1)}><Ionicons name="chevron-forward" size={20} color="#333" /></TouchableOpacity>
                </View>
                <View style={styles.calGrid}>
                    {['Нд','Пн','Вт','Ср','Чт','Пт','Сб'].map(d => <Text key={d} style={styles.calWeekText}>{d}</Text>)}
                    {generateCalendar().map((day, index) => {
                        if (!day) return <View key={index} style={styles.calDayBox} />;
                        const isSel = isSameDay(day, selectedDate);
                        return (
                            <TouchableOpacity key={index} style={[styles.calDayBox, isSel && styles.calSelectedBox]} onPress={() => setSelectedDate(day)}>
                                <Text style={[styles.calDayText, isSel && {color: '#FFF'}]}>{day.getDate()}</Text>
                                {day.getDate() % 4 === 0 && <View style={[styles.calDot, isSel && {backgroundColor: '#FFF'}]} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
            <View style={styles.widgetCard}>
                <Text style={styles.widgetTitle}>Поточний час</Text>
                <Text style={styles.clockTime}>{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </View>
        </ScrollView>
      );
    } 
    else if (activeSection === 'pricing') {
      return (
        <View style={{flex: 1, padding: 20}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
            <Text style={styles.sectionTitle}>Редактор Прайсу</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openAddService}>
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={{color: '#FFF', fontWeight: 'bold', marginLeft: 5}}>Додати</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {pricingData.map((category) => (
              <View key={category.category_id} style={styles.pricingCategoryCard}>
                <View style={styles.pricingCategoryHeader}>
                  <Text style={styles.pricingCategoryTitle}>{category.title}</Text>
                </View>
                {category.services.map((service: any) => (
                  <TouchableOpacity 
                    key={service.service_id} 
                    style={styles.pricingServiceItem}
                    onPress={() => openEditService(service, category.category_id)}
                  >
                    <Text style={styles.pricingServiceName}>{service.name}</Text>
                    <Text style={styles.pricingServicePrice}>{service.price_string} грн</Text>
                  </TouchableOpacity>
                ))}
                {category.services.length === 0 && <Text style={{padding: 15, color: '#888', fontStyle: 'italic'}}>Немає послуг</Text>}
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }
    else if (['all', 'Масаж', 'Elos-епіляція', 'Доглядові процедури', 'archive', 'call'].includes(activeSection)) {
      return (
        <View style={{flex: 1, padding: 20}}>
            <Text style={styles.sectionTitle}>{activeSection === 'all' ? 'Усі записи' : activeSection}</Text>
            <FlatList
                data={getFilteredRecords()}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <RecordCard 
                    item={item} 
                    onEdit={() => {}}
                    onArchive={() => handleArchive(item.id, item.realId)}
                    onRestore={() => handleRestore(item.id, item.realId)}
                    onDeletePermanent={() => handleDelete(item.id, item.realId, item.type)}
                  />
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>{isLoading ? 'Завантаження...' : 'Записів немає'}</Text>}
            />
        </View>
      );
    }
    else {
      return <Text style={{textAlign:'center', marginTop: 50, color: '#888'}}>Розділ: {activeSection} у розробці</Text>;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)}><Ionicons name="menu" size={30} color={Colors.textMain} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Creator Panel</Text>
        <TouchableOpacity onPress={handleLogout}><Ionicons name="log-out-outline" size={26} color={Colors.danger} /></TouchableOpacity>
      </View>

      <Modal visible={sidebarVisible} transparent animationType="fade" onRequestClose={() => setSidebarVisible(false)}>
        <View style={{flex: 1, flexDirection: 'row'}}>
            <View style={styles.sidebar}>
                <View style={styles.sidebarHeader}>
                    <Text style={styles.sidebarTitle}>Меню</Text>
                    <TouchableOpacity onPress={() => setSidebarVisible(false)}><Ionicons name="close" size={26} color="#FFF" /></TouchableOpacity>
                </View>
                <ScrollView style={{flex: 1}}>
                    {allowedMenuItems.map((item) => (
                        <TouchableOpacity key={item} style={[styles.menuItem, activeSection === item && styles.menuItemActive]} onPress={() => {setActiveSection(item); setSidebarVisible(false);}}>
                            <Ionicons name="albums-outline" size={20} color={activeSection === item ? Colors.primary : "#AAA"} />
                            <Text style={[styles.menuText, activeSection === item && {color: '#FFF', fontWeight: 'bold'}]}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <View style={styles.userInfo}>
                    <Text style={{color: '#FFF', fontWeight: 'bold'}}>{username}</Text>
                    <Text style={{color: '#AAA', fontSize: 12}}>{role}</Text>
                </View>
            </View>
            <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)'}} onPress={() => setSidebarVisible(false)} />
        </View>
      </Modal>

      {renderContent()}

      <Modal visible={pricingModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPricingModalVisible(false)}>
        <SafeAreaView style={{flex: 1, backgroundColor: '#FFF'}}>
            <View style={{padding: 20, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={{fontSize: 20, fontWeight: 'bold'}}>{editingService ? 'Редагувати послугу' : 'Нова послуга'}</Text>
                <TouchableOpacity onPress={() => setPricingModalVisible(false)}><Ionicons name="close" size={28}/></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{padding: 20}}>
                {!editingService && (
                  <>
                    <Text style={styles.label}>Категорія</Text>
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 15}}>
                        {pricingData.map((cat: any) => (
                            <TouchableOpacity key={cat.category_id} style={[styles.chip, pricingForm.category_id === cat.category_id && styles.chipActive]} onPress={() => setPricingForm({...pricingForm, category_id: cat.category_id})}>
                                <Text style={{color: pricingForm.category_id === cat.category_id ? '#FFF' : '#333', fontSize: 13}}>{cat.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                  </>
                )}
                <Text style={styles.label}>Назва послуги</Text>
                <TextInput style={styles.input} value={pricingForm.name} onChangeText={t => setPricingForm({...pricingForm, name: t})} />
                <Text style={styles.label}>Ціна (текст, напр. "500 / 700")</Text>
                <TextInput style={styles.input} value={pricingForm.price_string} onChangeText={t => setPricingForm({...pricingForm, price_string: t})} />
                <Text style={styles.label}>Ціна (число для кошика)</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={pricingForm.price_numeric} onChangeText={t => setPricingForm({...pricingForm, price_numeric: t})} />
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveService}>
                    <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 16}}>Зберегти</Text>
                </TouchableOpacity>
                {editingService && (
                    <TouchableOpacity style={[styles.saveBtn, {backgroundColor: Colors.danger}]} onPress={() => handleDeleteService(editingService.service_id)}>
                        <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 16}}>Видалити послугу</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// ====================================================================
// 2. STANDARD DASHBOARD
// ====================================================================
function StandardDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const role = (params.role as string) || 'admin';
  const permissions = (params.permissions as string) || '';
  const username = (params.username as string) || 'Користувач';

  const allowedCategories = ALL_CATEGORIES.filter(cat => canAccess(cat, role, permissions));
  const [selectedCategory, setSelectedCategory] = useState(allowedCategories[0] || 'Всі записи');
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false); // ВІКНО ПРОФІЛЮ
  const [editingItem, setEditingItem] = useState<any>(null);

  const [records, setRecords] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userData');
    router.replace('/login');
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=get_all_data`);
      const textResponse = await response.text(); 
      try {
        const json = JSON.parse(textResponse); 
        if (json.status === 'success') {
          let combinedData: any[] = [];
          if (json.data.records) {
            combinedData = [...combinedData, ...json.data.records.map((item: any) => ({
              id: `rec_${item.id}`, realId: item.id, clientName: item.client_name, phone: item.phone,
              category: item.category, service: item.service_name, date: item.record_date,
              time: item.record_time, note: item.note, type: 'record'
            }))];
          }
          if (json.data.archive) {
            combinedData = [...combinedData, ...json.data.archive.map((item: any) => {
              const parts = item.service ? item.service.split(' → ') : [];
              const dtParts = item.datetime ? item.datetime.split(' ') : [];
              return {
                id: `arch_${item.id}`, realId: item.id, clientName: item.name, phone: item.phone,
                category: 'Архів', service: parts[1] || item.service, date: dtParts[0] || '',
                time: dtParts[1] ? dtParts[1].substring(0, 5) : '', note: '', type: 'archive'
              };
            })];
          }
          if (json.data.calls) {
            combinedData = [...combinedData, ...json.data.calls.map((item: any) => {
              const dt = new Date(item.created_at);
              return {
                id: `call_${item.id}`, realId: item.id, clientName: item.name, phone: item.phone,
                category: 'Перетелефонувати', service: item.service || 'Не вказано', date: dt.toISOString().split('T')[0],
                time: dt.toTimeString().slice(0, 5), note: item.message, type: 'call'
              };
            })];
          }
          setRecords(combinedData);
        }
      } catch (e) {}
    } catch (e) {} finally { setIsLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, []);

  const filteredRecords = selectedCategory === 'Всі записи'
    ? records.filter(r => r.category !== 'Архів' && r.category !== 'Перетелефонувати')
    : records.filter(r => r.category === selectedCategory);

  const handleSaveRecord = async (data: any) => {
    setFormVisible(false);
    try {
        const formDataToSubmit = new FormData();
        if (editingItem) {
            formDataToSubmit.append('update_id', editingItem.realId);
            formDataToSubmit.append('client_name', data.clientName);
            formDataToSubmit.append('phone', data.phone);
            formDataToSubmit.append('service_name', data.service);
            formDataToSubmit.append('note', data.note || '');
        } else {
            formDataToSubmit.append('add_record', '1');
            formDataToSubmit.append('client_name', data.clientName);
            formDataToSubmit.append('phone', data.phone);
            formDataToSubmit.append('category', data.category);
            formDataToSubmit.append('service_name', data.service);
            formDataToSubmit.append('record_date', data.date); 
            formDataToSubmit.append('record_time', data.time); 
            formDataToSubmit.append('note', data.note || '');
        }

        await fetch(API_URL, { method: 'POST', body: formDataToSubmit });
        fetchRecords(); 
    } catch (error) { Alert.alert('Помилка', 'Не вдалося зберегти запис'); }
  };

  const handleArchive = async (id: string, realId: string) => {
    try {
      const form = new FormData(); form.append('move_one', realId);
      await fetch(API_URL, { method: 'POST', body: form });
      fetchRecords();
    } catch (e) {}
  };

  const handleRestore = async (id: string, realId: string) => {
    try {
      const form = new FormData(); form.append('restore', realId);
      await fetch(API_URL, { method: 'POST', body: form });
      fetchRecords();
    } catch (e) {}
  };

  const handleDelete = async (id: string, realId: string, type: string) => {
    Alert.alert("Видалити?", "Безповоротно.", [
      { text: "Ні", style: "cancel" },
      { text: "Так", style: "destructive", onPress: async () => {
          try {
            const form = new FormData();
            if (type === 'call') form.append('delete_appointment', realId);
            else form.append('delete_id', realId);
            await fetch(API_URL, { method: 'POST', body: form });
            fetchRecords();
          } catch (e) {}
      }}
    ]);
  };

  const todayDate = new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'long' });
  const getIconColor = (tabName: string) => selectedCategory === tabName ? Colors.primaryDark : '#AAA';

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
            <View>
                <Text style={styles.greetingText}>Привіт, {username} 👋</Text>
                <Text style={styles.dateText}>{todayDate}</Text>
            </View>
            <View style={styles.notificationBadge}>
                 <Ionicons name="notifications-outline" size={24} color={Colors.primaryDark} />
                 <View style={styles.redDot} />
            </View>
        </View>
        <TouchableOpacity style={styles.categoryBigButton} onPress={() => setMenuVisible(true)} activeOpacity={0.8}>
            <View>
                <Text style={styles.categoryLabel}>Поточна категорія:</Text>
                <Text style={styles.categoryValue}>{selectedCategory || 'Немає доступу'}</Text>
            </View>
            <View style={styles.categoryIconBox}><Ionicons name="filter" size={20} color="#FFF" /></View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <RecordCard 
            item={item} 
            onEdit={() => { setEditingItem(item); setFormVisible(true); }}
            onArchive={() => handleArchive(item.id, item.realId)}
            onRestore={() => handleRestore(item.id, item.realId)} // ВІДНОВЛЕНО АРХІВ
            onDeletePermanent={() => handleDelete(item.id, item.realId, item.type)}
          />
        )}
        contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 130 }}
        refreshing={isLoading}
        onRefresh={fetchRecords} 
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <Ionicons name="clipboard-outline" size={60} color="#DDD" />
                <Text style={styles.emptyText}>{isLoading ? 'Завантаження...' : 'У цій категорії записів немає'}</Text>
            </View>
        }
      />

      {/* FLOATING NAV */}
      <View style={styles.navContainer}>
        <View style={styles.navBar}>
          <View style={styles.navSide}>
            {canAccess('Всі записи', role, permissions) && (
              <TouchableOpacity style={styles.navItem} onPress={() => setSelectedCategory('Всі записи')}>
                <Ionicons name="home-outline" size={24} color={getIconColor('Всі записи')} />
                {selectedCategory === 'Всі записи' && <View style={styles.activeDot} />}
              </TouchableOpacity>
            )}
            
            {canAccess('Архів', role, permissions) && (
              <TouchableOpacity style={styles.navItem} onPress={() => setSelectedCategory('Архів')}>
                <Ionicons name="time-outline" size={24} color={getIconColor('Архів')} />
                {selectedCategory === 'Архів' && <View style={styles.activeDot} />}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.addBtnContainer} onPress={() => { setEditingItem(null); setFormVisible(true); }} activeOpacity={0.9}>
             <View style={styles.addBtnCircle}><Ionicons name="add" size={38} color="#FFF" /></View>
          </TouchableOpacity>

          <View style={styles.navSide}>
            {canAccess('Перетелефонувати', role, permissions) && (
              <TouchableOpacity style={styles.navItem} onPress={() => setSelectedCategory('Перетелефонувати')}>
                <Ionicons name="call-outline" size={24} color={getIconColor('Перетелефонувати')} />
                {selectedCategory === 'Перетелефонувати' && <View style={styles.activeDot} />}
              </TouchableOpacity>
            )}
            {/* ІКОНКА ПРОФІЛЮ */}
            <TouchableOpacity style={styles.navItem} onPress={() => setProfileModalVisible(true)}>
              <Ionicons name="person-outline" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <RecordFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSaveRecord} initialData={editingItem} />
      
      <CategoryModal 
        visible={menuVisible} 
        selected={selectedCategory} 
        onClose={() => setMenuVisible(false)} 
        onSelect={setSelectedCategory} 
        customCategories={allowedCategories}
      />

      {/* МОДАЛКА ПРОФІЛЮ */}
      <Modal visible={profileModalVisible} transparent animationType="fade" onRequestClose={() => setProfileModalVisible(false)}>
        <TouchableOpacity style={styles.profileOverlay} onPress={() => setProfileModalVisible(false)} activeOpacity={1}>
          <View style={styles.profileModalCard}>
            <Ionicons name="person-circle-outline" size={70} color={Colors.primary} />
            <Text style={styles.profileName}>{username}</Text>
            <Text style={styles.profileRole}>Роль: {role}</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#FFF" />
              <Text style={styles.logoutButtonText}>Вийти з акаунту</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

// ====================================================================
export default function Index() {
  const params = useLocalSearchParams();
  const role = params.role || 'admin'; 

  if (role === 'creator') return <CreatorDashboard />;
  return <StandardDashboard />;
}

// ====================================================================
// СТИЛІ
// ====================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  headerContainer: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 10, marginBottom: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greetingText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 14, color: '#888', textTransform: 'capitalize', marginTop: 2 },
  notificationBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  redDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5252', borderWidth: 1, borderColor: '#FFF' },
  categoryBigButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingVertical: 15, paddingHorizontal: 20, borderRadius: 20, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  categoryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  categoryValue: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  categoryIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center', backgroundColor: '#FFF', marginTop: 30 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  sidebar: { width: 280, backgroundColor: '#1a1a2e', height: '100%', paddingVertical: 20 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  sidebarTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderLeftWidth: 4, borderLeftColor: 'transparent' },
  menuItemActive: { backgroundColor: '#252540', borderLeftColor: Colors.primary },
  menuText: { marginLeft: 15, color: '#AAA', textTransform: 'capitalize' },
  userInfo: { padding: 20, borderTopWidth: 1, borderColor: '#333' },
  
  calendarContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeekText: { width: '14.28%', textAlign: 'center', color: '#AAA', marginBottom: 10 },
  calDayBox: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  calSelectedBox: { backgroundColor: '#FF4D6D', borderRadius: 50 },
  calDayText: { fontSize: 16, color: '#333' },
  calDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 4, backgroundColor: '#FF4D6D' },

  widgetCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  widgetTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#555' },
  clockTime: { fontSize: 32, fontWeight: 'bold', color: Colors.primary },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, borderBottomWidth: 1, borderColor: '#f0f0f0', paddingBottom: 5 },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#AAA', fontSize: 16, marginTop: 10 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  navContainer: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 15 },
  navBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', width: '100%', height: 75, borderRadius: 40, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
  navSide: { flexDirection: 'row', gap: 25, alignItems: 'center' },
  navItem: { alignItems: 'center', justifyContent: 'center', height: 50, width: 40 },
  activeDot: { position: 'absolute', bottom: 5, width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.primaryDark },
  addBtnContainer: { top: -25, shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10 },
  addBtnCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.primaryDark, justifyContent: 'center', alignItems: 'center', borderWidth: 5, borderColor: '#F8F9FD' },
  addBtn: { flexDirection: 'row', backgroundColor: Colors.primary, padding: 10, borderRadius: 8, alignItems: 'center' },

  pricingCategoryCard: { backgroundColor: '#FFF', borderRadius: 10, marginBottom: 20, overflow: 'hidden', elevation: 2 },
  pricingCategoryHeader: { backgroundColor: '#f9f9f9', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  pricingCategoryTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  pricingServiceItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  pricingServiceName: { fontSize: 16, color: '#333', flex: 1 },
  pricingServicePrice: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  
  label: { marginTop: 10, marginBottom: 5, color: '#666' },
  input: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EEE' },
  chipActive: { backgroundColor: Colors.primary },
  saveBtn: { backgroundColor: Colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 15 },

  // Стилі для модалки профілю
  profileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  profileModalCard: { width: '80%', backgroundColor: '#FFF', borderRadius: 20, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 10 },
  profileRole: { fontSize: 14, color: '#888', marginTop: 5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 25 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.danger, paddingVertical: 12, paddingHorizontal: 25, borderRadius: 12, gap: 8 },
  logoutButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});