import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kprents.app',
  appName: 'KP-Rents',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Capacitor serves the bundled assets through this virtual HTTPS host.
    // It keeps Android-issued Neon Auth invitation links on the public,
    // trusted web origin instead of the unreachable https://localhost host.
    hostname: 'rainbow-babka-303510.netlify.app',
  },
};

export default config;
