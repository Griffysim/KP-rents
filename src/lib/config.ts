const authUrl = import.meta.env.VITE_NEON_AUTH_URL ?? 'https://ep-tiny-voice-b2nahkm4.neonauth.c-6.eu-central-1.aws.neon.tech/neondb/auth';
const apiUrl = (import.meta.env.VITE_KP_RENTS_API_URL
  ?? 'https://br-wandering-lab-b2e1soj8-kprentsapi.compute.c-6.eu-central-1.aws.neon.tech').replace(/\/$/, '');

export const runtimeConfig = {
  authUrl,
  apiUrl,
  isApiConfigured: Boolean(apiUrl),
};
