import { authClient } from '@/shared/api/auth-client';

export function logout() {
  return authClient.signOut();
}
