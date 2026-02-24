import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface RecordCardProps {
  item: any;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDeletePermanent: () => void; 
}

export default function RecordCard({ item, onEdit, onArchive, onRestore, onDeletePermanent }: RecordCardProps) {
  const isArchive = item.category === 'Архів';

  return (
    <View style={[styles.card, isArchive && styles.archivedCard]}>
      <View style={styles.topRow}>
        <View style={[styles.timeBadge, isArchive && {backgroundColor: '#ccc'}]}>
          <Ionicons name="time-outline" size={14} color="#FFF" />
          <Text style={styles.timeText}>{item.time} | {item.date}</Text>
        </View>
        <View style={styles.masterBadge}>
            <Ionicons name="person" size={12} color={Colors.primary} />
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
              <Ionicons name="create-outline" size={20} color={Colors.primaryDark} />
              <Text style={styles.btnText}>Редагувати</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.archiveBtn} onPress={onArchive}>
              <Ionicons name="archive-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg, borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: '#6A5185', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  archivedCard: { opacity: 0.8, backgroundColor: '#F0F0F0' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  timeBadge: { backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  masterBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.inputBg, paddingHorizontal: 10, borderRadius: 12 },
  masterText: { color: Colors.primaryDark, fontSize: 12, fontWeight: '600' },
  mainInfo: { marginBottom: 10 },
  clientName: { fontSize: 20, fontWeight: '700', color: Colors.textMain },
  phone: { fontSize: 14, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  serviceRow: { marginBottom: 10 },
  categoryLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase' },
  serviceName: { fontSize: 16, color: Colors.primaryDark, fontWeight: '600' },
  noteBox: { backgroundColor: '#FFF', padding: 8, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  noteText: { fontStyle: 'italic', color: Colors.textSecondary, fontSize: 13 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, gap: 10 },
  
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.inputBg, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14, flex: 1, justifyContent: 'center' },
  archiveBtn: { padding: 10, borderRadius: 14, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: Colors.primaryDark, fontWeight: '600', fontSize: 13 },
  
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.success, paddingVertical: 10, borderRadius: 14, flex: 1, justifyContent: 'center' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.danger, paddingVertical: 10, borderRadius: 14, flex: 1, justifyContent: 'center' },
  btnTextWhite: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
});