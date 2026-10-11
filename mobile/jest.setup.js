/* eslint-env jest */
jest.mock('react-test-renderer/package.json', () => ({
  version: '19.2.3',
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, ScrollView } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      Text,
      ScrollView,
      createAnimatedComponent: (c) => c,
    },
    useSharedValue: (val) => ({ value: val }),
    useAnimatedStyle: (fn) => fn(),
    withSpring: (val) => val,
    withTiming: (val) => val,
    withSequence: (...anims) => anims[0] ?? 0,
    withDelay: (d, anim) => anim,
    withRepeat: (anim) => anim,
    interpolate: (val, input, output) => output[0] ?? 0,
    interpolateColor: (val, input, output) => output[0] ?? '#000',
    Easing: {
      bezier: () => () => 0,
      linear: () => 0,
      ease: () => 0,
      quad: () => 0,
      cubic: () => 0,
      out: (fn) => fn || (() => 0),
      in: (fn) => fn || (() => 0),
      inOut: (fn) => fn || (() => 0),
    },
    ...(() => {
      const createChain = () => {
        const chain = {
          delay: () => chain,
          duration: () => chain,
          springify: () => chain,
          damping: () => chain,
          stiffness: () => chain,
          mass: () => chain,
          easing: () => chain,
        };
        return chain;
      };
      return {
        FadeIn: createChain(),
        FadeInUp: createChain(),
        FadeInDown: createChain(),
        FadeOut: createChain(),
        SlideInUp: createChain(),
        SlideInDown: createChain(),
      };
    })(),
  };
});

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockIcon = (props) => <Text testID={`mock-icon-${props.name}`}>{props.name}</Text>;
  MockIcon.glyphMap = {};
  return MockIcon;
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children({ top: 44, bottom: 34, left: 0, right: 0 }),
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  },
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
}));

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, style }) => <View style={style}>{children}</View>,
  };
});

