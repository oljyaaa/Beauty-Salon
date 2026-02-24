import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, StatusBar, SafeAreaView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL, ALL_CATEGORIES, SERVICE_CATEGORIES, MASTER_NAMES, FORM_PERMISSIONS, canAccess } from '../constants/AppConfig';
import RecordCard from './RecordCard';
import RecordFormModal from './RecordFormModal';
import CategoryModal from './CategoryModal';

// === НОВА ПРЕМІУМ ПАЛІТРА "BEAUTY BOOKING APP" ===
const BeautyTheme = {
  bg: '#FDFBFB', // Дуже світлий перлинно-рожевий фон
  card: '#FFFFFF',
  primary: '#F0A3B1', // Ніжний пудрово-рожевий (Blush Pink)
  primaryDark: '#D48392', // Більш насичений рожевий для іконок/тіней
  primaryLight: '#FEF4F6', // Дуже світлий рожевий для фону іконок
  textMain: '#3A3333', // Графітово-коричневий (дорожче за чорний)
  textSecondary: '#9C9292', // М'який сіро-пудровий
  danger: '#F2A2A2', 
  border: '#F4EDED',
};

export default function StandardDashboard({ user }: { user: any }) {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]); 
  const [pricingData, setPricingData] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);

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
        const resRec = await fetch(`${API_URL}?action=get_all_data`);
        const jsonRec = await resRec.json();
        if(jsonRec.status === 'success') {
            let combined: any[] = [];
            if(jsonRec.data.records) combined.push(...jsonRec.data.records.map((i:any)=>({...i, id:`rec_${i.id}`, realId:i.id, clientName:i.client_name, service:i.service_name, date:i.record_date, time:i.record_time, type:'record', master: i.worker_name || 'Не вказано'})));
            if(jsonRec.data.archive) combined.push(...jsonRec.data.archive.map((i:any)=>({...i, id:`arch_${i.id}`, realId:i.id, clientName:i.name, category:'Архів', service:(i.service||'').split(' → ')[1]||i.service, date:(i.datetime||'').split(' ')[0], time:((i.datetime||'').split(' ')[1]||'').substr(0,5), type:'archive', master:'Архів'})));
            if(jsonRec.data.calls) combined.push(...jsonRec.data.calls.map((i:any)=>({...i, id:`call_${i.id}`, realId:i.id, clientName:i.name, category:'Перетелефонувати', phone:i.phone, service:i.service||'Не вказано', date:(i.created_at||'').split(' ')[0], time:((i.created_at||'').split(' ')[1]||'').substr(0,5), note:i.message, type:'call'})));
            setRecords(combined);
        }
        const resPrice = await fetch(`${API_URL}?action=get_pricing`);
        const jsonPrice = await resPrice.json();
        if(jsonPrice.status === 'success') setPricingData(jsonPrice.data);
    } catch(e) {} finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredRecords = selectedCategory === 'Всі записи'
    ? records.filter(r => r.category !== 'Архів' && r.category !== 'Перетелефонувати')
    : records.filter(r => r.category === selectedCategory);

  const handleSaveRecord = async (data: any) => {
    setFormVisible(false);
    try {
        const f = new FormData();
          if (editingItem) {
      f.append('action', 'update_record'); 
      f.append('update_id', String(editingItem.realId));
      f.append('client_name', data.clientName);
      f.append('phone', data.phone);
      f.append('category', data.category);      
      f.append('service_name', data.service);
      f.append('record_date', data.date);      
      f.append('record_time', data.time);      
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
    } catch (e) { Alert.alert("Помилка мережі"); }
  };

  const handleRestore = async (id: string, realId: string) => {
  try {
    const f = new FormData();
    f.append('action', 'restore');
    f.append('id', String(realId));

    const res = await fetch(API_URL, { method: 'POST', body: f });
    const textResponse = await res.text();
    try {
      const json = JSON.parse(textResponse);
      if (json.status === 'success') {
          Alert.alert("Успіх", "Запис успішно відновлено!");
          fetchData();
      } else { Alert.alert("Помилка на сервері", json.message); }
    } catch (parseError) {}
  } catch (e) { Alert.alert("Помилка", "Дійсно проблема з мережею або сервер ліг."); }
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

  const formAllowedCategories = FORM_PERMISSIONS[user.username] || SERVICE_CATEGORIES;
  const getIconColor = (tabName: string) => selectedCategory === tabName ? BeautyTheme.primaryDark : BeautyTheme.textSecondary;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BeautyTheme.bg} />
      
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
            <View>
                <Text style={styles.greetingText}>Привіт, {MASTER_NAMES[user.username] || user.username}</Text>
                <Text style={styles.dateText}>{new Date().toLocaleDateString('uk-UA', {day:'numeric', month:'long'})}</Text>
            </View>
            <TouchableOpacity style={styles.notificationBadge} onPress={() => fetchData()}>
                 <Ionicons name="refresh" size={22} color={BeautyTheme.primaryDark} />
            </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.categoryBigButton} onPress={() => setMenuVisible(true)} activeOpacity={0.8}>
            <View>
                <Text style={styles.categoryLabel}>Категорія послуг:</Text>
                <Text style={styles.categoryValue}>{selectedCategory}</Text>
            </View>
            <View style={styles.categoryIconBox}><Ionicons name="options-outline" size={20} color="#FFF" /></View>
        </TouchableOpacity>
      </View>

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
                        <Text style={{color:'#FFF', fontWeight:'600', letterSpacing: 0.5}}>Записати клієнта</Text>
                    </TouchableOpacity>
                )}
            </View>
        )} 
        contentContainerStyle={{paddingBottom: 130, paddingTop: 10}}
        ListEmptyComponent={<Text style={{textAlign:'center', color: BeautyTheme.textSecondary, marginTop:50}}>{isLoading ? 'Оновлення...' : 'Немає записів'}</Text>}
      />

      <View style={styles.navContainer}>
        <View style={styles.navBar}>
          <View style={styles.navSide}>
            {canAccess('Всі записи', user.username) && <TouchableOpacity style={styles.navItem} onPress={() => setSelectedCategory('Всі записи')}><Ionicons name={selectedCategory === 'Всі записи' ? "home" : "home-outline"} size={26} color={getIconColor('Всі записи')} />{selectedCategory==='Всі записи' && <View style={styles.activeDot} />}</TouchableOpacity>}
            {canAccess('Архів', user.username) && <TouchableOpacity style={styles.navItem} onPress={() => setSelectedCategory('Архів')}><Ionicons name={selectedCategory === 'Архів' ? "time" : "time-outline"} size={26} color={getIconColor('Архів')} />{selectedCategory==='Архів' && <View style={styles.activeDot} />}</TouchableOpacity>}
          </View>
          <TouchableOpacity style={styles.addBtnContainer} onPress={() => { setEditingItem(null); setPreFillClient(null); setFormVisible(true); }}><View style={styles.addBtnCircle}><Ionicons name="add" size={36} color="#FFF" /></View></TouchableOpacity>
          <View style={styles.navSide}>
            {canAccess('Перетелефонувати', user.username) && <TouchableOpacity style={styles.navItem} onPress={() => setSelectedCategory('Перетелефонувати')}><Ionicons name={selectedCategory === 'Перетелефонувати' ? "call" : "call-outline"} size={26} color={getIconColor('Перетелефонувати')} />{selectedCategory==='Перетелефонувати' && <View style={styles.activeDot} />}</TouchableOpacity>}
            <TouchableOpacity style={styles.navItem} onPress={() => setProfileModalVisible(true)}><Ionicons name="person-circle-outline" size={28} color={BeautyTheme.textSecondary} /></TouchableOpacity>
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
            <Ionicons name="sparkles" size={50} color={BeautyTheme.primary} style={{marginBottom: 10}} />
            <Text style={styles.profileName}>{MASTER_NAMES[user.username] || user.username}</Text>
            <Text style={styles.profileRole}>{user.role}</Text>
            {/* <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Вийти з акаунту</Text>
            </TouchableOpacity> */}
            <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
    <Ionicons name="person-circle-outline" size={28} color={BeautyTheme.textSecondary} />
</TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BeautyTheme.bg },
  headerContainer: { backgroundColor: BeautyTheme.card, paddingHorizontal: 25, paddingTop: 50, paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 5, marginBottom: 15, zIndex: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greetingText: { fontSize: 26, fontWeight: '700', color: BeautyTheme.textMain, letterSpacing: -0.5 },
  dateText: { fontSize: 13, color: BeautyTheme.textSecondary, textTransform: 'capitalize', marginTop: 4, letterSpacing: 0.5, fontWeight: '500' },
  notificationBadge: { width: 46, height: 46, borderRadius: 23, backgroundColor: BeautyTheme.primaryLight, justifyContent: 'center', alignItems: 'center' },
  categoryBigButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BeautyTheme.primary, paddingVertical: 20, paddingHorizontal: 25, borderRadius: 28, shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  categoryLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1.5 },
  categoryValue: { color: '#FFF', fontSize: 19, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  categoryIconBox: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  navContainer: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 20 },
  navBar: { flexDirection: 'row', backgroundColor: BeautyTheme.card, width: '100%', height: 80, borderRadius: 40, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.12, shadowRadius: 30, elevation: 15 },
  navSide: { flexDirection: 'row', gap: 30, alignItems: 'center' },
  navItem: { alignItems: 'center', justifyContent: 'center', height: 50, width: 45 },
  activeDot: { position: 'absolute', bottom: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: BeautyTheme.primaryDark },
  addBtnContainer: { top: -30, shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 15, elevation: 10 },
  addBtnCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: BeautyTheme.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 6, borderColor: BeautyTheme.bg },
  profileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  profileModalCard: { width: '85%', backgroundColor: BeautyTheme.card, borderRadius: 35, padding: 40, alignItems: 'center', shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 35, elevation: 15 },
  profileName: { fontSize: 24, fontWeight: '700', color: BeautyTheme.textMain, marginTop: 5, letterSpacing: -0.5 },
  profileRole: { fontSize: 13, color: BeautyTheme.textSecondary, marginTop: 5, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 35, fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF2F2', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 25 },
  logoutButtonText: { color: BeautyTheme.danger, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  callBackBtn: { backgroundColor: BeautyTheme.primary, marginHorizontal: 25, marginTop: -15, marginBottom: 20, padding: 16, borderRadius: 20, alignItems: 'center', shadowColor: BeautyTheme.primaryDark, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
});