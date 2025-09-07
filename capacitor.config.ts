import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'PetbookApp',
  webDir: 'www',
  plugins: {
    Camera: {
      android: {
        useLegacy: true
      }
    },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
  },
};

export default config;
