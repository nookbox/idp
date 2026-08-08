import { authClient } from '@/shared/api/auth-client';

export type SessionItem = {
  id: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  updatedAt: Date | string;
};

export async function fetchSessions() {
  const { data, error } = await authClient.listSessions();
  return { data: data as SessionItem[] | null, error };
}

export function revokeSession(token: string) {
  return authClient.revokeSession({ token });
}
