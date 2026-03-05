import React from 'react';
import { Animated, Easing, TextStyle, StyleProp } from 'react-native';

interface AnimatedValueProps {
  value: number;
  formatter: (value: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
  testID?: string;
}

export default React.memo(function AnimatedValue({
  value,
  formatter,
  style,
  duration = 900,
  testID,
}: AnimatedValueProps) {
  const animatedRef = React.useRef(new Animated.Value(value));
  const formatterRef = React.useRef(formatter);
  formatterRef.current = formatter;

  const [displayText, setDisplayText] = React.useState<string>(() => formatter(value));
  const prevValueRef = React.useRef<number>(value);
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    const anim = animatedRef.current;
    const id = anim.addListener(({ value: v }) => {
      setDisplayText(formatterRef.current(v));
    });
    return () => {
      anim.removeListener(id);
    };
  }, []);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (prevValueRef.current === value) return;
    prevValueRef.current = value;

    animatedRef.current.stopAnimation();
    Animated.timing(animatedRef.current, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, duration]);

  return (
    <Animated.Text style={style} testID={testID}>
      {displayText}
    </Animated.Text>
  );
});
