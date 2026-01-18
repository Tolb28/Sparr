import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';

export type CalendarEvent = {
  color?: string;
};

export type WeeklyCalendarProps = {
  initialDate?: Date | string;
  recenterOnSelect?: boolean;
  events?: Record<string, CalendarEvent>;
  onSelect?: (date: Date) => void;
};

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  initialDate,
  recenterOnSelect = false,
  events = {},
  onSelect = () => {},
}) => {
  const today = useMemo(() => new Date(), []);
  const centerDate = initialDate ?? today;

  const [selected, setSelected] = useState<string>(() =>
    normalizeDate(centerDate)
  );

  const [weekDates, setWeekDates] = useState<Date[]>(() =>
    getCenteredWeekDates(centerDate)
  );

  useEffect(() => {
    const iso = normalizeDate(centerDate);
    setSelected(iso);
    setWeekDates(getCenteredWeekDates(centerDate));
  }, [centerDate]);

  const handlePress = (date: Date) => {
    const iso = formatLocalISO(date);
    setSelected(iso);
    onSelect(new Date(date));

    if (recenterOnSelect) {
      setWeekDates(getCenteredWeekDates(date));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {weekDates.map((d) => {
          const iso = formatLocalISO(d);
          const isSelected = iso === selected;
          const hasEvent = !!events[iso];

          return (
            <Pressable
              key={iso}
              onPress={() => handlePress(d)}
              style={[
                styles.dayCard,
                isSelected ? styles.selectedCard : styles.unselectedCard,
              ]}
            >
              <Text style={[styles.weekdayText, isSelected && styles.textWhite]}>
                {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </Text>

              <Text style={[styles.dayNumber, isSelected && styles.textWhite]}>
                {d.getDate()}
              </Text>

              {hasEvent && (
                <View 
                  style={[
                    styles.dot, 
                    { backgroundColor: events[iso]?.color || '#06b6d4' },
                    isSelected && { backgroundColor: '#ffffff' } // White dot on blue background
                  ]} 
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseToLocalDate(d: Date | string): Date {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(d);
}

function formatLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDate(d: Date | string): string {
  const date = parseToLocalDate(d);
  date.setHours(0, 0, 0, 0);
  return formatLocalISO(date);
}

function getCenteredWeekDates(center: Date | string): Date[] {
  const base = parseToLocalDate(center);
  base.setHours(0, 0, 0, 0);
  const start = new Date(base);
  start.setDate(base.getDate() - 3);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', // Spreads days evenly across screen
    paddingHorizontal: 8,
  },
  dayCard: {
    flex: 1, // Each card takes exactly 1/7th of the available width
    marginHorizontal: 2,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 70,
  },
  unselectedCard: {
    backgroundColor: 'transparent',
  },
  selectedCard: {
    backgroundColor: '#2563eb', // Standard Blue from your screenshot
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  weekdayText: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  textWhite: {
    color: '#ffffff',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    position: 'absolute',
    bottom: 8,
  },
});

export default WeeklyCalendar;