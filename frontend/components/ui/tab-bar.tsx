import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { colors } from '@/src/theme/colors';

type TabItem = string | { key: string; label: string };

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  scrollable?: boolean;
  style?: object;
}

function getKey(tab: TabItem): string {
  return typeof tab === 'string' ? tab : tab.key;
}
function getLabel(tab: TabItem): string {
  return typeof tab === 'string' ? tab : tab.label;
}

export function TabBar({ tabs, activeTab, onTabChange, scrollable = false, style }: TabBarProps) {
  const [containerWidth, setContainerWidth] = useState(0);

  const tabCount = tabs.length;
  const tabWidth = containerWidth > 0 && tabCount > 0 ? containerWidth / tabCount : 0;
  const activeIndex = Math.max(0, tabs.findIndex((t) => getKey(t) === activeTab));
  const indicatorLeft = activeIndex * tabWidth;

  const handleTabPress = useCallback(
    (key: string) => onTabChange(key),
    [onTabChange],
  );

  return (
    <View style={[styles.wrapper, style]}>
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.row}>
            {tabs.map((tab) => {
              const key = getKey(tab);
              return (
                <Pressable
                  key={key}
                  onPress={() => handleTabPress(key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: key === activeTab }}
                  style={[styles.tab, styles.tabFixed]}
                >
                  <Text style={[styles.tabText, key === activeTab ? styles.tabActive : styles.tabInactive]}>
                    {getLabel(tab)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View
          style={styles.row}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {tabs.map((tab) => {
            const key = getKey(tab);
            return (
              <Pressable
                key={key}
                onPress={() => handleTabPress(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: key === activeTab }}
                style={[styles.tab, styles.tabFlex]}
              >
                <Text style={[styles.tabText, key === activeTab ? styles.tabActive : styles.tabInactive]}>
                  {getLabel(tab)}
                </Text>
              </Pressable>
            );
          })}
          <View pointerEvents="none" style={[styles.indicator, { left: indicatorLeft, width: tabWidth }]} />
        </View>
      )}
      <View style={styles.bottomBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  row: { flexDirection: 'row' },
  tab: { paddingVertical: 13, alignItems: 'center' },
  tabFlex: { flex: 1 },
  tabFixed: { width: 110, paddingHorizontal: 16 },
  tabText: { fontSize: 14, letterSpacing: 0.2 },
  tabActive: { color: colors.text.primary, fontWeight: '700' },
  tabInactive: { color: colors.text.tertiary, fontWeight: '500' },
  indicator: { position: 'absolute', left: 0, bottom: 1, height: 2, backgroundColor: colors.primary.main, borderRadius: 2 },
  bottomBorder: { height: 1, backgroundColor: colors.border.light },
});

export default TabBar;
