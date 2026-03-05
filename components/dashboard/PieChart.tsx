import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import Colors from '@/constants/colors';

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  size?: number;
  innerRadius?: number;
  showLegend?: boolean;
  formatValue?: (value: number) => string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const spread = endAngle - startAngle;

  if (spread >= 359.999) {
    const mid = startAngle + spread / 2;
    const os = polarToCartesian(cx, cy, outerR, startAngle);
    const om = polarToCartesian(cx, cy, outerR, mid);
    const oe = polarToCartesian(cx, cy, outerR, startAngle + spread - 0.001);
    const is = polarToCartesian(cx, cy, innerR, startAngle);
    const im = polarToCartesian(cx, cy, innerR, mid);
    const ie = polarToCartesian(cx, cy, innerR, startAngle + spread - 0.001);
    return [
      `M ${os.x} ${os.y}`,
      `A ${outerR} ${outerR} 0 0 1 ${om.x} ${om.y}`,
      `A ${outerR} ${outerR} 0 0 1 ${oe.x} ${oe.y}`,
      `L ${ie.x} ${ie.y}`,
      `A ${innerR} ${innerR} 0 0 0 ${im.x} ${im.y}`,
      `A ${innerR} ${innerR} 0 0 0 ${is.x} ${is.y}`,
      'Z',
    ].join(' ');
  }

  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArc = spread > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

const PieChart = React.memo(function PieChart({
  data,
  size = 140,
  innerRadius = 0.55,
  showLegend = true,
  formatValue,
}: PieChartProps) {
  const total = React.useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const slices = React.useMemo(() => {
    if (total <= 0) return [];
    let currentAngle = 0;
    return data.map((item) => {
      const sweep = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sweep;
      currentAngle = endAngle;
      return { ...item, startAngle, endAngle, sweep, percentage: (item.value / total) * 100 };
    });
  }, [data, total]);

  if (total <= 0 || data.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR * innerRadius;
  const gap = data.length > 1 ? 1.5 : 0;

  return (
    <View style={pieStyles.wrapper}>
      <View style={pieStyles.chartRow}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={cx} cy={cy} r={outerR} fill={Colors.surface + '30'} />
          {slices.map((slice, i) => {
            const adjustedStart = slice.startAngle + (data.length > 1 ? gap / 2 : 0);
            const adjustedEnd = slice.endAngle - (data.length > 1 ? gap / 2 : 0);
            if (adjustedEnd <= adjustedStart) return null;
            const d = describeDonutSlice(cx, cy, outerR, innerR, adjustedStart, adjustedEnd);
            return <Path key={`slice-${i}`} d={d} fill={slice.color} />;
          })}
          <Circle cx={cx} cy={cy} r={innerR - 1} fill={Colors.backgroundCard} />
        </Svg>

        {showLegend && (
          <View style={pieStyles.legendContainer}>
            {slices.slice(0, 6).map((slice, i) => (
              <View key={`legend-${i}`} style={pieStyles.legendItem}>
                <View style={[pieStyles.legendDot, { backgroundColor: slice.color }]} />
                <View style={pieStyles.legendTextWrap}>
                  <Text style={pieStyles.legendLabel} numberOfLines={1}>
                    {slice.label}
                  </Text>
                  <Text style={pieStyles.legendValue}>
                    {slice.percentage.toFixed(1)}%
                    {formatValue ? ` · ${formatValue(slice.value)}` : ''}
                  </Text>
                </View>
              </View>
            ))}
            {data.length > 6 && (
              <Text style={pieStyles.legendMore}>+{data.length - 6} more</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

const pieStyles = StyleSheet.create({
  wrapper: {
    paddingBottom: 4,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  legendContainer: {
    flex: 1,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendTextWrap: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  legendValue: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  legendMore: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

export default PieChart;
