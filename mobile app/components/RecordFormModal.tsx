import React, { useState, useEffect } from 'react';
import { 
  Modal, View, Text, TouchableOpacity, TextInput, 
  ScrollView, StyleSheet, SafeAreaView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// 1. ПРАВИЛЬНІ ІМПОРТИ (мають бути тільки на самому початку)
import { Colors } from '../constants/Colors';
import { COSMETOLOGISTS } from '../constants/Data'; 

// 2. ВИЗНАЧЕННЯ ТИПІВ
interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  servicesData?: any[]; 
  allowedCategories?: string[]; 
  defaultCategory?: string; 
  preFillClient?: { name: string, phone: string, note?: string, serviceHint?: string };
}

// 3. ПІДГОТОВКА ДАНИХ
const MASTERS = COSMETOLOGISTS.filter(m => m !== 'He обрано');

export default function RecordFormModal({ 
  visible, onClose, onSave, initialData, servicesData = [], 
  allowedCategories = [], defaultCategory = '', preFillClient 
}: Props) {
  
  const [formData, setFormData] = useState({
    clientName: '', phone: '', category: '', service: '', 
    date: new Date(), time: new Date(), note: '', master: ''
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
  if (visible) {
    if (initialData) {
      // Створюємо дату, обнуляючи секунди та мілісекунди
      const [hours, minutes] = initialData.time.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      setFormData({
        clientName: initialData.clientName,
        phone: initialData.phone,
        category: initialData.category,
        service: initialData.service,
        date: new Date(initialData.date), 
        time: timeDate, 
        note: initialData.note || '',
        master: initialData.master || ''
      });
    } else {
      const fallback = allowedCategories[0] || '';
      const activeCat = (defaultCategory && allowedCategories.includes(defaultCategory) && defaultCategory !== 'Всі записи') ? defaultCategory : fallback;
      
      // Обнуляємо секунди для нового запису, щоб не було "17:57" замість "18:00"
      const now = new Date();
      now.setSeconds(0, 0);

      setFormData({
        clientName: preFillClient ? preFillClient.name : '', 
        phone: preFillClient ? preFillClient.phone : '', 
        category: activeCat, 
        service: preFillClient?.serviceHint || '', 
        date: now, 
        time: now, 
        note: preFillClient?.note || '', 
        master: ''
      });
    }
  }
}, [visible, initialData, defaultCategory, preFillClient]);

  const categoriesToSelect = allowedCategories.filter(c => c !== 'Всі записи' && c !== 'Архів' && c !== 'Перетелефонувати');
  
  const normalize = (str: string) => (str || '').toLowerCase().trim();

// 1. Знаходимо ВСІ категорії, назва яких містить "епіл" або збігається з обраною
const matchingCategories = servicesData.filter(cat => {
  const dbTitle = normalize(cat.title);
  const selectedCat = normalize(formData.category);
  
  // Якщо обрана категорія "elos-епіляція", шукаємо всі категорії, де є "епіл"
  if (selectedCat.includes('епіл')) {
    return dbTitle.includes('епіл');
  }
  
  // Для інших категорій (масаж і т.д.) залишаємо звичайний пошук
  return dbTitle === selectedCat || dbTitle.includes(selectedCat) || selectedCat.includes(dbTitle);
});

// 2. Збираємо всі послуги з усіх знайдених категорій в один масив
const availableServices = matchingCategories.reduce((acc, current) => {
  return [...acc, ...(current.services || [])];
}, []);

  const handleSave = () => {
    if (!formData.clientName) return alert("Введіть ім'я");
    if (!formData.master) return alert("Оберіть майстра");

    const hours = formData.time.getHours().toString().padStart(2, '0');
    const minutes = formData.time.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const y = formData.date.getFullYear();
    const m = (formData.date.getMonth() + 1).toString().padStart(2, '0');
    const d = formData.date.getDate().toString().padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    onSave({
      ...formData,
      date: dateStr,
      time: timeStr
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{flex: 1, backgroundColor: '#FFF'}}>
        <View style={styles.header}>
          <Text style={styles.title}>{initialData ? 'Редагувати' : 'Новий запис'}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color="#333"/></TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={{padding: 20}}>
          <Text style={styles.label}>Клієнт</Text>
          <TextInput style={styles.input} placeholder="Ім'я" value={formData.clientName} onChangeText={t => setFormData({...formData, clientName: t})} />
          
          <Text style={styles.label}>Телефон</Text>
          <TextInput style={styles.input} placeholder="0XX..." keyboardType="phone-pad" value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} />

          <Text style={styles.label}>Майстер (Обов'язково)</Text>
          <View style={styles.chipsContainer}>
            {MASTERS.map(m => (
              <TouchableOpacity key={m} style={[styles.chip, formData.master === m && styles.chipActive]} onPress={() => setFormData({...formData, master: m})}>
                <Text style={[styles.chipText, formData.master === m && styles.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.label}>Категорія</Text>
          <View style={styles.chipsContainer}>
            {categoriesToSelect.map(cat => (
              <TouchableOpacity key={cat} style={[styles.chip, formData.category === cat && styles.chipActive]} onPress={() => setFormData({...formData, category: cat, service: ''})}>
                <Text style={[styles.chipText, formData.category === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Послуга</Text>
          {availableServices.length > 0 ? (
            <View style={styles.chipsContainer}>
              {availableServices.map((srv: any) => (
                <TouchableOpacity key={srv.service_id} style={[styles.chip, formData.service === srv.name && styles.chipActive]} onPress={() => setFormData({...formData, service: srv.name})}>
                  <Text style={[styles.chipText, formData.service === srv.name && styles.chipTextActive]}>{srv.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TextInput style={styles.input} placeholder="Спочатку оберіть категорію" value={formData.service} onChangeText={t => setFormData({...formData, service: t})} />
          )}

          <Text style={styles.label}>Дата</Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker value={formData.date} mode="date" display="default" onChange={(e,d) => d && setFormData({...formData, date: d})} />
          ) : (
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text>{formData.date.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>
          )}
          {showDatePicker && <DateTimePicker value={formData.date} mode="date" onChange={(e,d) => {setShowDatePicker(false); if(d) setFormData({...formData, date: d})}} />}

          <Text style={styles.label}>Час</Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker value={formData.time} mode="time" display="default" onChange={(e,d) => d && setFormData({...formData, time: d})} />
          ) : (
            <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
              <Text>{formData.time.getHours().toString().padStart(2, '0')}:{formData.time.getMinutes().toString().padStart(2, '0')}</Text>
            </TouchableOpacity>
          )}
          {showTimePicker && <DateTimePicker value={formData.time} mode="time" onChange={(e,d) => {setShowTimePicker(false); if(d) setFormData({...formData, time: d})}} />}

          <Text style={styles.label}>Примітка</Text>
          <TextInput style={[styles.input, {height: 80}]} multiline placeholder="..." value={formData.note} onChangeText={t => setFormData({...formData, note: t})} />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveBtnText}>Зберегти</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 20, fontWeight: 'bold' },
  label: { marginTop: 15, marginBottom: 8, color: '#666', fontWeight: '600' },
  input: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 12, fontSize: 16 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#EEE' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: '#333' },
  chipTextActive: { color: '#FFF', fontWeight: 'bold' },
  saveBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 }
});