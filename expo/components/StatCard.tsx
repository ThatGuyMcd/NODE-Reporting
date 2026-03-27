import React from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface StatCardProps {
  title: string;
  value?: string;
  valueNumber?: number;
  valueFormatter?: (value: number) => string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  testID?: string;
}

export default function StatCard({
  title,
  value,
  valueNumber,
  valueFormatter,
  subtitle,
  icon: Icon,
  iconColor = Colors.primary,
  trend,
  testID,
}: StatCardProps) {
  const numericValue = React.useMemo(() => {
    if (valueNumber === undefined || valueNumber === null) return undefined;
    if (!Number.isFinite(valueNumber)) return undefined;
    return valueNumber;
  }, [valueNumber]);

  const animatedRef = React.useRef(new Animated.Value(numericValue ?? 0));
  const formatterRef = React.useRef(valueFormatter);
  formatterRef.current = valueFormatter;

  const [displayText, setDisplayText] = React.useState<string>(() => {
    if (numericValue !== undefined && valueFormatter) {
      return valueFormatter(numericValue);
    }
    return value ?? '';
  });

  const prevValueRef = React.useRef<number>(numericValue ?? 0);
  const isFirstRender = React.useRef(true);

  const isNumeric = numericValue !== undefined;

  React.useEffect(() => {
    if (!isNumeric) return;

    const anim = animatedRef.current;
    const id = anim.addListener(({ value: v }) => {
      if (formatterRef.current) {
        setDisplayText(formatterRef.current(v));
      }
    });
    return () => {
      anim.removeListener(id);
    };
  }, [isNumeric]);

  React.useEffect(() => {
    if (numericValue === undefined) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (prevValueRef.current === numericValue) return;
    prevValueRef.current = numericValue;

    animatedRef.current.stopAnimation();
    Animated.timing(animatedRef.current, {
      toValue: numericValue,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [numericValue]);

  React.useEffect(() => {
    if (numericValue === undefined && value !== undefined) {
      setDisplayText(value);
    }
  }, [numericValue, value]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Icon size={18} color={iconColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text
        testID={testID ? `${testID}-value` : undefined}
        style={[
          styles.value,
          trend === 'up' && styles.valueUp,
          trend === 'down' && styles.valueDown,
        ]}
      >
        {displayText}
      </Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    flex: 1,
    minWidth: 150,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    flex: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  valueUp: {
    color: Colors.success,
  },
  valueDown: {
    color: Colors.danger,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
