import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Pressable, Text, ScrollView } from 'react-native';
import { tva } from '@gluestack-ui/utils/nativewind-utils';

type SelectContextType = {
  value: string | undefined;
  setValue: (v?: string) => void;
  open: boolean;
  setOpen: (s: boolean) => void;
  register: (value: string, label: string) => void;
  options: Record<string, string>;
};

const SelectContext = createContext<SelectContextType | null>(null);

const triggerStyle = tva({ base: 'border rounded px-3 py-2 flex-row items-center' });
const inputStyle = tva({ base: 'flex-1 text-typography-900' });
const contentStyle = tva({ base: 'bg-white border rounded mt-2' });
const itemStyle = tva({ base: 'px-3 py-2' });
const backdropStyle = tva({ base: 'absolute inset-0 bg-black/30' });

export function Select({ children, selectedValue, defaultValue, onValueChange }: any) {
  const [value, setValue] = useState<string | undefined>(selectedValue ?? defaultValue ?? undefined);
  const [open, setOpen] = useState(false);
  const optionsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (selectedValue !== undefined) setValue(selectedValue);
  }, [selectedValue]);

  const setVal = (v?: string) => {
    setValue(v);
    onValueChange?.(v);
  };

  const ctx: SelectContextType = {
    value,
    setValue: setVal,
    open,
    setOpen,
    register: (val, label) => { optionsRef.current[val] = label; },
    options: optionsRef.current,
  };

  return <SelectContext.Provider value={ctx}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ children, className, ...props }: any) {
  const ctx = useContext(SelectContext)!;
  return (
    <Pressable onPress={(e: any) => { e.stopPropagation?.(); ctx.setOpen(!ctx.open); }} className={triggerStyle({ class: className })} {...props}>
      {children}
    </Pressable>
  );
}

export function SelectInput({ placeholder, className }: any) {
  const ctx = useContext(SelectContext)!;
  const label = ctx.value ? (ctx.options[ctx.value] ?? ctx.value) : '';
  return <Text className={inputStyle({ class: className })}>{label || placeholder}</Text>;
}

export function SelectIcon({ as: Icon, className, ...props }: any) {
  if (!Icon) return null;
  // forward className and other props to the icon component so PrimitiveIcon
  // can access expected style/className values
  return <Icon className={className} {...props} />;
}

export function SelectPortal({ children }: any) {
  const ctx = useContext(SelectContext)!;
  if (!ctx.open) return null;
  return <>{children}</>;
}

export function SelectBackdrop() {
  const ctx = useContext(SelectContext)!;
  return <Pressable className={backdropStyle({})} onPress={() => ctx.setOpen(false)} />;
}

export function SelectContent({ children, className }: any) {
  return (
    <ScrollView className={contentStyle({ class: className })} style={{ maxHeight: 220 }}>
      {children}
    </ScrollView>
  );
}

export function SelectDragIndicatorWrapper({ children }: any) {
  return <View className="items-center">{children}</View>;
}

export function SelectDragIndicator() {
  return <View className="w-12 h-1 rounded bg-gray-300 my-2" />;
}

export function SelectItem({ label, value, isDisabled }: any) {
  const ctx = useContext(SelectContext)!;
  return (
    <Pressable disabled={isDisabled} onPress={() => { if (!isDisabled) { ctx.setValue(String(value)); ctx.setOpen(false); } }} className={itemStyle({})}>
      <Text className={`text-typography-900 ${isDisabled ? 'opacity-40' : ''}`}>{label}</Text>
    </Pressable>
  );
}

export { Select as default };
