import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { CATEGORIES } from '../constants/Data';

interface Props {
  visible: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (cat: string) => void;
}

export default function CategoryModal({ visible, selected, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <Text style={styles.header}>Оберіть категорію</Text>
          <ScrollView style={{maxHeight: 400}}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} style={styles.item} onPress={() => { onSelect(cat); onClose(); }}>
                <Text style={[styles.text, selected === cat && {color: Colors.primaryDark, fontWeight: 'bold'}]}>
                    {cat}
                </Text>
                {selected === cat && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderColor: Colors.border },
  text: { fontSize: 16, color: Colors.textMain },
});