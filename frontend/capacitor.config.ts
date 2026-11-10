import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.controlmt.app',
  appName: 'Control MT',
  webDir: 'dist',
  server: {
    cleartext: true
  }
};

export default config;
