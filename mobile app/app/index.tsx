import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, 
  Modal, TextInput, ScrollView, Alert, Platform, Image, StatusBar 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Colors } from '../constants/Colors';
import { INITIAL_RECORDS } from '../constants/Data';
import RecordCard from '../components/RecordCard';
import RecordFormModal from '../components/RecordFormModal';
import CategoryModal from '../components/CategoryModal';

const CATEGORIES = ['Всі записи', 'Масаж', 'Elos-епіляція', 'Доглядові процедури', 'Архів', 'Перетелефонувати', 'Прайс', 'Історія'];

// Сайдбар, Календар, Віджети
function CreatorDashboard() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calendar
  const generateCalendar = () => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };
  const changeMonth = (dir: number) => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + dir, 1));
  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)}>
            <Ionicons name="menu" size={30} color={Colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Creator Panel</Text>
        <TouchableOpacity onPress={() => router.replace('/login')}>
            <Ionicons name="log-out-outline" size={26} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Sidebar Modal */}
      <Modal visible={sidebarVisible} transparent animationType="fade" onRequestClose={() => setSidebarVisible(false)}>
        <View style={{flex: 1, flexDirection: 'row'}}>
            <View style={styles.sidebar}>
                <View style={styles.sidebarHeader}>
                    <Text style={styles.sidebarTitle}>Меню</Text>
                    <TouchableOpacity onPress={() => setSidebarVisible(false)}><Ionicons name="close" size={26} color="#FFF" /></TouchableOpacity>
                </View>
                <ScrollView style={{flex: 1}}>
                    {['dashboard', 'all', 'Масаж', 'Elos-епіляція', 'archive', 'pricing', 'history'].map((item) => (
                        <TouchableOpacity key={item} style={[styles.menuItem, activeSection === item && styles.menuItemActive]} onPress={() => {setActiveSection(item); setSidebarVisible(false);}}>
                            <Ionicons name="albums-outline" size={20} color="#AAA" />
                            <Text style={{color: '#FFF', marginLeft: 15, textTransform: 'capitalize'}}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <View style={styles.userInfo}>
                    <Text style={{color: '#FFF', fontWeight: 'bold'}}>Creator</Text>
                    <Text style={{color: '#AAA', fontSize: 12}}>Super Admin</Text>
                </View>
            </View>
            <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)'}} onPress={() => setSidebarVisible(false)} />
        </View>
      </Modal>
      <ScrollView contentContainerStyle={{padding: 20}}>
        {activeSection === 'dashboard' ? (
            <>
                {/* CALENDAR WIDGET */}
                <View style={styles.calendarContainer}>
                    <View style={styles.calHeader}>
                        <TouchableOpacity onPress={() => changeMonth(-1)}><Ionicons name="chevron-back" size={20} color="#333" /></TouchableOpacity>
                        <Text style={{fontSize: 16, fontWeight: 'bold'}}>{calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
                        <TouchableOpacity onPress={() => changeMonth(1)}><Ionicons name="chevron-forward" size={20} color="#333" /></TouchableOpacity>
                    </View>
                    <View style={styles.calGrid}>
                        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <Text key={d} style={styles.calWeekText}>{d}</Text>)}
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

                {/* CLOCK & STATS */}
                <View style={styles.widgetCard}>
                    <Text style={styles.widgetTitle}>Поточний час</Text>
                    <Text style={styles.clockTime}>{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </View>
                <View style={styles.widgetCard}>
                    <Text style={styles.widgetTitle}>Статистика</Text>
                    <View style={styles.statRow}><Text>Всього записів:</Text><Text style={{fontWeight:'bold'}}>{records.length}</Text></View>
                </View>
            </>
        ) : (
            <Text style={{textAlign:'center', marginTop: 50, color: '#888'}}>Розділ: {activeSection}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Плаваюче меню 
function StandardDashboard() {
  const router = useRouter();
  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [selectedCategory, setSelectedCategory] = useState('Всі записи');
  const [menuVisible, setMenuVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const filteredRecords = selectedCategory === 'Всі записи'
    ? records.filter(r => r.category !== 'Архів')
    : records.filter(r => r.category === selectedCategory);

  const handleSaveRecord = (data: any) => {
    if (editingItem) {
        setRecords(prev => prev.map(r => r.id === editingItem.id ? { ...data, id: editingItem.id } : r));
    } else {
        setRecords(prev => [{ ...data, id: Date.now().toString() }, ...prev]);
    }
    setFormVisible(false);
  };

  const handleArchive = (id: string) => setRecords(prev => prev.map(r => r.id === id ? { ...r, category: 'Архів' } : r));
  const handleRestore = (id: string) => setRecords(prev => prev.map(r => r.id === id ? { ...r, category: 'Масаж' } : r));
  const handleDelete = (id: string) => {
    if(Platform.OS === 'web') { if(confirm("Видалити?")) setRecords(prev => prev.filter(r => r.id !== id)); }
    else { Alert.alert("Видалити?", "Безповоротно.", [{ text: "Ні" }, { text: "Так", style: "destructive", onPress: () => setRecords(prev => prev.filter(r => r.id !== id)) }]); }
  };

  const todayDate = new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'long' });
  const getIconColor = (tabName: string) => selectedCategory === tabName ? Colors.primaryDark : '#AAA';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
            <View>
                <Text style={styles.greetingText}>Привіт, Адмін 👋</Text>
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
                <Text style={styles.categoryValue}>{selectedCategory}</Text>
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
            onArchive={() => handleArchive(item.id)}
            onRestore={() => handleRestore(item.id)}
            onDeletePermanent={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 130 }}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <Ionicons name="clipboard-outline" size={60} color="#DDD" />
                <Text style={styles.emptyText}>У цій категорії записів немає</Text>
            </View>
        }
      />

      {/* FLOATING NAV */}
      <View style={styles.navContainer}>
        <View style={styles.navBar}>
          <View style={styles.navSide}>
            <TouchableOpacity style={styles.navItem} onPress={() => setSelectedCategory('Всі записи')}>
              <Ionicons name="home-outline" size={24} color={getIconColor('Всі записи')} />
              {selectedCategory === 'Всі записи' && <View style={styles.activeDot} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setSelectedCategory('Архів')}>
              <Ionicons name="time-outline" size={24} color={getIconColor('Архів')} />
              {selectedCategory === 'Архів' && <View style={styles.activeDot} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.addBtnContainer} onPress={() => { setEditingItem(null); setFormVisible(true); }} activeOpacity={0.9}>
             <View style={styles.addBtnCircle}><Ionicons name="add" size={38} color="#FFF" /></View>
          </TouchableOpacity>

          <View style={styles.navSide}>
            <TouchableOpacity style={styles.navItem} onPress={() => setSelectedCategory('Перетелефонувати')}>
              <Ionicons name="call-outline" size={24} color={getIconColor('Перетелефонувати')} />
              {selectedCategory === 'Перетелефонувати' && <View style={styles.activeDot} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
              <Ionicons name="person-outline" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <RecordFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSaveRecord} initialData={editingItem} />
      <CategoryModal visible={menuVisible} selected={selectedCategory} onClose={() => setMenuVisible(false)} onSelect={setSelectedCategory} />
    </SafeAreaView>
  );
}

export default function Index() {
  const params = useLocalSearchParams();
  const role = params.role || 'admin'; // сюди треба буде передавати, які ролі є

  if (role === 'creator') {
    return <CreatorDashboard />;
  }

  return <StandardDashboard />;
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  
  // Header 
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

  // Creator styles
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center', backgroundColor: '#FFF', marginTop: 30 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  sidebar: { width: 280, backgroundColor: '#1a1a2e', height: '100%', paddingVertical: 20 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  sidebarTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderLeftWidth: 4, borderLeftColor: 'transparent' },
  menuItemActive: { backgroundColor: '#252540', borderLeftColor: Colors.primary },
  userInfo: { padding: 20, borderTopWidth: 1, borderColor: '#333' },
  
  // Calendar
  calendarContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeekText: { width: '14.28%', textAlign: 'center', color: '#AAA', marginBottom: 10 },
  calDayBox: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  calSelectedBox: { backgroundColor: '#FF4D6D', borderRadius: 50 },
  calDayText: { fontSize: 16, color: '#333' },
  calDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 4, backgroundColor: '#FF4D6D' },

  // Widgets
  widgetCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  widgetTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#555' },
  clockTime: { fontSize: 32, fontWeight: 'bold', color: Colors.primary },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, borderBottomWidth: 1, borderColor: '#f0f0f0', paddingBottom: 5 },

  // Common
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#AAA', fontSize: 16, marginTop: 10 },
  navContainer: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 15 },
  navBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', width: '100%', height: 75, borderRadius: 40, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
  navSide: { flexDirection: 'row', gap: 25, alignItems: 'center' },
  navItem: { alignItems: 'center', justifyContent: 'center', height: 50, width: 40 },
  activeDot: { position: 'absolute', bottom: 5, width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.primaryDark },
  addBtnContainer: { top: -25, shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10 },
  addBtnCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.primaryDark, justifyContent: 'center', alignItems: 'center', borderWidth: 5, borderColor: '#F8F9FD' }
});