import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, SafeAreaView, Platform,
  Animated, Easing, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../constants/Colors';
import { COSMETOLOGISTS } from '../constants/Data';

const { width: SW } = Dimensions.get('window');

// ── PALETTE ────────────────────────────────────────────────
const T = {
  bg: '#FDF6F9',
  card: '#FFFFFF',
  cardAlt: '#FEF3F7',
  primary: '#E8879E',
  primaryDark: '#C45E78',
  primarySoft: '#F5C6D3',
  primaryPale: '#FFF0F5',
  textMain: '#3B2730',
  textSub: '#9C7D87',
  textMuted: '#C4A8B2',
  border: '#F0DDE4',
  inputBg: '#FFF8FA',
};

const MASTERS = COSMETOLOGISTS.filter((m: string) => m !== 'He обрано');

// ── ANIMATED SECTION ──────────────────────────────────────
function AnimSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 380, delay,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
}

// ── FIELD LABEL ───────────────────────────────────────────
function FieldLabel({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.fieldLabelRow}>
      <Ionicons name={icon as any} size={13} color={T.primaryDark} />
      <Text style={s.fieldLabelText}>{text}</Text>
    </View>
  );
}

// ── STYLED INPUT ──────────────────────────────────────────
function StyledInput({ value, onChangeText, placeholder, keyboardType, multiline, inputHeight }: any) {
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  const onBlur  = () => Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();

  const borderColor = borderAnim.interpolate({ inputRange: [0,1], outputRange: [T.border, T.primary] });
  const bgColor     = borderAnim.interpolate({ inputRange: [0,1], outputRange: [T.inputBg, T.primaryPale] });

  return (
    <Animated.View style={[s.inputWrapper, { borderColor, backgroundColor: bgColor }]}>
      <TextInput
        style={[s.input, inputHeight ? { height: inputHeight, textAlignVertical: 'top' } : {}]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.textMuted}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </Animated.View>
  );
}

// ── ANIMATED CHIP ─────────────────────────────────────────
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: active ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [active]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.90, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const bgColor     = progress.interpolate({ inputRange: [0,1], outputRange: [T.cardAlt, T.primary] });
  const borderColor = progress.interpolate({ inputRange: [0,1], outputRange: [T.border, T.primary] });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      {/* JS-driver: bg + border color */}
      <Animated.View style={[s.chip, { backgroundColor: bgColor, borderColor }]}>
        {/* Native-driver: scale bounce */}
        <Animated.View style={[s.chipInner, { transform: [{ scale }] }]}>
          {active && <Ionicons name="checkmark" size={12} color="#fff" style={{ marginRight: 4 }} />}
          <Text style={[s.chipText, active && s.chipActive]}>{label}</Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── SECTION DIVIDER ───────────────────────────────────────
function SectionDivider({ title }: { title: string }) {
  return (
    <View style={s.dividerRow}>
      <View style={s.dividerLine} />
      <Text style={s.dividerText}>{title}</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

// ── DATE/TIME BUTTON (Android) ────────────────────────────
function DtBtn({ icon, value, onPress }: { icon: string; value: string; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <TouchableOpacity onPress={press} activeOpacity={1} style={{ flex: 1 }}>
      <Animated.View style={[s.dtBtn, { transform: [{ scale }] }]}>
        <View style={s.dtIcon}><Ionicons name={icon as any} size={17} color={T.primaryDark} /></View>
        <Text style={s.dtText}>{value}</Text>
        <Ionicons name="chevron-down" size={15} color={T.textMuted} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── SAVE BUTTON ───────────────────────────────────────────
function SaveButton({ onPress, isEdit }: { onPress: () => void; isEdit: boolean }) {
  const shimmer = useRef(new Animated.Value(-1)).current;
  const scale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, { toValue: 2, duration: 2000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const shimX = shimmer.interpolate({ inputRange: [-1, 2], outputRange: [-120, 340] });

  return (
    <TouchableOpacity onPress={press} activeOpacity={1} style={{ marginTop: 12 }}>
      <Animated.View style={[s.saveBtn, { transform: [{ scale }] }]}>
        <Animated.View style={[s.shimmer, { transform: [{ translateX: shimX }] }]} pointerEvents="none" />
        <Ionicons name={isEdit ? 'checkmark-circle-outline' : 'add-circle-outline'} size={20} color="#fff" style={{ marginRight: 10 }} />
        <Text style={s.saveTxt}>{isEdit ? 'Зберегти зміни' : 'Додати запис'}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── PROPS ─────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  servicesData?: any[];
  allowedCategories?: string[];
  defaultCategory?: string;
  preFillClient?: { name: string; phone: string; note?: string; serviceHint?: string; _prefillDate?: string };
}

// ── MAIN ──────────────────────────────────────────────────
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

  // Track whether we've already initialized for the current open session.
  // This prevents the form from resetting every time the parent re-renders
  // (which happens on every keystroke because parent state changes).
  const initializedForSession = useRef(false);

  // Header entrance
  const hSlide   = useRef(new Animated.Value(-50)).current;
  const hOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      hSlide.setValue(-50); hOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(hSlide,   { toValue: 0, tension: 75, friction: 10, useNativeDriver: true }),
        Animated.timing(hOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      // Reset the guard when modal closes so next open re-initializes
      initializedForSession.current = false;
    }
  }, [visible]);

  useEffect(() => {
    // Only run once per open session (when visible becomes true)
    if (!visible || initializedForSession.current) return;
    initializedForSession.current = true;

    if (initialData) {
      const [hours, minutes] = initialData.time.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      setFormData({
        clientName: initialData.clientName, phone: initialData.phone,
        category: initialData.category, service: initialData.service,
        date: new Date(initialData.date), time: timeDate,
        note: initialData.note || '', master: initialData.master || ''
      });
    } else {
      const fallback = allowedCategories[0] || '';
      const activeCat = (defaultCategory && allowedCategories.includes(defaultCategory) && defaultCategory !== 'Всі записи') ? defaultCategory : fallback;
      const now = new Date(); now.setSeconds(0, 0);

      let prefillDateObj = now;
      if (preFillClient?._prefillDate) {
        const parts = preFillClient._prefillDate.split('-');
        if (parts.length === 3) {
          prefillDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), now.getHours(), now.getMinutes(), 0, 0);
        }
      }

      setFormData({
        clientName: preFillClient?.name || '', phone: preFillClient?.phone || '',
        category: activeCat, service: preFillClient?.serviceHint || '',
        date: prefillDateObj, time: prefillDateObj,
        note: preFillClient?.note || '', master: ''
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  // ↑ IMPORTANT: deps array contains ONLY [visible].
  // preFillClient / initialData / defaultCategory are intentionally excluded —
  // we snapshot them once on open via the initializedForSession guard.

  const normalize = (str: string) => (str || '').toLowerCase().trim();
  const matchingCats = servicesData.filter(cat => {
    const db = normalize(cat.title), sel = normalize(formData.category);
    if (sel.includes('епіл')) return db.includes('епіл');
    return db === sel || db.includes(sel) || sel.includes(db);
  });
  const availableServices: any[] = matchingCats.reduce((acc: any[], cur: any) => [...acc, ...(cur.services || [])], []);
  const categoriesToSelect = allowedCategories.filter(c => c !== 'Всі записи' && c !== 'Архів' && c !== 'Перетелефонувати');

  const handleSave = () => {
    if (!formData.clientName) return alert("Введіть ім'я");
    if (!formData.master) return alert('Оберіть майстра');
    const hh = formData.time.getHours().toString().padStart(2,'0');
    const mm = formData.time.getMinutes().toString().padStart(2,'0');
    const y  = formData.date.getFullYear();
    const mo = (formData.date.getMonth()+1).toString().padStart(2,'0');
    const d  = formData.date.getDate().toString().padStart(2,'0');
    onSave({ ...formData, date: `${y}-${mo}-${d}`, time: `${hh}:${mm}` });
  };

  const dateLabel = `${formData.date.getDate().toString().padStart(2,'0')}.${(formData.date.getMonth()+1).toString().padStart(2,'0')}.${formData.date.getFullYear()}`;
  const timeLabel = `${formData.time.getHours().toString().padStart(2,'0')}:${formData.time.getMinutes().toString().padStart(2,'0')}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.root}>

        {/* ── HEADER ── */}
        <Animated.View style={[s.header, { transform: [{ translateY: hSlide }], opacity: hOpacity }]}>
          <View style={s.pill} />
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>{initialData ? '✏️  Редагувати' : '✨  Новий запис'}</Text>
              <Text style={s.headerSub}>{formData.clientName || 'Заповніть форму нижче'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={19} color={T.textSub} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* CLIENT */}
          <AnimSection delay={50}>
            <SectionDivider title="Клієнт" />
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <FieldLabel icon="person-outline" text="Ім'я" />
                <StyledInput value={formData.clientName} onChangeText={(t:string) => setFormData({...formData, clientName: t})} placeholder="Введіть ім'я" />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel icon="call-outline" text="Телефон" />
                <StyledInput value={formData.phone} onChangeText={(t:string) => setFormData({...formData, phone: t})} placeholder="0XX..." keyboardType="phone-pad" />
              </View>
            </View>
          </AnimSection>

          {/* MASTER */}
          <AnimSection delay={120}>
            <SectionDivider title="Майстер" />
            <View style={s.chips}>
              {MASTERS.map((m:string) => (
                <Chip key={m} label={m} active={formData.master === m} onPress={() => setFormData({...formData, master: m})} />
              ))}
            </View>
          </AnimSection>

          {/* CATEGORY */}
          <AnimSection delay={190}>
            <SectionDivider title="Категорія" />
            <View style={s.chips}>
              {categoriesToSelect.map(cat => (
                <Chip key={cat} label={cat} active={formData.category === cat} onPress={() => setFormData({...formData, category: cat, service: ''})} />
              ))}
            </View>
          </AnimSection>

          {/* SERVICE */}
          <AnimSection delay={260}>
            <SectionDivider title="Послуга" />
            {availableServices.length > 0 ? (
              <View style={s.chips}>
                {availableServices.map((srv:any) => (
                  <Chip key={srv.service_id} label={srv.name} active={formData.service === srv.name} onPress={() => setFormData({...formData, service: srv.name})} />
                ))}
              </View>
            ) : (
              <>
                <FieldLabel icon="sparkles-outline" text="Або введіть вручну" />
                <StyledInput value={formData.service} onChangeText={(t:string) => setFormData({...formData, service: t})} placeholder="Спочатку оберіть категорію" />
              </>
            )}
          </AnimSection>

          {/* DATE & TIME */}
          <AnimSection delay={330}>
            <SectionDivider title="Дата та час" />
            {Platform.OS === 'ios' ? (
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <FieldLabel icon="calendar-outline" text="Дата" />
                  <View style={s.iosPicker}>
                    <DateTimePicker value={formData.date} mode="date" display="default" onChange={(e,d) => d && setFormData({...formData, date: d})} style={{flex:1}} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <FieldLabel icon="time-outline" text="Час" />
                  <View style={s.iosPicker}>
                    <DateTimePicker value={formData.time} mode="time" display="default" onChange={(e,d) => d && setFormData({...formData, time: d})} style={{flex:1}} />
                  </View>
                </View>
              </View>
            ) : (
              <View style={s.row}>
                <DtBtn icon="calendar-outline" value={dateLabel} onPress={() => setShowDatePicker(true)} />
                <DtBtn icon="time-outline"     value={timeLabel} onPress={() => setShowTimePicker(true)} />
              </View>
            )}
            {showDatePicker && <DateTimePicker value={formData.date} mode="date" onChange={(e,d) => { setShowDatePicker(false); if(d) setFormData({...formData, date:d}); }} />}
            {showTimePicker && <DateTimePicker value={formData.time} mode="time" onChange={(e,d) => { setShowTimePicker(false); if(d) setFormData({...formData, time:d}); }} />}
          </AnimSection>

          {/* NOTE */}
          <AnimSection delay={400}>
            <SectionDivider title="Примітка" />
            <FieldLabel icon="chatbubble-outline" text="Коментар (необов'язково)" />
            <StyledInput value={formData.note} onChangeText={(t:string) => setFormData({...formData, note: t})} placeholder="Додаткова інформація..." multiline inputHeight={88} />
          </AnimSection>

          {/* SAVE */}
          <AnimSection delay={460}>
            <SaveButton onPress={handleSave} isEdit={!!initialData} />
          </AnimSection>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── STYLES ────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  // Header
  header: {
    backgroundColor: T.card,
    borderBottomWidth: 1, borderBottomColor: T.border,
    paddingBottom: 18,
    shadowColor: T.primaryDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
  },
  pill: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: T.primarySoft,
    alignSelf: 'center', marginTop: 10, marginBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: T.textMain, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: T.textSub, marginTop: 3, fontWeight: '500' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.cardAlt,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: T.border,
  },

  scroll: { padding: 20 },

  // Section divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: T.border },
  dividerText: { fontSize: 10, fontWeight: '700', color: T.textMuted, letterSpacing: 1.3, textTransform: 'uppercase' },

  // Field label
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 },
  fieldLabelText: { fontSize: 11, fontWeight: '700', color: T.textSub, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Layout
  row: { flexDirection: 'row', gap: 12 },

  // Input
  inputWrapper: { borderWidth: 1.5, borderRadius: 16 },
  input: { paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontWeight: '500', color: T.textMain },

  // Chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, borderWidth: 1.5 },
  chipInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { fontSize: 13, color: T.textSub, fontWeight: '600' },
  chipActive: { color: '#fff', fontWeight: '700' },

  // Date / time
  dtBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1.5, borderColor: T.border,
    paddingHorizontal: 13, paddingVertical: 12, gap: 9,
  },
  dtIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: T.primaryPale, justifyContent: 'center', alignItems: 'center' },
  dtText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.textMain, letterSpacing: 0.2 },
  iosPicker: { backgroundColor: T.card, borderRadius: 16, borderWidth: 1.5, borderColor: T.border, overflow: 'hidden', padding: 4 },

  // Save
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.primary, borderRadius: 20, paddingVertical: 17,
    overflow: 'hidden',
    shadowColor: T.primaryDark, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28, shadowRadius: 18, elevation: 7,
  },
  shimmer: {
    position: 'absolute', top: 0, bottom: 0, width: 70,
    backgroundColor: 'rgba(255,255,255,0.22)',
    transform: [{ skewX: '-20deg' }],
  },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});