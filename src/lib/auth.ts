import { createAuthClient } from '@neondatabase/neon-js/auth';
import { runtimeConfig } from './config';

export const authClient = createAuthClient(runtimeConfig.authUrl);

export async function getAccessToken() {
  const result = await authClient.token();
  if (result.error) throw new Error(result.error.message);
  const token = result.data?.token;
  if (!token) throw new Error('Your sign-in session has expired. Please sign in again.');
  return token;
}

export function makeOrganizationSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 42) || 'kp-rents';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}
