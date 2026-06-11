import React from 'react';
import { Text as RNText, TextStyle } from 'react-native';
import { MAX_FONT_SCALE } from '@/src/utils/typography';

interface TabLabelProps {
  children: string;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
}

const TabLabel = React.forwardRef<RNText, TabLabelProps>(
  ({ children, isActive, activeColor, inactiveColor }, ref) => {
    // Explicitly determine which color to use
    const textColor = isActive ? activeColor : inactiveColor;
    const textWeight = isActive ? '700' : '600';
    
    const style: TextStyle = {
      fontSize: 13,
      fontWeight: textWeight,
      color: textColor,
    };

    return (
      <RNText
        ref={ref}
        style={style}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
      >
        {children}
      </RNText>
    );
  }
);

TabLabel.displayName = 'TabLabel';

export default TabLabel;
