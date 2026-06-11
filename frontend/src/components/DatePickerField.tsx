import React, { useState, useMemo } from 'react';
import { View, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerFieldProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (date: string) => void;
  placeholder?: string;
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseDate(s: string): { year: number; month: number; day: number } | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// 0=Mon...6=Sun for first day of month
function firstDayOfMonth(year: number, month: number): number {
  const jsDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  return (jsDay + 6) % 7;
}

export default function DatePickerField({ value, onChange, placeholder }: DatePickerFieldProps) {
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const parsed = parseDate(value);
  const now = new Date();
  const [viewYear, setViewYear] = useState(parsed?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? now.getMonth() + 1);

  const displayText = value || placeholder || 'Tap to select date';

  const openPicker = () => {
    const p = parseDate(value);
    setViewYear(p?.year ?? now.getFullYear());
    setViewMonth(p?.month ?? now.getMonth() + 1);
    setOpen(true);
  };

  const goMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth, totalDays, startDay]);

  const selectedStr = value;
  const todayStr = toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());

  return (
    <>
      <Pressable
        style={[
          styles.trigger,
          { backgroundColor: c.glass.surface, borderColor: c.glass.border },
        ]}
        onPress={openPicker}
      >
        <Ionicons name="calendar-outline" size={14} color={value ? c.primary.main : c.text.tertiary} />
        <Text style={[
          styles.triggerText,
          { color: value ? c.text.primary : c.text.tertiary },
        ]}>
          {displayText}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: c.background.secondary, borderTopColor: c.border.light },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.header, { borderBottomColor: c.border.light }]}>
              <Text style={[styles.headerTitle, { color: c.text.primary }]}>Select Date</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={c.text.secondary} />
              </Pressable>
            </View>

            {/* Month nav */}
            <View style={styles.monthNav}>
              <Pressable onPress={() => goMonth(-1)} style={[styles.navBtn, { backgroundColor: c.glass.surface }]}>
                <Ionicons name="chevron-back" size={18} color={c.text.secondary} />
              </Pressable>
              <Text style={[styles.monthLabel, { color: c.text.primary }]}>{MONTH_LABELS[viewMonth - 1]} {viewYear}</Text>
              <Pressable onPress={() => goMonth(1)} style={[styles.navBtn, { backgroundColor: c.glass.surface }]}>
                <Ionicons name="chevron-forward" size={18} color={c.text.secondary} />
              </Pressable>
            </View>

            {/* Day headers */}
            <View style={styles.dayHeaderRow}>
              {DAY_LABELS.map((d) => (
                <View key={d} style={styles.dayHeaderCell}>
                  <Text style={[styles.dayHeaderText, { color: c.text.tertiary }]}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.grid}>
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <View key={`e-${idx}`} style={styles.dayCell} />;
                }
                const dateStr = toDateStr(viewYear, viewMonth, day);
                const isSelected = dateStr === selectedStr;
                const isToday = dateStr === todayStr;
                return (
                  <Pressable
                    key={dateStr}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: c.primary.main },
                      isToday && !isSelected && { borderWidth: 1, borderColor: c.primary.main },
                    ]}
                    onPress={() => { onChange(dateStr); setOpen(false); }}
                  >
                    <Text style={[
                      styles.dayText,
                      { color: c.text.secondary },
                      isSelected && { color: '#fff', fontWeight: '700' },
                      isToday && !isSelected && { color: c.primary.main, fontWeight: '700' },
                    ]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  triggerText: { fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { fontSize: 15, fontWeight: '700' },
  dayHeaderRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayHeaderText: { fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 8 },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    maxHeight: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  dayText: { fontSize: 14, fontWeight: '500' },
});
