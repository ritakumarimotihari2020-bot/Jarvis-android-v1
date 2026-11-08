import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jarvis.markvii',
  appName: 'JARVIS Mark VII',
  webDir: 'dist',
  server: {
    // JARVIS backend must be running in Termux on this same Android device.
    url: 'http://127.0.0.1:3000',
    cleartext: true
  }
};

export default config;
