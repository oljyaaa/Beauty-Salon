import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

// Стандартний список, якщо нічого не передали
const DEFAULT_CATEGORIES = ['Всі записи', 'Масаж', 'Elos-епіляція', 'Доглядові процедури', 'Архів', 'Перетелефонувати'];

interface Props {
  visible: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (category: string) => void;
  customCategories?: string[]; // <--- ДОДАНО ЦЕЙ РЯДОК, ЩОБ ПРИБРАТИ ПОМИЛКУ
}

export default function CategoryModal({ visible, selected, onClose, onSelect, customCategories }: Props) {
  
  // Використовуємо передані категорії або стандартні
  const dataToShow = customCategories && customCategories.length > 0 ? customCategories : DEFAULT_CATEGORIES;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>Оберіть категорію</Text>
          
          <FlatList 
            data={dataToShow}
            keyExtractor={i => i}
            renderItem={({item}) => (
              <TouchableOpacity 
                style={[styles.item, selected === item && styles.selectedItem]} 
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[styles.itemText, selected === item && styles.selectedText]}>{item}</Text>
                {selected === item && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>
            )}
          />
          
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Закрити</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '80%', backgroundColor: '#FFF', borderRadius: 20, padding: 20, maxHeight: '60%' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  item: { padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectedItem: { backgroundColor: '#f9f9ff' },
  itemText: { fontSize: 16, color: '#333' },
  selectedText: { color: Colors.primary, fontWeight: 'bold' },
  closeBtn: { marginTop: 15, padding: 10, alignItems: 'center' },
  closeText: { color: Colors.danger, fontSize: 16 }
});