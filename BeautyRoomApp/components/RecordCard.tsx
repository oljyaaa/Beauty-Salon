// components/RecordCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RecordCardProps {
  item: any;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDeletePermanent: () => void; 
}

// ПАЛІТРА КАРТКИ (Beauty Booking App Vibe)
const BeautyTheme = {
  card: '#FFFFFF',
  primary: '#F0A3B1', 
  primaryDark: '#D48392', 
  primaryLight: '#FEF4F6', 
  textMain: '#3A3333', 
  textSecondary: '#9C9292', 
  danger: '#F2A2A2',
  success: '#B5C9AD',
  border: '#F4EDED',
  inputBg: '#FDFBFB',
};

export default function RecordCard({ item, onEdit, onArchive, onRestore, onDeletePermanent }: RecordCardProps) {
  const isArchive = item.category === 'Архів';
  const isCall = item.type === 'call' || item.category === 'Перетелефонувати';

  return (
    <View style={[styles.card, isArchive && styles.archivedCard]}>
      <View style={styles.topRow}>
        <View style={[styles.timeBadge, isArchive && {backgroundColor: BeautyTheme.textSecondary}]}>
          <Ionicons name="time" size={14} color="#FFF" />
          <Text style={styles.timeText}>{item.time} | {item.date}</Text>
        </View>
        <View style={styles.masterBadge}>
            <Ionicons name="sparkles" size={12} color={BeautyTheme.primaryDark} />
            <Text style={styles.masterText}>{item.master}</Text>
        </View>
      </View>

      <View style={styles.mainInfo}>
        <Text style={styles.clientName}>{item.clientName}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.serviceRow}>
        {!isArchive && <Text style={styles.categoryLabel}>{item.category}</Text>}
        <Text style={styles.serviceName}>{item.service}</Text>
      </View>

      {item.note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>“{item.note}”</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {isArchive ? (
          <>
            <TouchableOpacity style={styles.restoreBtn} onPress={onRestore}>
              <Ionicons name="refresh" size={20} color="#FFF" />
              <Text style={styles.btnTextWhite}>Відновити</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.deleteBtn} onPress={onDeletePermanent}>
              <Ionicons name="trash" size={20} color="#FFF" />
              <Text style={styles.btnTextWhite}>Видалити</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
              <Ionicons name="pencil" size={18} color={BeautyTheme.primaryDark} />
              <Text style={styles.btnText}>Редагувати</Text>
            </TouchableOpacity>
            
            {/* Показуємо кнопку архіву ТІЛЬКИ якщо це не заявка на дзвінок */}
            {!isCall && (
              <TouchableOpacity style={styles.archiveBtn} onPress={onArchive}>
                <Ionicons name="archive" size={20} color={BeautyTheme.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Додана кнопка видалення (доступна і для звичайних записів, і для заявок) */}
            <TouchableOpacity style={styles.deleteIconBtn} onPress={onDeletePermanent}>
              <Ionicons name="trash" size={20} color={BeautyTheme.danger} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: BeautyTheme.card, borderRadius: 28, padding: 24, marginBottom: 20, shadowColor: BeautyTheme.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 },
  archivedCard: { opacity: 0.8, backgroundColor: '#FDFDFD' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  timeBadge: { backgroundColor: BeautyTheme.primaryDark, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { color: '#FFF', fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  masterBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BeautyTheme.primaryLight, paddingHorizontal: 14, borderRadius: 16 },
  masterText: { color: BeautyTheme.primaryDark, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  mainInfo: { marginBottom: 14 },
  clientName: { fontSize: 22, fontWeight: '700', color: BeautyTheme.textMain, letterSpacing: -0.5 },
  phone: { fontSize: 15, color: BeautyTheme.textSecondary, marginTop: 4, fontWeight: '500' },
  divider: { height: 1, backgroundColor: BeautyTheme.border, marginVertical: 16 },
  serviceRow: { marginBottom: 16 },
  categoryLabel: { fontSize: 10, color: BeautyTheme.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 },
  serviceName: { fontSize: 17, color: BeautyTheme.textMain, fontWeight: '600' },
  noteBox: { backgroundColor: BeautyTheme.inputBg, padding: 14, borderRadius: 16, marginBottom: 18, borderWidth: 1, borderColor: BeautyTheme.border },
  noteText: { fontStyle: 'italic', color: BeautyTheme.textSecondary, fontSize: 14 },
  
  // Кнопки
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, gap: 12 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BeautyTheme.primaryLight, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 18, flex: 1, justifyContent: 'center' },
  archiveBtn: { padding: 14, borderRadius: 18, backgroundColor: BeautyTheme.inputBg, alignItems: 'center', justifyContent: 'center', width: 56, borderWidth: 1, borderColor: BeautyTheme.border },
  
  // Стиль для нової кнопки видалення (кошик)
  deleteIconBtn: { padding: 14, borderRadius: 18, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', width: 56, borderWidth: 1, borderColor: '#FFE5E5' },
  
  btnText: { color: BeautyTheme.primaryDark, fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BeautyTheme.success, paddingVertical: 14, borderRadius: 18, flex: 1, justifyContent: 'center' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BeautyTheme.danger, paddingVertical: 14, borderRadius: 18, flex: 1, justifyContent: 'center' },
  btnTextWhite: { color: '#FFF', fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
});