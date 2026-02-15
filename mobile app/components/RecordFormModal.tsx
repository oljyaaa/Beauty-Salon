import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, Modal, TextInput, ScrollView, TouchableOpacity, 
  Platform, KeyboardAvoidingView, FlatList, SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../constants/Colors';
import { COSMETOLOGISTS, SERVICES_LIST } from '../constants/Data';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any; // Якщо null - створення, якщо є дані - редагування
}

export default function RecordFormModal({ visible, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState({
    clientName: '', phone: '', category: 'Масаж', service: '', 
    master: '', date: new Date(), time: new Date(), note: ''
  });

  const [isPickingService, setIsPickingService] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsPickingService(false); 
      if (initialData) {
        // Парсимо час з рядка "HH:MM"
        const [h, m] = initialData.time.split(':');
        const t = new Date(); t.setHours(Number(h), Number(m));
        
        setFormData({
            ...initialData,
            date: new Date(initialData.date),
            time: t
        });
      } else {
        setFormData({
            clientName: '', phone: '', category: 'Масаж', service: '', 
            master: '', date: new Date(), time: new Date(), note: ''
        });
      }
    }
  }, [visible, initialData]);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const formatTime = (date: Date) => date.toTimeString().slice(0, 5);

  const handleSaveBtn = () => {
    if (!formData.clientName || !formData.service || !formData.master) {
       alert("Заповніть обов'язкові поля!"); return;
    }
    onSave({
        ...formData,
        date: formatDate(formData.date),
        time: formatTime(formData.time)
    });
  };

  const onDateChange = (e: any, d?: Date) => { setShowDatePicker(false); if(d) setFormData({...formData, date: d}); };
  const onTimeChange = (e: any, t?: Date) => { setShowTimePicker(false); if(t) setFormData({...formData, time: t}); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
        
        {/* HEADER */}
        <View style={styles.header}>
            {isPickingService ? (
                <TouchableOpacity onPress={() => setIsPickingService(false)} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textMain} />
                    <Text>Назад</Text>
                </TouchableOpacity>
            ) : (
                <Text style={styles.title}>{initialData ? 'Редагування' : 'Новий запис'}</Text>
            )}
            
            {!isPickingService && (
                <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close-circle" size={30} color={Colors.textSecondary} />
                </TouchableOpacity>
            )}
        </View>

        {/* CONTENT */}
        {isPickingService ? (
            // ЕКРАН ВИБОРУ ПОСЛУГИ
            <FlatList 
                data={SERVICES_LIST}
                keyExtractor={item => item}
                renderItem={({item}) => (
                    <TouchableOpacity style={styles.serviceItem} onPress={() => {
                        setFormData({...formData, service: item});
                        setIsPickingService(false);
                    }}>
                         <Text style={{fontSize: 16, color: formData.service === item ? Colors.primary : '#333', fontWeight: formData.service === item ? 'bold' : 'normal'}}>{item}</Text>
                         {formData.service === item && <Ionicons name="checkmark" size={24} color={Colors.primary} />}
                    </TouchableOpacity>
                )}
            />
        ) : (
            // ЕКРАН ФОРМИ
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <Text style={styles.label}>Клієнт *</Text>
                    <TextInput style={styles.input} placeholder="Ім'я" value={formData.clientName} onChangeText={t => setFormData({...formData, clientName: t})} />

                    <Text style={styles.label}>Телефон</Text>
                    <TextInput style={styles.input} placeholder="050..." keyboardType="phone-pad" value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} />

                    <Text style={styles.label}>Косметолог *</Text>
                    <View style={styles.mastersGrid}>
                        {COSMETOLOGISTS.map(m => (
                            <TouchableOpacity key={m} style={[styles.chip, formData.master === m && styles.chipActive]} onPress={() => setFormData({...formData, master: m})}>
                                <Text style={{color: formData.master === m ? '#FFF' : '#000'}}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Послуга *</Text>
                    <TouchableOpacity style={styles.input} onPress={() => setIsPickingService(true)}>
                        <Text style={{color: formData.service ? '#000' : '#999'}}>{formData.service || 'Обрати послугу...'}</Text>
                        <Ionicons name="list" size={20} color={Colors.primary} />
                    </TouchableOpacity>

                    <View style={{flexDirection: 'row', gap: 10, marginTop: 15}}>
                        <View style={{flex: 1}}>
                            <Text style={styles.label}>Дата</Text>
                            {Platform.OS === 'web' ? (
                                <TextInput style={styles.input} value={formatDate(formData.date)} />
                            ) : (
                                <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                                    <Text>{formatDate(formData.date)}</Text>
                                    <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.label}>Час</Text>
                             {Platform.OS === 'web' ? (
                                <TextInput style={styles.input} value={formatTime(formData.time)} />
                            ) : (
                                <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
                                    <Text>{formatTime(formData.time)}</Text>
                                    <Ionicons name="time-outline" size={20} color={Colors.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {Platform.OS !== 'web' && showDatePicker && <DateTimePicker value={formData.date} mode="date" onChange={onDateChange} />}
                    {Platform.OS !== 'web' && showTimePicker && <DateTimePicker value={formData.time} mode="time" is24Hour onChange={onTimeChange} />}

                    <Text style={styles.label}>Примітка</Text>
                    <TextInput style={[styles.input, {height: 80}]} multiline value={formData.note} onChangeText={t => setFormData({...formData, note: t})} />

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBtn}>
                        <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 18}}>Зберегти</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { marginTop: 15, marginBottom: 5, color: '#666' },
  input: { backgroundColor: Colors.inputBg, padding: 14, borderRadius: 12, fontSize: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mastersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { padding: 10, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  saveBtn: { backgroundColor: Colors.primaryDark, marginTop: 30, padding: 18, borderRadius: 16, alignItems: 'center' },
  serviceItem: { padding: 20, borderBottomWidth: 1, borderColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'space-between' }
});