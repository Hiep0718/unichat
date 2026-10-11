import { useEffect } from 'react';
import {
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  SharedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import { animation } from './tokens';

/**
 * Staggered entrance animation — opacity + translateY.
 * Returns shared values to drive entering={} or animated style.
 * @param index - item index in a list for stagger delay
 * @param delay - base delay before animation starts
 */
export function useEntrance(index = 0, delay = 0): {
  opacity: SharedValue<number>;
  translateY: SharedValue<number>;
} {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    const totalDelay = delay + index * animation.staggerDelay;
    opacity.value = withDelay(
      totalDelay,
      withTiming(1, { duration: animation.durationMedium, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      totalDelay,
      withSpring(0, animation.springSmooth),
    );
  }, [delay, index, opacity, translateY]);

  return { opacity, translateY };
}

/**
 * Micro-bounce scale for press interactions.
 * Call `pressIn()` on press start, `pressOut()` on release.
 */
export function useMicroBounce(scaleDown = 0.96): {
  scale: SharedValue<number>;
  pressIn: () => void;
  pressOut: () => void;
} {
  const scale = useSharedValue(1);

  const pressIn = () => {
    'worklet';
    scale.value = withTiming(scaleDown, { duration: animation.durationFast });
  };

  const pressOut = () => {
    'worklet';
    scale.value = withSpring(1, animation.springBouncy);
  };

  return { scale, pressIn, pressOut };
}

/**
 * Animated shimmer sweep — translateX oscillation for specular highlights.
 * Returns a shared value representing horizontal offset.
 * @param width - total sweep distance
 * @param duration - one sweep cycle duration in ms
 */
export function useShimmer(width = 200, duration = 4000): SharedValue<number> {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    translateX.value = withRepeat(
      withSequence(
        withTiming(width, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(-width, { duration: 0 }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(translateX);
    };
  }, [translateX, width, duration]);

  return translateX;
}

/**
 * Breathing scale pulse for ambient elements (orbs, glows).
 * @param minScale - minimum scale in breath cycle
 * @param maxScale - maximum scale in breath cycle
 * @param duration - one full breath cycle in ms
 */
export function useBreathingScale(
  minScale = 1.0,
  maxScale = 1.06,
  duration = 3000,
): SharedValue<number> {
  const scale = useSharedValue(minScale);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    scale.value = withRepeat(
      withSequence(
        withTiming(maxScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(minScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(scale);
    };
  }, [scale, minScale, maxScale, duration]);

  return scale;
}

/**
 * Pulsing opacity for glow effects.
 * @param minOpacity - minimum opacity
 * @param maxOpacity - maximum opacity
 * @param duration - one pulse cycle in ms
 */
export function useGlowPulse(
  minOpacity = 0.2,
  maxOpacity = 0.45,
  duration = 2500,
): SharedValue<number> {
  const opacity = useSharedValue(minOpacity);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(maxOpacity, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(minOpacity, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity, minOpacity, maxOpacity, duration]);

  return opacity;
}
