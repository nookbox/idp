import { authClient } from '@/shared/api/auth-client';

export type Consent = {
  id: string;
  clientId: string;
  scopes: string[];
  createdAt?: string | null;
};

export async function fetchConsents() {
  const { data, error } = await authClient.$fetch('/oauth2/get-consents');
  return { data: data as Consent[] | null, error };
}

export function deleteConsent(id: string) {
  return authClient.$fetch('/oauth2/delete-consent', {
    method: 'POST',
    body: { id },
  });
}
