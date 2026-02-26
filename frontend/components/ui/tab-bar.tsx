import React, { useRef, useLayoutEffect, useState } from 'react';
import { View, Pressable, Animated, StyleSheet, ScrollView } from 'react-native';
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
  const activeIndex = Math.max(0, tabs.findIndex((t) => getKey(t) === activeTab));
  const [containerWidth, setContainerWidth] = useState(0);

  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);

  // Position indicator: math-based (each flex:1 tab = containerWidth / tabs.length)
  useLayoutEffect(() => {
    if (containerWidth === 0 || tabs.length === 0) return;
    const tabWidth = containerWidth / tabs.length;
    const targetLeft = activeIndex * tabWidth;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      indicatorLeft.setValue(targetLeft);
      indicatorWidth.setValue(tabWidth);
    } else {
      Animated.parallel([
        Animated.timing(indicatorLeft, { toValue: targetLeft, useNativeDriver: false, duration: 180 }),
        Animated.timing(indicatorWidth, { toValue: tabWidth, useNativeDriver: false, duration: 180 }),
      ]).start();
    }
  }, [activeIndex, containerWidth, tabs.length]);

  const tabItems = tabs.map((tab) => {
    const key = getKey(tab);
    const label = getLabel(tab);
    const isActive = key === activeTab;
    return (
      <Pressable
        key={key}
        onPress={() => onTabChange(key)}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: isActive }}
        style={[styles.tab, scrollable ? styles.tabFixed : styles.tabFlex]}
      >
        <Text style={[styles.tabText, isActive ? styles.tabActive : styles.tabInactive]}>
          {label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View style={[styles.wrapper, style]}>
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.row}>{tabItems}</View>
        </ScrollView>
      ) : (
        <View
          style={styles.row}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {tabItems}
          {containerWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[styles.indicator, { left: indicatorLeft, width: indicatorWidth }]}
            />
          )}
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
  indicator: { position: 'absolute', bottom: 1, height: 2, backgroundColor: colors.primary.main, borderRadius: 2 },
  bottomBorder: { height: 1, backgroundColor: colors.border.light },
});

export default TabBar;
