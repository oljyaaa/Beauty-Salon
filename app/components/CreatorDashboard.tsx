import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, FlatList, ActivityIndicator, StatusBar 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '../constants/Colors';
import { API_URL, SERVICE_CATEGORIES, MASTER_NAMES } from '../constants/AppConfig';
import RecordCard from './RecordCard';
import RecordFormModal from './RecordFormModal';

export default function CreatorDashboard({ user }: { user: any }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  const [records, setRecords] = useState<any[]>([]); 
  const [pricingData, setPricingData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true); 

  // Стан модалок
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [pricingForm, setPricingForm] = useState({ category_id: '', name: '', price_string: '', price_numeric: '' });
  const [preFillClient, setPreFillClient] = useState<any>(null);

  // --- ЛОГІКА КАЛЕНДАРЯ ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => { 
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); 
    return () => clearInterval(timer); 
  }, []);

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

  // --- API ЗАПИТИ ---
  const handleLogout = async () => {
    Alert.alert("Вихід", "Вийти з панелі?", [
      { text: "Ні", style: "cancel" },
      { text: "Так", style: "destructive", onPress: async () => { await AsyncStorage.removeItem('userData'); router.replace('/login'); }}
    ]);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
        // Отримуємо записи
        const resRec = await fetch(`${API_URL}?action=get_all_data`);
        const jsonRec = await resRec.json();
        if(jsonRec.status === 'success') {
            let combined: any[] = [];
            if(jsonRec.data.records) combined.push(...jsonRec.data.records.map((i:any)=>({...i, id:`rec_${i.id}`, realId:i.id, clientName:i.client_name, service:i.service_name, date:i.record_date, time:i.record_time, type:'record', master: i.worker_name || 'Не вказано'})));
            if(jsonRec.data.archive) combined.push(...jsonRec.data.archive.map((i:any)=>({...i, id:`arch_${i.id}`, realId:i.id, clientName:i.name, category:'Архів', service:(i.service||'').split(' → ')[1]||i.service, date:(i.datetime||'').split(' ')[0], time:((i.datetime||'').split(' ')[1]||'').substr(0,5), type:'archive', master:'Архів'})));
            if(jsonRec.data.calls) combined.push(...jsonRec.data.calls.map((i:any)=>({...i, id:`call_${i.id}`, realId:i.id, clientName:i.name, category:'Перетелефонувати', phone:i.phone, service:i.service||'Не вказано', date:(i.created_at||'').split(' ')[0], time:((i.created_at||'').split(' ')[1]||'').substr(0,5), note:i.message, type:'call'})));
            setRecords(combined);
        }
        // Отримуємо прайс
        const resPrice = await fetch(`${API_URL}?action=get_pricing`);
        const jsonPrice = await resPrice.json();
        if(jsonPrice.status === 'success') setPricingData(jsonPrice.data);
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- CRUD ОПЕРАЦІЇ (ВИПРАВЛЕНО ПІД НОВИЙ API) ---
  
  const handleSaveRecord = async (data: any) => {
    setFormVisible(false);
    try {
        const f = new FormData();
        if (editingItem) {
            f.append('action', 'update_record'); // Оновлення
            f.append('update_id', String(editingItem.realId));
            f.append('client_name', data.clientName);
            f.append('phone', data.phone);
            f.append('service_name', data.service);
            f.append('note', data.note || '');
            f.append('worker_name', data.master);
        } else {
            f.append('action', 'add_record'); // Додавання
            f.append('client_name', data.clientName);
            f.append('phone', data.phone);
            f.append('category', data.category);
            f.append('service_name', data.service);
            f.append('record_date', data.date); 
            f.append('record_time', data.time); 
            f.append('note', data.note || '');
            f.append('worker_name', data.master);
        }
        await fetch(API_URL, {method:'POST', body:f}); 
        fetchData();
    } catch(e) { Alert.alert("Помилка збереження"); }
  };

  const handleArchive = async (id: string, realId: string) => {
    try {
      const f = new FormData();
      f.append('action', 'move_to_archive'); // Правильна назва дії
      f.append('id', String(realId));        // Передаємо як рядок
      
      const res = await fetch(API_URL, { method: 'POST', body: f });
      const json = await res.json();
      
      if (json.status === 'success') fetchData();
      else Alert.alert("Помилка", json.message);
    } catch (e) {
      Alert.alert("Помилка мережі");
    }
  };

  const handleRestore = async (id: string, realId: string) => {
    try {
      const f = new FormData();
      f.append('action', 'restore');  // Правильна назва дії
      f.append('id', String(realId)); // Передаємо як рядок

      const res = await fetch(API_URL, { method: 'POST', body: f });
      const json = await res.json();
      
      if (json.status === 'success') {
          Alert.alert("Успіх", "Запис відновлено!");
          fetchData();
      } else {
          Alert.alert("Помилка сервера", json.message);
      }
    } catch (e) {
      Alert.alert("Помилка мережі");
    }
  };

  const handleDelete = async (id: string, realId: string, type: string) => {
    Alert.alert("Видалити?", "Безповоротно.", [
      { text: "Ні" },
      {
        text: "Так",
        style: "destructive",
        onPress: async () => {
          try {
            const f = new FormData();
            if (type === 'call') f.append('action', 'delete_appointment');
            else if (type === 'archive') f.append('action', 'delete_archive');
            else f.append('action', 'delete_record');
            
            f.append('id', String(realId)); // Передаємо як рядок

            await fetch(API_URL, { method: 'POST', body: f });
            fetchData();
          } catch (e) {
            Alert.alert("Помилка видалення");
          }
        }
      }
    ]);
  };
  
  const handleConvertCall = (item: any) => { 
      setEditingItem(null); 
      setPreFillClient({ name: item.clientName, phone: item.phone, note: item.note, serviceHint: item.service }); 
      setFormVisible(true); 
  };

  // --- ПРАЙС ОПЕРАЦІЇ ---
  const openAddService = () => { setEditingService(null); setPricingForm({ category_id: pricingData[0]?.category_id || '', name: '', price_string: '', price_numeric: '' }); setPricingModalVisible(true); };
  const openEditService = (s:any, cid:string) => { setEditingService(s); setPricingForm({ category_id: cid, name: s.name, price_string: s.price_string, price_numeric: s.price_numeric.toString() }); setPricingModalVisible(true); };
  const handleSaveService = async () => { 
      try {
        const f=new FormData(); 
        f.append('name', pricingForm.name); 
        f.append('price_string', pricingForm.price_string); 
        f.append('price_numeric', pricingForm.price_numeric); 
        
        if(editingService){
            f.append('action', 'update_service');
            f.append('service_id', String(editingService.service_id));
        } else {
            f.append('action', 'add_service');
            f.append('category_id', String(pricingForm.category_id));
        } 
        await fetch(API_URL, {method:'POST', body:f}); 
        setPricingModalVisible(false); 
        fetchData(); 
      } catch(e) { Alert.alert("Помилка прайсу"); }
  };
  const handleDeleteService = (sid:string) => { 
      Alert.alert("Видалити?", "", [{text:"Так", onPress:async()=>{
          const f=new FormData(); 
          f.append('action', 'delete_service'); 
          f.append('delete_service', String(sid)); // Для сумісності з API (там delete_service)
          await fetch(API_URL, {method:'POST', body:f}); 
          fetchData();
      }}, {text:"Ні"}]); 
  };

  const getFilteredRecords = () => {
    if (activeSection === 'all') return records.filter(r => r.category !== 'Архів' && r.category !== 'Перетелефонувати');
    if (activeSection === 'archive') return records.filter(r => r.category === 'Архів');
    if (activeSection === 'call') return records.filter(r => r.category === 'Перетелефонувати'); 
    return records.filter(r => r.category === activeSection);
  };

  const menuItems = ['dashboard', 'all', 'Масаж', 'Elos-епіляція', 'Доглядові процедури', 'archive', 'call', 'pricing', 'history'];

  const getMenuIcon = (item: string) => {
    switch(item) {
        case 'dashboard': return 'grid-outline';
        case 'all': return 'list-outline';
        case 'archive': return 'time-outline';
        case 'call': return 'call-outline';
        case 'pricing': return 'pricetags-outline';
        case 'history': return 'calendar-outline';
        default: return 'layers-outline';
    }
  };

  // --- RENDER CONTENT ---
  const renderContent = () => {
    if (activeSection === 'dashboard') {
        return (
            <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 100}}>
                {/* КАЛЕНДАР */}
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
                
                {/* ВІДЖЕТИ */}
                <View style={styles.widgetCard}>
                    <View style={{flexDirection:'row', alignItems:'center', gap: 15}}>
                        <View style={{width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEF0FF', justifyContent:'center', alignItems:'center'}}>
                            <Ionicons name="time" size={28} color={Colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.widgetTitle}>Поточний час</Text>
                            <Text style={styles.clockTime}>{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                        </View>
                    </View>
                </View>
                 <View style={styles.widgetCard}>
                    <View style={{flexDirection:'row', alignItems:'center', gap: 15}}>
                        <View style={{width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF0F0', justifyContent:'center', alignItems:'center'}}>
                            <Ionicons name="stats-chart" size={28} color={Colors.danger} />
                        </View>
                        <View>
                            <Text style={styles.widgetTitle}>Статистика</Text>
                            <Text style={{fontSize: 16, color: Colors.textMain}}>Активних записів: <Text style={{fontWeight:'bold'}}>{records.filter(r => r.category !== 'Архів').length}</Text></Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        );
    } 
    else if (activeSection === 'pricing') {
      return (
        <View style={{flex: 1, padding: 20}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
            <Text style={styles.sectionTitle}>Редактор Прайсу</Text>
            <TouchableOpacity style={styles.addBtnFull} onPress={openAddService}>
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={{color: '#FFF', fontWeight: 'bold', marginLeft: 5}}>Додати послугу</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{paddingBottom: 100}}>
            {pricingData.map((category) => (
              <View key={category.category_id} style={styles.pricingCategoryCard}>
                <View style={styles.pricingCategoryHeader}>
                  <Text style={styles.pricingCategoryTitle}>{category.title}</Text>
                </View>
                {category.services.map((service: any) => (
                  <TouchableOpacity key={service.service_id} style={styles.pricingServiceItem} onPress={() => openEditService(service, category.category_id)}>
                    <Text style={styles.pricingServiceName}>{service.name}</Text>
                    <Text style={styles.pricingServicePrice}>{service.price_string} грн</Text>
                    <Ionicons name="chevron-forward" size={18} color="#CCC" />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }
    else {
      return (
        <View style={{flex: 1, padding: 20}}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                <Text style={styles.sectionTitle}>{activeSection}</Text>
                {(['all', ...SERVICE_CATEGORIES].includes(activeSection)) && 
                    <TouchableOpacity style={styles.addBtnSmall} onPress={() => { setEditingItem(null); setPreFillClient(null); setFormVisible(true); }}>
                        <Ionicons name="add" size={24} color="#FFF" />
                    </TouchableOpacity>
                }
            </View>
            <FlatList
                data={getFilteredRecords()}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View>
                    <RecordCard 
                        item={item} 
                        onEdit={() => { setEditingItem(item); setFormVisible(true); }}
                        onArchive={() => handleArchive(item.id, item.realId)}
                        onRestore={() => handleRestore(item.id, item.realId)}
                        onDeletePermanent={() => handleDelete(item.id, item.realId, item.type)}
                    />
                    {item.type === 'call' && (
                        <TouchableOpacity style={styles.callBackBtn} onPress={() => handleConvertCall(item)}>
                            <Text style={{color: '#FFF', fontWeight: 'bold'}}>➕ Записати клієнта</Text>
                        </TouchableOpacity>
                    )}
                  </View>
                )}
                contentContainerStyle={{paddingBottom: 100}}
                ListEmptyComponent={<Text style={styles.emptyText}>{isLoading ? 'Завантаження...' : 'Пусто'}</Text>}
            />
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FD" />
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
            <View>
                <Text style={styles.greetingText}>Привіт, Creator 👋</Text>
                <Text style={styles.dateText}>{new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'long' })}</Text>
            </View>
            <View style={styles.notificationBadge}><Ionicons name="notifications-outline" size={24} color={Colors.primaryDark} /><View style={styles.redDot} /></View>
        </View>
        <TouchableOpacity style={styles.categoryBigButton} onPress={() => setSidebarVisible(true)} activeOpacity={0.8}>
            <View><Text style={styles.categoryLabel}>Панель управління</Text><Text style={styles.categoryValue}>Відкрити меню</Text></View>
            <View style={styles.categoryIconBox}><Ionicons name="menu" size={24} color="#FFF" /></View>
        </TouchableOpacity>
      </View>

      {/* SIDEBAR */}
      <Modal visible={sidebarVisible} transparent animationType="fade" onRequestClose={() => setSidebarVisible(false)}>
        <View style={{flex: 1, flexDirection: 'row'}}>
            <View style={styles.sidebarLight}>
                <View style={styles.sidebarHeaderLight}>
                    <Text style={styles.sidebarTitleLight}>Меню</Text>
                    <TouchableOpacity onPress={() => setSidebarVisible(false)} style={styles.closeBtnLight}>
                      <Ionicons name="close" size={24} color={Colors.textMain} />
                    </TouchableOpacity>
                </View>
                <ScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 15}}>
                    {menuItems.map((item) => {
                      const isActive = activeSection === item;
                      return (
                        <TouchableOpacity key={item} style={[styles.menuItemSmooth, isActive && styles.menuItemSmoothActive]} onPress={() => {setActiveSection(item); setSidebarVisible(false);}}>
                            <View style={[styles.menuIconContainer, isActive && styles.menuIconContainerActive]}>
                              <Ionicons name={getMenuIcon(item) as any} size={22} color={isActive ? '#FFF' : Colors.primary} />
                            </View>
                            <Text style={[styles.menuTextSmooth, isActive && styles.menuTextSmoothActive]}>{item === 'dashboard' ? 'Головна' : item === 'all' ? 'Всі записи' : item}</Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
                <View style={styles.userInfoLight}>
                  <View style={styles.userAvatar}><Ionicons name="person" size={24} color={Colors.primary} /></View>
                    <View><Text style={{color: Colors.textMain, fontWeight: 'bold'}}>Creator</Text><Text style={{color: Colors.textSecondary, fontSize: 12}}>ADMIN</Text></View>
                    <TouchableOpacity onPress={handleLogout} style={{marginLeft: 'auto', padding: 10}}><Ionicons name="log-out-outline" size={24} color={Colors.danger} /></TouchableOpacity>
                </View>
            </View>
            <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.3)'}} onPress={() => setSidebarVisible(false)} />
        </View>
      </Modal>

      {renderContent()}

      {/* МОДАЛКИ (Форма запису і Прайсу) */}
      <RecordFormModal 
        visible={formVisible} 
        onClose={() => setFormVisible(false)} 
        onSave={handleSaveRecord} 
        initialData={editingItem} 
        servicesData={pricingData}  // ПЕРЕДАЄМО ПРАЙС
        allowedCategories={SERVICE_CATEGORIES}
        preFillClient={preFillClient}
      />

      <Modal visible={pricingModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPricingModalVisible(false)}>
        <View style={{flex: 1, backgroundColor: '#FFF', padding: 20}}>
            <Text style={{fontSize: 20, marginBottom: 20}}>Редагування послуги</Text>
            <TextInput style={styles.input} value={pricingForm.name} onChangeText={t => setPricingForm({...pricingForm, name: t})} placeholder="Назва" />
            <TextInput style={styles.input} value={pricingForm.price_string} onChangeText={t => setPricingForm({...pricingForm, price_string: t})} placeholder="Ціна" />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveService}><Text style={{color: '#FFF'}}>Зберегти</Text></TouchableOpacity>
            <TouchableOpacity style={{marginTop: 20, alignSelf:'center'}} onPress={() => setPricingModalVisible(false)}><Text style={{color: 'red'}}>Скасувати</Text></TouchableOpacity>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  headerContainer: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 10, marginBottom: 10, zIndex: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greetingText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 14, color: '#888', textTransform: 'capitalize', marginTop: 2 },
  notificationBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  redDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5252', borderWidth: 1, borderColor: '#FFF' },
  categoryBigButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingVertical: 15, paddingHorizontal: 20, borderRadius: 20, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  categoryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  categoryValue: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  categoryIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  sidebarLight: { width: 300, backgroundColor: '#FFF', height: '100%', paddingVertical: 50, borderTopRightRadius: 30, borderBottomRightRadius: 30 },
  sidebarHeaderLight: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginBottom: 30 },
  sidebarTitleLight: { color: Colors.textMain, fontSize: 24, fontWeight: 'bold' },
  closeBtnLight: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  menuItemSmooth: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 15, marginBottom: 10 },
  menuItemSmoothActive: { backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  menuIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF0FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuIconContainerActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  menuTextSmooth: { fontSize: 16, color: Colors.textMain, fontWeight: '600', textTransform: 'capitalize' },
  menuTextSmoothActive: { color: '#FFF' },
  userInfoLight: { padding: 25, borderTopWidth: 1, borderColor: '#F5F5F5', flexDirection: 'row', alignItems: 'center' },
  userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEF0FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  calendarContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeekText: { width: '14.28%', textAlign: 'center', color: '#AAA', marginBottom: 10, fontWeight: '600' },
  calDayBox: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  calSelectedBox: { backgroundColor: Colors.primary, borderRadius: 14, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  calDayText: { fontSize: 16, color: '#333', fontWeight: '600' },
  calDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  widgetCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  widgetTitle: { fontSize: 14, color: '#888', marginBottom: 5, textTransform: 'uppercase', fontWeight: '600' },
  clockTime: { fontSize: 28, fontWeight: 'bold', color: Colors.textMain },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#AAA', fontSize: 16, marginTop: 10 },
  sectionTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: Colors.textMain },
  addBtnFull: { flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  addBtnSmall: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  pricingCategoryCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 15, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  pricingCategoryHeader: { backgroundColor: '#F8F9FD', padding: 15, borderBottomWidth: 1, borderColor: '#F0F0F0' },
  pricingCategoryTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textMain },
  pricingServiceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#F5F5F5' },
  pricingServiceName: { fontSize: 16, color: Colors.textMain, flex: 1, fontWeight: '500' },
  pricingServicePrice: { fontSize: 16, fontWeight: 'bold', color: Colors.primary, marginRight: 10 },
  label: { marginTop: 15, marginBottom: 8, color: Colors.textMain, fontWeight: '600' },
  input: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 12, fontSize: 16, color: Colors.textMain, marginBottom: 10 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 25, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EEE' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  saveBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 25, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  callBackBtn: { backgroundColor: Colors.primary, marginHorizontal: 20, marginTop: -10, marginBottom: 15, padding: 10, borderRadius: 10, alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
});