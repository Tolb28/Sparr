import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/src/hooks/useThemeColors';

type TabItem = string | { key: string; label: string };

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  scrollable?: boolean;
  appearance?: 'underline' | 'segmented';
  style?: object;
}

function getKey(tab: TabItem): string {
  return typeof tab === 'string' ? tab : tab.key;
}
function getLabel(tab: TabItem): string {
  return typeof tab === 'string' ? tab : tab.label;
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
  scrollable = false,
  appearance = 'underline',
  style,
}: TabBarProps) {
  const c = useThemeColors();
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
                  style={[
                    styles.tab,
                    styles.tabFixed,
                    appearance === 'segmented' && { marginHorizontal: 4, marginTop: 4, borderRadius: 12, borderWidth: 1, borderColor: c.glass.border, backgroundColor: c.glass.surface, paddingVertical: 9 },
                    key === activeTab && appearance === 'segmented' && { backgroundColor: c.glass.redSurface, borderColor: c.glass.redBorder },
                  ]}
                >
                  <Text style={[styles.tabText, key === activeTab ? { color: c.text.primary, fontWeight: '700' } : { color: c.text.tertiary, fontWeight: '500' }]}>
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
                style={[
                  styles.tab,
                  styles.tabFlex,
                  appearance === 'segmented' && { marginHorizontal: 4, marginTop: 4, borderRadius: 12, borderWidth: 1, borderColor: c.glass.border, backgroundColor: c.glass.surface, paddingVertical: 9 },
                  key === activeTab && appearance === 'segmented' && { backgroundColor: c.glass.redSurface, borderColor: c.glass.redBorder },
                ]}
              >
                <Text style={[styles.tabText, key === activeTab ? { color: c.text.primary, fontWeight: '700' } : { color: c.text.tertiary, fontWeight: '500' }]}>
                  {getLabel(tab)}
                </Text>
              </Pressable>
            );
          })}
          {appearance === 'underline' && (
            <View pointerEvents="none" style={[styles.indicator, { left: indicatorLeft, width: tabWidth, backgroundColor: c.primary.main }]} />
          )}
        </View>
      )}
      {appearance === 'underline' ? <View style={[styles.bottomBorder, { backgroundColor: c.border.light }]} /> : null}
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
  indicator: { position: 'absolute', left: 0, bottom: 1, height: 2, borderRadius: 2 },
  bottomBorder: { height: 1 },
});

export default TabBar;
