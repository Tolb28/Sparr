import React, { useState, useRef, useCallback } from 'react';
import { View, Pressable, Modal, StyleSheet, FlatList } from 'react-native';
import { Text } from '@/components/ui/text';
import { colors } from '@/src/theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerProps {
  value: string | null; // "HH:MM" or null
  onChange: (time: string | null) => void;
  label?: string;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10...55

function WheelColumn({ data, selected, onSelect, formatFn }: {
  data: number[];
  selected: number;
  onSelect: (v: number) => void;
  formatFn: (v: number) => string;
}) {
  const flatListRef = useRef<FlatList>(null);
  const initialIdx = data.indexOf(selected);

  const onMomentumEnd = useCallback((e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const idx = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    onSelect(data[clamped]);
  }, [data, onSelect]);

  return (
    <View style={wheelStyles.column}>
      <FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(item) => String(item)}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        initialScrollIndex={Math.max(0, initialIdx)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        renderItem={({ item }) => {
          const isActive = item === selected;
          return (
            <View style={[wheelStyles.item, isActive && wheelStyles.itemActive]}>
              <Text style={[wheelStyles.itemText, isActive && wheelStyles.itemTextActive]}>
                {formatFn(item)}
              </Text>
            </View>
          );
        }}
      />
      {/* Selection highlight overlay */}
      <View pointerEvents="none" style={wheelStyles.highlight} />
    </View>
  );
}

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempHour, setTempHour] = useState(() => value ? parseInt(value.split(':')[0], 10) : 12);
  const [tempMin, setTempMin] = useState(() => {
    if (!value) return 0;
    const m = parseInt(value.split(':')[1], 10);
    return Math.round(m / 5) * 5;
  });

  const display = value || 'No time';

  const openPicker = () => {
    if (value) {
      setTempHour(parseInt(value.split(':')[0], 10));
      const m = parseInt(value.split(':')[1], 10);
      setTempMin(Math.round(m / 5) * 5);
    } else {
      setTempHour(12);
      setTempMin(0);
    }
    setShowPicker(true);
  };

  const confirm = () => {
    const timeStr = `${String(tempHour).padStart(2, '0')}:${String(tempMin).padStart(2, '0')}`;
    onChange(timeStr);
    setShowPicker(false);
  };

  return (
    <>
      <Pressable style={styles.trigger} onPress={openPicker}>
        <Ionicons name="time-outline" size={14} color={value ? colors.primary.main : colors.text.tertiary} />
        <Text style={[styles.triggerText, value && styles.triggerTextActive]}>
          {label ? `${label}: ${display}` : display}
        </Text>
      </Pressable>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPicker(false)} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Time</Text>
              <Pressable onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </Pressable>
            </View>

            <Pressable
              style={styles.clearBtn}
              onPress={() => { onChange(null); setShowPicker(false); }}
            >
              <Text style={styles.clearText}>No specific time</Text>
            </Pressable>

            <View style={styles.wheelsRow}>
              <WheelColumn
                data={HOURS}
                selected={tempHour}
                onSelect={setTempHour}
                formatFn={(v) => String(v).padStart(2, '0')}
              />
              <Text style={styles.colonText}>:</Text>
              <WheelColumn
                data={MINUTES}
                selected={tempMin}
                onSelect={setTempMin}
                formatFn={(v) => String(v).padStart(2, '0')}
              />
            </View>

            <Text style={styles.previewText}>
              {String(tempHour).padStart(2, '0')}:{String(tempMin).padStart(2, '0')}
            </Text>

            <Pressable style={styles.confirmBtn} onPress={confirm}>
              <Text style={styles.confirmText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const wheelStyles = StyleSheet.create({
  column: { width: 70, height: WHEEL_HEIGHT, overflow: 'hidden' },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemActive: {},
  itemText: { fontSize: 20, color: colors.text.tertiary, fontWeight: '500' },
  itemTextActive: { color: colors.text.primary, fontWeight: '800', fontSize: 24 },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.primary.main + '60',
    backgroundColor: colors.primary.main + '10',
    borderRadius: 8,
  },
});

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.glass.surface,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  triggerText: { color: colors.text.tertiary, fontSize: 11 },
  triggerTextActive: { color: colors.primary.main },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  clearBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.glass.surface,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  clearText: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  colonText: { color: colors.text.primary, fontSize: 28, fontWeight: '800' },
  previewText: {
    textAlign: 'center',
    color: colors.primary.main,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmBtn: {
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary.main,
    marginTop: 4,
  },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
