import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, 
  Alert, FlatList, StatusBar, ActivityIndicator, Animated, Dimensions, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { API_URL, SERVICE_CATEGORIES } from '../constants/AppConfig';
import RecordCard from './RecordCard';
import RecordFormModal from './RecordFormModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BeautyTheme = {
  bg: '#FDF6F9',
  card: '#FFFFFF',
  primary: '#E8879E',
  primaryDark: '#C45E78',
  primaryLight: '#FEF3F7',
  primarySoft: '#F5C6D3',
  textMain: '#3B2730',
  textSecondary: '#9C7D87',
  textMuted: '#C4A8B2',
  danger: '#E07575',
  success: '#7EC8A4',
  border: '#F0DDE4',
  inputBg: '#FFF8FA',
};

// ── MASTER COLOR MAP ───────────────────────────────────────
const MASTER_COLORS: Record<string, string> = {
  default: BeautyTheme.primary,
};
const MASTER_PALETTE = ['#E8879E','#9EC5D4','#B5C9AD','#D4A0C9','#F0B97A','#88B4C8'];
let _masterColorIdx = 0;
function getMasterColor(master: string) {
  if (!MASTER_COLORS[master]) {
    MASTER_COLORS[master] = MASTER_PALETTE[_masterColorIdx % MASTER_PALETTE.length];
    _masterColorIdx++;
  }
  return MASTER_COLORS[master];
}

// ── DATE BOTTOM SHEET ──────────────────────────────────────
function DateBottomSheet({
  visible, date, records, pricingData,
  onClose, onAdd, onEdit, onArchive, onRestore, onDelete,
}: {
  visible: boolean;
  date: Date | null;
  records: any[];
  pricingData: any[];
  onClose: () => void;
  onAdd: (date: Date) => void;
  onEdit: (item: any) => void;
  onArchive: (id: string, realId: string) => void;
  onRestore: (id: string, realId: string) => void;
  onDelete: (id: string, realId: string, type: string) => void;
}) {
  // Always start OFF screen — never at 0 so it doesn't flash on first render
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset to off-screen before animating in (fixes "already at 0" bug on reopen)
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, tension: 68, friction: 11, useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1, duration: 250, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT, duration: 260, useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0, duration: 220, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Keep last known date so content doesn't vanish during close animation
  const lastDate = useRef(date);
  if (date) lastDate.current = date;
  const displayDate = lastDate.current;

  if (!displayDate) return null;

  const dateLabel = displayDate.toLocaleDateString('uk-UA', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // Group records by master
  const byMaster: Record<string, any[]> = {};
  records.forEach(r => {
    const m = r.master || 'Не вказано';
    if (!byMaster[m]) byMaster[m] = [];
    byMaster[m].push(r);
  });
  const masters = Object.keys(byMaster).sort();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Animated backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet slides up from bottom */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetDateLabel}>{dateLabel}</Text>
            <Text style={styles.sheetRecordCount}>
              {records.length === 0
                ? 'Записів немає'
                : `${records.length} ${records.length === 1 ? 'запис' : records.length < 5 ? 'записи' : 'записів'}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sheetAddBtn}
            onPress={() => onAdd(displayDate)}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={BeautyTheme.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {records.length === 0 ? (
            <View style={styles.emptySheet}>
              <Ionicons name="calendar-outline" size={48} color={BeautyTheme.primarySoft} />
              <Text style={styles.emptySheetText}>На цей день записів немає</Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => onAdd(displayDate)}
              >
                <Ionicons name="add-circle-outline" size={18} color={BeautyTheme.primaryDark} />
                <Text style={styles.emptyAddText}>Додати запис</Text>
              </TouchableOpacity>
            </View>
          ) : (
            masters.map(master => (
              <View key={master} style={{ marginBottom: 8 }}>
                {/* Master header strip */}
                <View style={[styles.masterStrip, { backgroundColor: getMasterColor(master) + '22', borderLeftColor: getMasterColor(master) }]}>
                  <View style={[styles.masterDot, { backgroundColor: getMasterColor(master) }]} />
                  <Text style={[styles.masterStripName, { color: getMasterColor(master) }]}>
                    {master}
                  </Text>
                  <Text style={styles.masterStripCount}>
                    {byMaster[master].length} {byMaster[master].length === 1 ? 'запис' : 'записи'}
                  </Text>
                </View>

                {/* Records for this master */}
                {byMaster[master]
                  .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                  .map(item => (
                    <View key={item.id} style={styles.sheetRecordCard}>
                      {/* Time pill */}
                      <View style={[styles.sheetTimePill, { backgroundColor: getMasterColor(master) }]}>
                        <Text style={styles.sheetTimeText}>{item.time || '--:--'}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.sheetClientName}>{item.clientName}</Text>
                        <Text style={styles.sheetPhone}>{item.phone}</Text>
                        {item.service ? (
                          <Text style={styles.sheetService}>{item.service}</Text>
                        ) : null}
                        {item.note ? (
                          <Text style={styles.sheetNote}>"{item.note}"</Text>
                        ) : null}
                      </View>

                      {/* Actions */}
                      <View style={styles.sheetActions}>
                        <TouchableOpacity
                          style={styles.sheetActionBtn}
                          onPress={() => { onClose(); setTimeout(() => onEdit(item), 300); }}
                        >
                          <Ionicons name="pencil" size={15} color={BeautyTheme.primaryDark} />
                        </TouchableOpacity>
                        {item.category !== 'Архів' && item.type !== 'call' && (
                          <TouchableOpacity
                            style={styles.sheetActionBtn}
                            onPress={() => { onArchive(item.id, item.realId); }}
                          >
                            <Ionicons name="archive-outline" size={15} color={BeautyTheme.textSecondary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.sheetActionBtn, { backgroundColor: '#FFF0F0' }]}
                          onPress={() => onDelete(item.id, item.realId, item.type)}
                        >
                          <Ionicons name="trash-outline" size={15} color={BeautyTheme.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
              </View>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── MAIN DASHBOARD ─────────────────────────────────────────
export default function CreatorDashboard({ user }: { user: any }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const [records, setRecords] = useState<any[]>([]);
  const [pricingData, setPricingData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [pricingForm, setPricingForm] = useState({ category_id: '', name: '', price_string: '', price_numeric: '' });
  const [preFillClient, setPreFillClient] = useState<any>(null);

  // NEW: prefilled date for "add from calendar"
  const [preFillDate, setPreFillDate] = useState<Date | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // NEW: bottom sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetDate, setSheetDate] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const generateCalendar = () => {
    const year = calDate.getFullYear(), month = calDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const changeMonth = (dir: number) =>
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + dir, 1));

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const getRecordsForDate = (date: Date) =>
    records.filter(r => {
      if (!r.date) return false;
      const parts = r.date.split('-');
      if (parts.length !== 3) return false;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return isSameDay(d, date);
    });

  const handleDayPress = (day: Date) => {
    setSelectedDate(day);
    setSheetDate(day);
    setSheetVisible(true);
  };

  const handleAddFromSheet = (date: Date) => {
    setSheetVisible(false);
    setEditingItem(null);
    setPreFillClient(null);
    // Pre-fill the date by passing it through preFillDate state
    setPreFillDate(date);
    setTimeout(() => setFormVisible(true), 350);
  };

  const handleLogout = async () => {
    Alert.alert('Вихід', 'Вийти з панелі?', [
      { text: 'Ні', style: 'cancel' },
      {
        text: 'Так', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem('userData');
          router.replace('/login');
        }
      }
    ]);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const resRec = await fetch(`${API_URL}?action=get_all_data`);
      const jsonRec = await resRec.json();
      if (jsonRec.status === 'success') {
        let combined: any[] = [];
        if (jsonRec.data.records) combined.push(...jsonRec.data.records.map((i: any) => ({
          ...i, id: `rec_${i.id}`, realId: i.id, clientName: i.client_name,
          service: i.service_name, date: i.record_date, time: i.record_time,
          type: 'record', master: i.worker_name || 'Не вказано'
        })));
        if (jsonRec.data.archive) combined.push(...jsonRec.data.archive.map((i: any) => ({
          ...i, id: `arch_${i.id}`, realId: i.id, clientName: i.name, category: 'Архів',
          service: (i.service || '').split(' → ')[1] || i.service,
          date: (i.datetime || '').split(' ')[0],
          time: ((i.datetime || '').split(' ')[1] || '').substr(0, 5),
          type: 'archive', master: 'Архів'
        })));
        if (jsonRec.data.calls) combined.push(...jsonRec.data.calls.map((i: any) => ({
          ...i, id: `call_${i.id}`, realId: i.id, clientName: i.name,
          category: 'Перетелефонувати', phone: i.phone,
          service: i.service || 'Не вказано',
          date: (i.created_at || '').split(' ')[0],
          time: ((i.created_at || '').split(' ')[1] || '').substr(0, 5),
          note: i.message, type: 'call'
        })));
        setRecords(combined);
      }
      const resPrice = await fetch(`${API_URL}?action=get_pricing`);
      const jsonPrice = await resPrice.json();
      if (jsonPrice.status === 'success') setPricingData(jsonPrice.data);
    } catch (e) { } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleGenerateReport = async () => {
    try {
      const activeRecords = records.filter(r => r.category !== 'Архів' && r.category !== 'Перетелефонувати');
      if (activeRecords.length === 0) { Alert.alert('Увага', 'Немає активних записів для звіту.'); return; }
      const tableRows = activeRecords.map((item, index) => `
        <tr>
          <td style="text-align:center;">${index + 1}</td>
          <td>${item.date}<br><small>${item.time}</small></td>
          <td><b>${item.clientName}</b><br><span style="color:#666;">${item.phone}</span></td>
          <td>${item.service}</td>
          <td>${item.master}</td>
        </tr>`).join('');
      const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Звіт</title>
        <style>body{font-family:'Helvetica',sans-serif;padding:20px;color:#333;}
        h1{color:#C45E78;text-align:center;} table{width:100%;border-collapse:collapse;}
        th{background:#E8879E;color:white;padding:10px;} td{border-bottom:1px solid #eee;padding:10px;font-size:14px;}
        tr:nth-child(even){background:#FEF3F7;}</style></head><body>
        <h1>Beauty Room Report</h1>
        <p style="text-align:center;color:#777;">Звіт на ${new Date().toLocaleDateString('uk-UA')}</p>
        <table><thead><tr><th>#</th><th>Дата/Час</th><th>Клієнт</th><th>Послуга</th><th>Майстер</th></tr></thead>
        <tbody>${tableRows}</tbody></table></body></html>`;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch { Alert.alert('Помилка', 'Не вдалося створити звіт.'); }
  };

  const handleSaveRecord = async (data: any) => {
    setFormVisible(false);
    setPreFillDate(null);
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
      await fetch(API_URL, { method: 'POST', body: f });
      fetchData();
    } catch { Alert.alert('Помилка збереження'); }
  };

  const handleArchive = async (id: string, realId: string) => {
    try {
      const f = new FormData();
      f.append('action', 'move_to_archive');
      f.append('id', String(realId));
      const res = await fetch(API_URL, { method: 'POST', body: f });
      const json = await res.json();
      if (json.status === 'success') fetchData();
    } catch { Alert.alert('Помилка мережі'); }
  };

  const handleRestore = async (id: string, realId: string) => {
    try {
      const f = new FormData();
      f.append('action', 'restore');
      f.append('id', String(realId));
      const res = await fetch(API_URL, { method: 'POST', body: f });
      const json = await res.json();
      if (json?.status === 'success') { Alert.alert('Успіх', 'Запис успішно відновлено!'); fetchData(); }
      else Alert.alert('Помилка', json?.message);
    } catch { Alert.alert('Помилка мережі'); }
  };

  const handleDelete = async (id: string, realId: string, type: string) => {
    Alert.alert('Видалити?', 'Безповоротно.', [
      { text: 'Ні' },
      {
        text: 'Так', style: 'destructive', onPress: async () => {
          try {
            const f = new FormData();
            if (type === 'call') f.append('action', 'delete_appointment');
            else if (type === 'archive') f.append('action', 'delete_archive');
            else f.append('action', 'delete_record');
            f.append('id', String(realId));
            await fetch(API_URL, { method: 'POST', body: f });
            fetchData();
          } catch { }
        }
      }
    ]);
  };

  const handleConvertCall = (item: any) => {
    setEditingItem(null);
    setPreFillClient({ name: item.clientName, phone: item.phone, note: item.note, serviceHint: item.service });
    setFormVisible(true);
  };

  const openAddService = () => {
    setEditingService(null);
    setPricingForm({ category_id: pricingData[0]?.category_id || '', name: '', price_string: '', price_numeric: '' });
    setPricingModalVisible(true);
  };
  const openEditService = (s: any, cid: string) => {
    setEditingService(s);
    setPricingForm({ category_id: cid, name: s.name, price_string: s.price_string, price_numeric: s.price_numeric.toString() });
    setPricingModalVisible(true);
  };
  const handleSaveService = async () => {
    try {
      const f = new FormData();
      f.append('name', pricingForm.name);
      f.append('price_string', pricingForm.price_string);
      f.append('price_numeric', pricingForm.price_numeric);
      if (editingService) {
        f.append('action', 'update_service');
        f.append('service_id', String(editingService.service_id));
      } else {
        f.append('action', 'add_service');
        f.append('category_id', String(pricingForm.category_id));
      }
      await fetch(API_URL, { method: 'POST', body: f });
      setPricingModalVisible(false);
      fetchData();
    } catch { Alert.alert('Помилка прайсу'); }
  };

  const getFilteredRecords = () => {
    if (activeSection === 'all') return records.filter(r => r.category !== 'Архів' && r.category !== 'Перетелефонувати');
    if (activeSection === 'archive') return records.filter(r => r.category === 'Архів');
    if (activeSection === 'call') return records.filter(r => r.category === 'Перетелефонувати');
    return records.filter(r => r.category === activeSection);
  };

  const getRecentNotifications = () =>
    [...records]
      .filter(r => r.category !== 'Архів')
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
      .slice(0, 15);

  const menuItems = ['dashboard', 'all', 'Масаж', 'Elos-епіляція', 'Доглядові процедури', 'archive', 'call', 'pricing', 'history'];

  const getMenuIcon = (item: string) => {
    switch (item) {
      case 'dashboard': return 'grid';
      case 'all': return 'list';
      case 'archive': return 'time';
      case 'call': return 'call';
      case 'pricing': return 'pricetags';
      case 'history': return 'calendar';
      default: return 'layers';
    }
  };

  // Build preFillClient that includes the date when adding from calendar
  const getPreFillForForm = () => {
    if (preFillDate) {
      const y = preFillDate.getFullYear();
      const m = (preFillDate.getMonth() + 1).toString().padStart(2, '0');
      const d = preFillDate.getDate().toString().padStart(2, '0');
      return { _date: `${y}-${m}-${d}` };
    }
    return preFillClient;
  };

  const renderContent = () => {
    if (activeSection === 'dashboard') {
      return (
        <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 100 }}>

          {/* ── CALENDAR ── */}
          <View style={styles.calendarContainer}>
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={22} color={BeautyTheme.textMain} />
              </TouchableOpacity>
              <Text style={styles.calMonthTitle}>
                {calDate.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={22} color={BeautyTheme.textMain} />
              </TouchableOpacity>
            </View>

            <View style={styles.calGrid}>
              {['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map(d => (
                <Text key={d} style={styles.calWeekText}>{d}</Text>
              ))}
              {generateCalendar().map((day, index) => {
                if (!day) return <View key={index} style={styles.calDayBox} />;
                const isSel = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const dayRecords = getRecordsForDate(day);
                const hasDot = dayRecords.length > 0;

                // Unique masters for dot colors
                const uniqueMasters = [...new Set(dayRecords.map(r => r.master || 'Не вказано'))];

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calDayBox,
                      isSel && styles.calSelectedBox,
                      isToday && !isSel && styles.calTodayBox,
                    ]}
                    onPress={() => handleDayPress(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.calDayText,
                      isSel && { color: '#FFF', fontWeight: '700' },
                      isToday && !isSel && { color: BeautyTheme.primaryDark, fontWeight: '700' },
                    ]}>
                      {day.getDate()}
                    </Text>
                    {/* Colored dots per master */}
                    {hasDot && (
                      <View style={styles.calDotsRow}>
                        {uniqueMasters.slice(0, 3).map((m, mi) => (
                          <View
                            key={mi}
                            style={[
                              styles.calDot,
                              { backgroundColor: isSel ? 'rgba(255,255,255,0.8)' : getMasterColor(m) }
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend row */}
            {Object.keys(MASTER_COLORS).filter(k => k !== 'default').length > 0 && (
              <View style={styles.calLegend}>
                {Object.entries(MASTER_COLORS)
                  .filter(([k]) => k !== 'default')
                  .slice(0, 4)
                  .map(([master, color]) => (
                    <View key={master} style={styles.calLegendItem}>
                      <View style={[styles.calLegendDot, { backgroundColor: color }]} />
                      <Text style={styles.calLegendText} numberOfLines={1}>{master}</Text>
                    </View>
                  ))}
              </View>
            )}
          </View>

          {/* ── CLOCK WIDGET ── */}
          <View style={styles.widgetCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <View style={styles.widgetIconBox}>
                <Ionicons name="time" size={28} color={BeautyTheme.primaryDark} />
              </View>
              <View>
                <Text style={styles.widgetTitle}>Поточний час</Text>
                <Text style={styles.clockTime}>
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          </View>

          {/* ── REPORT WIDGET ── */}
          <TouchableOpacity style={styles.widgetCard} onPress={handleGenerateReport} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <View style={[styles.widgetIconBox, { backgroundColor: '#FFF0F3' }]}>
                <Ionicons name="document-text" size={28} color={BeautyTheme.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.widgetTitle}>Статистика та Звіт</Text>
                  <Ionicons name="download-outline" size={18} color={BeautyTheme.textSecondary} />
                </View>
                <Text style={{ fontSize: 15, color: BeautyTheme.textMain }}>
                  Активних записів:{' '}
                  <Text style={{ fontWeight: '700', fontSize: 18 }}>
                    {records.filter(r => r.category !== 'Архів').length}
                  </Text>
                </Text>
                <Text style={{ fontSize: 11, color: BeautyTheme.textSecondary, marginTop: 2 }}>
                  Натисніть для PDF-звіту
                </Text>
              </View>
            </View>
          </TouchableOpacity>

        </ScrollView>
      );
    }
    else if (activeSection === 'pricing') {
      return (
        <View style={{ flex: 1, padding: 25 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>Прайс-лист</Text>
            <TouchableOpacity style={styles.addBtnFull} onPress={openAddService}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '700', marginLeft: 6, fontSize: 13 }}>Додати послугу</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {pricingData.map((category) => (
              <View key={category.category_id} style={styles.pricingCategoryCard}>
                <View style={styles.pricingCategoryHeader}>
                  <Text style={styles.pricingCategoryTitle}>{category.title}</Text>
                </View>
                {category.services.map((service: any) => (
                  <TouchableOpacity key={service.service_id} style={styles.pricingServiceItem} onPress={() => openEditService(service, category.category_id)}>
                    <Text style={styles.pricingServiceName}>{service.name}</Text>
                    <Text style={styles.pricingServicePrice}>{service.price_string} ₴</Text>
                    <Ionicons name="chevron-forward" size={18} color={BeautyTheme.textSecondary} />
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
        <View style={{ flex: 1, padding: 25 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>
              {activeSection === 'all' ? 'Всі записи' : activeSection}
            </Text>
            {(['all', ...SERVICE_CATEGORIES].includes(activeSection)) &&
              <TouchableOpacity style={styles.addBtnSmall} onPress={() => { setEditingItem(null); setPreFillClient(null); setPreFillDate(null); setFormVisible(true); }}>
                <Ionicons name="add" size={26} color="#FFF" />
              </TouchableOpacity>
            }
          </View>
          <FlatList
            showsVerticalScrollIndicator={false}
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
                    <Text style={{ color: '#FFF', fontWeight: '600', letterSpacing: 0.5 }}>Записати клієнта</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: BeautyTheme.textSecondary, marginTop: 50 }}>
                {isLoading ? 'Завантаження...' : 'Тут пусто'}
              </Text>
            }
          />
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BeautyTheme.bg} />

      {/* ── HEADER ── */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingText}>Привіт, Creator ✨</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'long' })}
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationBadge} onPress={() => setNotificationsVisible(true)}>
            <Ionicons name="notifications" size={22} color={BeautyTheme.primaryDark} />
            <View style={styles.redDot} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.categoryBigButton} onPress={() => setSidebarVisible(true)} activeOpacity={0.8}>
          <View>
            <Text style={styles.categoryLabel}>Панель управління</Text>
            <Text style={styles.categoryValue}>Відкрити меню</Text>
          </View>
          <View style={styles.categoryIconBox}>
            <Ionicons name="grid" size={20} color="#FFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── NOTIFICATIONS MODAL ── */}
      <Modal visible={notificationsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNotificationsVisible(false)}>
        <View style={styles.notifModalContainer}>
          <View style={styles.notifHeaderRow}>
            <Text style={styles.notifMainTitle}>Центр сповіщень</Text>
            <TouchableOpacity onPress={() => setNotificationsVisible(false)} style={styles.closeBtnLight}>
              <Ionicons name="close" size={24} color={BeautyTheme.textMain} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={getRecentNotifications()}
            keyExtractor={(item) => item.id + '_notif'}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => {
              const isCall = item.type === 'call' || item.category === 'Перетелефонувати';
              return (
                <View style={styles.notifItemCard}>
                  <View style={[styles.notifIconWrapper, { backgroundColor: isCall ? '#FFF0F3' : BeautyTheme.primaryLight }]}>
                    <Ionicons name={isCall ? 'call' : 'calendar'} size={22} color={isCall ? BeautyTheme.danger : BeautyTheme.primaryDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifItemTitle}>{isCall ? 'Прохання дзвінка 📞' : 'Новий запис 📅'}</Text>
                    <Text style={styles.notifItemBody}>
                      <Text style={{ fontWeight: '700', color: BeautyTheme.textMain }}>{item.clientName}</Text> • {item.service}
                    </Text>
                    <Text style={styles.notifItemTime}>{item.date} о {item.time}</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: BeautyTheme.textSecondary, marginTop: 50 }}>Немає нових сповіщень</Text>}
          />
        </View>
      </Modal>

      {/* ── SIDEBAR ── */}
      <Modal visible={sidebarVisible} transparent animationType="fade" onRequestClose={() => setSidebarVisible(false)}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={styles.sidebarLight}>
            <View style={styles.sidebarHeaderLight}>
              <Text style={styles.sidebarTitleLight}>Меню</Text>
              <TouchableOpacity onPress={() => setSidebarVisible(false)} style={styles.closeBtnLight}>
                <Ionicons name="close" size={24} color={BeautyTheme.textMain} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 25 }} showsVerticalScrollIndicator={false}>
              {menuItems.map((item) => {
                const isActive = activeSection === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.menuItemSmooth, isActive && styles.menuItemSmoothActive]}
                    onPress={() => { setActiveSection(item); setSidebarVisible(false); }}
                  >
                    <View style={[styles.menuIconContainer, isActive && styles.menuIconContainerActive]}>
                      <Ionicons name={getMenuIcon(item) as any} size={20} color={isActive ? '#FFF' : BeautyTheme.primaryDark} />
                    </View>
                    <Text style={[styles.menuTextSmooth, isActive && styles.menuTextSmoothActive]}>
                      {item === 'dashboard' ? 'Головна' : item === 'all' ? 'Всі записи' : item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.userInfoLight}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={22} color={BeautyTheme.primaryDark} />
              </View>
              <View>
                <Text style={{ color: BeautyTheme.textMain, fontWeight: '700', letterSpacing: 0.5 }}>Creator</Text>
                <Text style={{ color: BeautyTheme.textSecondary, fontSize: 11, marginTop: 2, letterSpacing: 1, fontWeight: '600' }}>ADMIN</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={{ marginLeft: 'auto', padding: 10 }}>
                <Ionicons name="log-out-outline" size={26} color={BeautyTheme.danger} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setSidebarVisible(false)} />
        </View>
      </Modal>

      {renderContent()}

      {/* ── DATE BOTTOM SHEET ── */}
      <DateBottomSheet
        visible={sheetVisible}
        date={sheetDate}
        records={sheetDate ? getRecordsForDate(sheetDate) : []}
        pricingData={pricingData}
        onClose={() => setSheetVisible(false)}
        onAdd={handleAddFromSheet}
        onEdit={(item) => { setEditingItem(item); setPreFillDate(null); setFormVisible(true); }}
        onArchive={(id, realId) => { handleArchive(id, realId); }}
        onRestore={(id, realId) => { handleRestore(id, realId); }}
        onDelete={(id, realId, type) => { handleDelete(id, realId, type); }}
      />

      {/* ── RECORD FORM MODAL ── */}
      <RecordFormModal
        visible={formVisible}
        onClose={() => { setFormVisible(false); setPreFillDate(null); }}
        onSave={handleSaveRecord}
        initialData={editingItem
          ? (preFillDate
            ? { ...editingItem, date: (() => { const y = preFillDate.getFullYear(); const m = (preFillDate.getMonth() + 1).toString().padStart(2, '0'); const d = preFillDate.getDate().toString().padStart(2, '0'); return `${y}-${m}-${d}`; })() }
            : editingItem)
          : undefined}
        servicesData={pricingData}
        allowedCategories={SERVICE_CATEGORIES}
        preFillClient={preFillDate && !editingItem
          ? { name: '', phone: '', _prefillDate: (() => { const y = preFillDate.getFullYear(); const m = (preFillDate.getMonth() + 1).toString().padStart(2, '0'); const d = preFillDate.getDate().toString().padStart(2, '0'); return `${y}-${m}-${d}`; })() } as any
          : preFillClient}
        defaultCategory={activeSection !== 'dashboard' && activeSection !== 'all' && SERVICE_CATEGORIES.includes(activeSection) ? activeSection : ''}
      />

      {/* ── PRICING MODAL ── */}
      <Modal visible={pricingModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPricingModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: BeautyTheme.bg, padding: 30 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: BeautyTheme.textMain, marginBottom: 30, letterSpacing: -0.5 }}>
            Редагування послуги
          </Text>
          <TextInput style={styles.input} value={pricingForm.name} onChangeText={t => setPricingForm({ ...pricingForm, name: t })} placeholder="Назва послуги" placeholderTextColor={BeautyTheme.textSecondary} />
          <TextInput style={styles.input} value={pricingForm.price_string} onChangeText={t => setPricingForm({ ...pricingForm, price_string: t })} placeholder="Ціна (текстом)" placeholderTextColor={BeautyTheme.textSecondary} />
          <TextInput style={styles.input} value={pricingForm.price_numeric} onChangeText={t => setPricingForm({ ...pricingForm, price_numeric: t })} placeholder="Ціна (число)" keyboardType="numeric" placeholderTextColor={BeautyTheme.textSecondary} />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveService}>
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16, letterSpacing: 1 }}>Зберегти</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 25, alignSelf: 'center', padding: 10 }} onPress={() => setPricingModalVisible(false)}>
            <Text style={{ color: BeautyTheme.danger, fontWeight: '600', fontSize: 15 }}>Скасувати</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BeautyTheme.bg },
  headerContainer: { backgroundColor: BeautyTheme.card, paddingHorizontal: 25, paddingTop: 50, paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 5, marginBottom: 15, zIndex: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greetingText: { fontSize: 26, fontWeight: '700', color: BeautyTheme.textMain, letterSpacing: -0.5 },
  dateText: { fontSize: 13, color: BeautyTheme.textSecondary, textTransform: 'capitalize', marginTop: 4, letterSpacing: 0.5, fontWeight: '500' },
  notificationBadge: { width: 46, height: 46, borderRadius: 23, backgroundColor: BeautyTheme.primaryLight, justifyContent: 'center', alignItems: 'center' },
  redDot: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: BeautyTheme.danger, borderWidth: 2, borderColor: '#FFF' },
  categoryBigButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BeautyTheme.primary, paddingVertical: 20, paddingHorizontal: 25, borderRadius: 28, shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  categoryLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1.5 },
  categoryValue: { color: '#FFF', fontSize: 19, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  categoryIconBox: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },

  // Calendar
  calendarContainer: { backgroundColor: BeautyTheme.card, borderRadius: 30, padding: 25, marginBottom: 20, shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calMonthTitle: { fontSize: 16, fontWeight: '700', color: BeautyTheme.textMain, textTransform: 'capitalize' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeekText: { width: '14.28%', textAlign: 'center', color: BeautyTheme.textSecondary, marginBottom: 12, fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  calDayBox: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 4, borderRadius: 16 },
  calSelectedBox: { backgroundColor: BeautyTheme.primary, shadowColor: BeautyTheme.primary, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  calTodayBox: { borderWidth: 1.5, borderColor: BeautyTheme.primarySoft },
  calDayText: { fontSize: 15, color: BeautyTheme.textMain, fontWeight: '500' },
  calDotsRow: { flexDirection: 'row', gap: 3, marginTop: 3 },
  calDot: { width: 5, height: 5, borderRadius: 3 },
  calLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: BeautyTheme.border },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  calLegendDot: { width: 8, height: 8, borderRadius: 4 },
  calLegendText: { fontSize: 11, color: BeautyTheme.textSecondary, fontWeight: '600', maxWidth: 80 },

  // Widgets
  widgetCard: { backgroundColor: BeautyTheme.card, padding: 25, borderRadius: 30, marginBottom: 20, shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 },
  widgetIconBox: { width: 56, height: 56, borderRadius: 20, backgroundColor: BeautyTheme.primaryLight, justifyContent: 'center', alignItems: 'center' },
  widgetTitle: { fontSize: 12, color: BeautyTheme.textSecondary, marginBottom: 6, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1.5 },
  clockTime: { fontSize: 32, fontWeight: '700', color: BeautyTheme.textMain, letterSpacing: 0.5 },

  sectionTitle: { fontSize: 24, fontWeight: '700', marginBottom: 20, color: BeautyTheme.textMain, letterSpacing: -0.5 },
  addBtnFull: { flexDirection: 'row', backgroundColor: BeautyTheme.primary, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center', shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  addBtnSmall: { backgroundColor: BeautyTheme.primary, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

  pricingCategoryCard: { backgroundColor: BeautyTheme.card, borderRadius: 24, marginBottom: 20, overflow: 'hidden', shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 15, elevation: 4 },
  pricingCategoryHeader: { backgroundColor: '#FDFCFC', padding: 20, borderBottomWidth: 1, borderColor: BeautyTheme.border },
  pricingCategoryTitle: { fontSize: 18, fontWeight: '700', color: BeautyTheme.textMain, letterSpacing: 0.5 },
  pricingServiceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: BeautyTheme.border },
  pricingServiceName: { fontSize: 16, color: BeautyTheme.textMain, flex: 1, fontWeight: '500' },
  pricingServicePrice: { fontSize: 16, fontWeight: '700', color: BeautyTheme.primaryDark, marginRight: 15 },

  input: { backgroundColor: BeautyTheme.card, padding: 18, borderRadius: 20, fontSize: 16, color: BeautyTheme.textMain, marginBottom: 18, borderWidth: 1, borderColor: BeautyTheme.border },
  saveBtn: { backgroundColor: BeautyTheme.primary, padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 15, shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 5 },
  callBackBtn: { backgroundColor: BeautyTheme.primary, marginHorizontal: 25, marginTop: -15, marginBottom: 20, padding: 16, borderRadius: 20, alignItems: 'center' },

  notifModalContainer: { flex: 1, backgroundColor: BeautyTheme.bg, padding: 25 },
  notifHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, marginTop: 10 },
  notifMainTitle: { fontSize: 26, fontWeight: '800', color: BeautyTheme.textMain, letterSpacing: -0.5 },
  notifItemCard: { flexDirection: 'row', backgroundColor: BeautyTheme.card, padding: 20, borderRadius: 24, marginBottom: 15, alignItems: 'center', shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
  notifIconWrapper: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  notifItemTitle: { fontSize: 14, color: BeautyTheme.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  notifItemBody: { fontSize: 16, color: BeautyTheme.textSecondary, marginBottom: 6, lineHeight: 22 },
  notifItemTime: { fontSize: 12, color: BeautyTheme.primaryDark, fontWeight: '600' },

  sidebarLight: { width: '82%', maxWidth: 340, backgroundColor: BeautyTheme.bg, height: '100%', paddingVertical: 50, borderTopRightRadius: 40, borderBottomRightRadius: 40 },
  sidebarHeaderLight: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginBottom: 40 },
  sidebarTitleLight: { color: BeautyTheme.textMain, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  closeBtnLight: { width: 44, height: 44, borderRadius: 22, backgroundColor: BeautyTheme.primaryLight, justifyContent: 'center', alignItems: 'center' },
  menuItemSmooth: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18, borderRadius: 22, marginBottom: 12 },
  menuItemSmoothActive: { backgroundColor: BeautyTheme.primary, shadowColor: BeautyTheme.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  menuIconContainer: { width: 46, height: 46, borderRadius: 16, backgroundColor: BeautyTheme.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  menuIconContainerActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  menuTextSmooth: { fontSize: 16, color: BeautyTheme.textMain, fontWeight: '600', textTransform: 'capitalize', letterSpacing: 0.5 },
  menuTextSmoothActive: { color: '#FFF', fontWeight: '700' },
  userInfoLight: { padding: 30, borderTopWidth: 1, borderColor: BeautyTheme.border, flexDirection: 'row', alignItems: 'center' },
  userAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: BeautyTheme.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 15 },

  // ── BOTTOM SHEET ──
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(59,39,48,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: SCREEN_HEIGHT * 0.72,
    backgroundColor: BeautyTheme.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHandle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: BeautyTheme.primarySoft,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BeautyTheme.border,
    gap: 10,
  },
  sheetDateLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: BeautyTheme.textMain,
    textTransform: 'capitalize',
    letterSpacing: -0.3,
  },
  sheetRecordCount: {
    fontSize: 12,
    color: BeautyTheme.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  sheetAddBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: BeautyTheme.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: BeautyTheme.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  sheetCloseBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: BeautyTheme.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },

  // Master strip
  masterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderLeftWidth: 3,
    marginBottom: 10,
  },
  masterDot: { width: 8, height: 8, borderRadius: 4 },
  masterStripName: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3, flex: 1 },
  masterStripCount: { fontSize: 11, color: BeautyTheme.textSecondary, fontWeight: '600' },

  // Sheet record card
  sheetRecordCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: BeautyTheme.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BeautyTheme.border,
    gap: 12,
  },
  sheetTimePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 52,
    alignItems: 'center',
    marginTop: 2,
  },
  sheetTimeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sheetClientName: {
    fontSize: 15,
    fontWeight: '700',
    color: BeautyTheme.textMain,
    letterSpacing: -0.2,
  },
  sheetPhone: {
    fontSize: 13,
    color: BeautyTheme.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  sheetService: {
    fontSize: 13,
    color: BeautyTheme.primaryDark,
    marginTop: 4,
    fontWeight: '600',
  },
  sheetNote: {
    fontSize: 12,
    color: BeautyTheme.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  sheetActions: {
    flexDirection: 'column',
    gap: 6,
    marginLeft: 'auto',
  },
  sheetActionBtn: {
    width: 32, height: 32,
    borderRadius: 10,
    backgroundColor: BeautyTheme.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },

  // Empty state
  emptySheet: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptySheetText: {
    fontSize: 15,
    color: BeautyTheme.textSecondary,
    fontWeight: '600',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BeautyTheme.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyAddText: {
    fontSize: 14,
    color: BeautyTheme.primaryDark,
    fontWeight: '700',
  },
});