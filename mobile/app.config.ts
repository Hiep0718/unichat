import { ExpoConfig, ConfigContext } from 'expo/config';

const APP_ENV = process.env.APP_ENV || 'development';

const envMap = {
  development: {
    name: 'UniChat (Dev)',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8082',
  },
  staging: {
    name: 'UniChat (Staging)',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://staging-api.unichat.vn',
  },
  production: {
    name: 'UniChat',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.unichat.vn',
  },
} as const;

export default ({ config }: ConfigContext): ExpoConfig => {
  const currentEnv = envMap[APP_ENV as keyof typeof envMap] || envMap.development;

  return {
    ...config,
    name: currentEnv.name,
    slug: 'unichat',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'unichat',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'vn.unichat.mobile',
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true, // Cho phép kết nối dev HTTP trên mạng LAN
        },
      },
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#F9F9FF',
          image: './assets/images/splash-icon.png',
          imageWidth: 120,
        },
      ],
      'expo-font',
      'expo-secure-store',
    ],
    extra: {
      apiBaseUrl: currentEnv.apiBaseUrl,
      appEnv: APP_ENV,
      eas: {
        projectId: '00000000-0000-0000-0000-000000000000',
      },
    },
  };
};
