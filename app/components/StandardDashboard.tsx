import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, StatusBar, SafeAreaView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '../constants/Colors';
import { API_URL, ALL_CATEGORIES, SERVICE_CATEGORIES, MASTER_NAMES, FORM_PERMISSIONS, canAccess } from '../constants/AppConfig';
import RecordCard from './RecordCard';
import RecordFormModal from './RecordFormModal';
import CategoryModal from './CategoryModal';

export default function StandardDashboard({ user }: { user: any }) {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]); 
  const [pricingData, setPricingData] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);

  // Фільтруємо меню відповідно до ролі
  const allowedMenuItems = ALL_CATEGORIES.filter(item => canAccess(item, user.username));
  const [selectedCategory, setSelectedCategory] = useState(allowedMenuItems[0] || 'Всі записи');
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [preFillClient, setPreFillClient] = useState<any>(null);

  const handleLogout = async () => { 
    Alert.alert("Вихід", "Вийти з акаунту?", [
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
            // Записи
            if(jsonRec.data.records) combined.push(...jsonRec.data.records.map((i:any)=>({...i, id:`rec_${i.id}`, realId:i.id, clientName:i.client_name, service:i.service_name, date:i.record_date, time:i.record_time, type:'record', master: i.worker_name || 'Не вказано'})));
            // Архів
            if(jsonRec.data.archive) combined.push(...jsonRec.data.archive.map((i:any)=>({...i, id:`arch_${i.id}`, realId:i.id, clientName:i.name, category:'Архів', service:(i.service||'').split(' → ')[1]||i.service, date:(i.datetime||'').split(' ')[0], time:((i.datetime||'').split(' ')[1]||'').substr(0,5), type:'archive', master:'Архів'})));
            // Дзвінки
            if(jsonRec.data.calls) combined.push(...jsonRec.data.calls.map((i:any)=>({...i, id:`call_${i.id}`, realId:i.id, clientName:i.name, category:'Перетелефонувати', phone:i.phone, service:i.service||'Не вказано', date:(i.created_at||'').split(' ')[0], time:((i.created_at||'').split(' ')[1]||'').substr(0,5), note:i.message, type:'call'})));
            setRecords(combined);
        }
        // Отримуємо прайс (для форми)
        const resPrice = await fetch(`${API_URL}?action=get_pricing`);
        const jsonPrice = await resPrice.json();
        if(jsonPrice.status === 'success') setPricingData(jsonPrice.data);
    } catch(e) {} finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredRecords = selectedCategory === 'Всі записи'
    ? records.filter(r => r.category !== 'Архів' && r.category !== 'Перетелефонувати')
    : records.filter(r => r.category === selectedCategory);

  // --- CRUD ОПЕРАЦІЇ (ВИПРАВЛЕНО) ---

  const handleSaveRecord = async (data: any) => {
    setFormVisible(false);
    try {
        const f = new FormData();
        if (editingItem) {
            f.append('action', 'update_record'); 
            f.append('update_id', String(editingItem.realId));
            f.append('client_name', data.clientName);
            f.append('phone', data.phone);
            f.append('service_name', data.service);
            f.append('note', data.note || '');
            f.append('worker_name', data.master);
        } else {
            f.append('action', 'add_record'); 
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
    } catch(e) { Alert.alert("Помилка", "Не вдалося зберегти"); }
  };

  const handleArchive = async (id: string, realId: string) => {
    try {
      const f = new FormData();
      f.append('action', 'move_to_archive');
      f.append('id', String(realId)); 
      
      const res = await fetch(API_URL, { method: 'POST', body: f });
      const json = await res.json();
      
      if (json.status === 'success') fetchData();
      else Alert.alert("Помилка", json.message);
    } catch (e) { Alert.alert("Помилка мережі"); }
  };

  const handleRestore = async (id: string, realId: string) => {
    try {
      const f = new FormData();
      f.append('action', 'restore');
      f.append('id', String(realId));

      const res = await fetch(API_URL, { method: 'POST', body: f });
      const json = await res.json();
      
      if (json.status === 'success') {
          Alert.alert("Успіх", "Запис відновлено!");
          fetchData();
      } else {
          Alert.alert("Помилка сервера", json.message);
      }
    } catch (e) { Alert.alert("Помилка мережі"); }
  };

  const handleDelete = async (id: string, realId: string, type: string) => {
    Alert.alert("Видалити?", "Безповоротно.", [{text: "Ні"}, {text: "Так", style: "destructive", onPress: async () => {
        try {
            const f = new FormData();
            if (type === 'call') f.append('action', 'delete_appointment');
            else if (type === 'archive') f.append('action', 'delete_archive');
            else f.append('action', 'delete_record');
            
            f.append('id', String(realId)); 

            await fetch(API_URL, { method: 'POST', body: f });
            fetchData();
        } catch (e) { Alert.alert("Помилка видалення"); }
    }}]);
  };

  const handleConvertCall = (item: any) => {
    setEditingItem(null);
    setPreFillClient({ name: item.clientName, phone: item.phone, note: item.note, serviceHint: item.service });
    setFormVisible(true);
  };

  // Фільтруємо категорії у формі додавання запису
  const formAllowedCategories = FORM_PERMISSIONS[user.username] || SERVICE_CATEGORIES;
  
  const getIconColor = (tabName: string) => selectedCategory === tabName ? Colors.primaryDark : '#AAA';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FD" />
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
            <View>
                <Text style={styles.greetingText}>Привіт, {MASTER_NAMES[user.username] || user.username} 👋</Text>
                <Text style={styles.dateText}>{new Date().toLocaleDateString('uk-UA', {day:'numeric', month:'long'})}</Text>
            </View>
            <TouchableOpacity style={styles.notificationBadge} onPress={() => fetchData()}>
                 <Ionicons name="refresh" size={24} color={Colors.primaryDark} />
            </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.categoryBigButton} onPress={() => setMenuVisible(true)} activeOpacity={0.8}>
            <View>
                <Text style={styles.categoryLabel}>Поточна категорія:</Text>
                <Text style={styles.categoryValue}>{selectedCategory}</Text>
            </View>
            <View style={styles.categoryIconBox}><Ionicons name="filter" size={20} color="#FFF" /></View>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <FlatList 
        data={filteredRecords} keyExtractor={i=>i.id} 
        renderItem={({item}) => (
            <View>
                <RecordCard 
                    item={item} 
                    onEdit={()=>{setEditingItem(item); setFormVisible(true)}} 
                    onArchive={()=>handleArchive(item.id, item.realId)} 
                    onRestore={()=>handleRestore(item.id, item.realId)} 
                    onDeletePermanent={()=>handleDelete(item.id, item.realId, item.type)}
                />
                {item.type === 'call' && (
                    <TouchableOpacity style={styles.callBackBtn} onPress={() => handleConvertCall(item)}>
                        <Text style={{color:'#FFF', fontWeight:'bold'}}>➕ Записати</Text>
                    </TouchableOpacity>
                )}
            </View>
        )} 
        contentContainerStyle={{paddingBottom: 130, paddingTop: 10}}
        ListEmptyComponent={<Text style={{textAlign:'center', color:'#aaa', marginTop:50}}>{isLoading ? 'Завантаження...' : 'Пусто'}</Text>}
      />

      {/* BOTTOM NAV */}
      <View style={styles.navContainer}>
        <View style={styles.navBar}>
          <View style={styles.navSide}>
            {canAccess('Всі записи', user.username) && <TouchableOpacity style={styles.navItem} onPress={() => setSelectedCategory('Всі записи')}><Ionicons name="home-outline" size={24} color={getIconColor('Всі записи')} />{selectedCategory==='Всі записи' && <View style={styles.activeDot} />}</TouchableOpacity>}
            {canAccess('Архів', user.username) && <TouchableOpacity style={styles.navItem} onPress={() => setSelectedCategory('Архів')}><Ionicons name="time-outline" size={24} color={getIconColor('Архів')} />{selectedCategory==='Архів' && <View style={styles.activeDot} />}</TouchableOpacity>}
          </View>
          <TouchableOpacity style={styles.addBtnContainer} onPress={() => { setEditingItem(null); setPreFillClient(null); setFormVisible(true); }}><View style={styles.addBtnCircle}><Ionicons name="add" size={38} color="#FFF" /></View></TouchableOpacity>
          <View style={styles.navSide}>
            {canAccess('Перетелефонувати', user.username) && <TouchableOpacity style={styles.navItem} onPress={() => setSelectedCategory('Перетелефонувати')}><Ionicons name="call-outline" size={24} color={getIconColor('Перетелефонувати')} />{selectedCategory==='Перетелефонувати' && <View style={styles.activeDot} />}</TouchableOpacity>}
            <TouchableOpacity style={styles.navItem} onPress={() => setProfileModalVisible(true)}><Ionicons name="person-outline" size={24} color={Colors.textSecondary} /></TouchableOpacity>
          </View>
        </View>
      </View>

      <RecordFormModal 
        visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSaveRecord} 
        initialData={editingItem} servicesData={pricingData} 
        allowedCategories={formAllowedCategories} 
        defaultCategory={!['Архів','Перетелефонувати','Всі записи'].includes(selectedCategory) ? selectedCategory : formAllowedCategories[0]}
        preFillClient={preFillClient}
      />
      
      <CategoryModal visible={menuVisible} selected={selectedCategory} onClose={() => setMenuVisible(false)} onSelect={setSelectedCategory} customCategories={allowedMenuItems}/>
      
      <Modal visible={profileModalVisible} transparent animationType="fade" onRequestClose={() => setProfileModalVisible(false)}>
        <TouchableOpacity style={styles.profileOverlay} onPress={() => setProfileModalVisible(false)} activeOpacity={1}>
          <View style={styles.profileModalCard}>
            <Ionicons name="person-circle-outline" size={70} color={Colors.primary} />
            <Text style={styles.profileName}>{MASTER_NAMES[user.username] || user.username}</Text>
            <Text style={styles.profileRole}>Роль: {user.role}</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Вийти</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  headerContainer: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 10, marginBottom: 10, zIndex: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greetingText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 14, color: '#888', textTransform: 'capitalize', marginTop: 2 },
  notificationBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  categoryBigButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingVertical: 15, paddingHorizontal: 20, borderRadius: 20, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  categoryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  categoryValue: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  categoryIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  navContainer: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 15 },
  navBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', width: '100%', height: 75, borderRadius: 40, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
  navSide: { flexDirection: 'row', gap: 25, alignItems: 'center' },
  navItem: { alignItems: 'center', justifyContent: 'center', height: 50, width: 40 },
  activeDot: { position: 'absolute', bottom: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primaryDark },
  addBtnContainer: { top: -25, shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10 },
  addBtnCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.primaryDark, justifyContent: 'center', alignItems: 'center', borderWidth: 5, borderColor: '#F8F9FD' },
  addBtnSmall: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  profileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  profileModalCard: { width: '85%', backgroundColor: '#FFF', borderRadius: 25, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  profileName: { fontSize: 24, fontWeight: 'bold', color: Colors.textMain, marginTop: 15 },
  profileRole: { fontSize: 14, color: '#AAA', marginTop: 5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 30 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F0', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 15, gap: 10 },
  logoutButtonText: { color: Colors.danger, fontSize: 16, fontWeight: 'bold' },
  callBackBtn: { backgroundColor: Colors.primary, marginHorizontal: 20, marginTop: -10, marginBottom: 15, padding: 10, borderRadius: 10, alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
});