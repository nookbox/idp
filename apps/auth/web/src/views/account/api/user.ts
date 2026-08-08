import { authClient } from '@/shared/api/auth-client';

export function updateUserName(name: string) {
  return authClient.updateUser({ name });
}

export function updateMarketingConsent(marketingConsent: boolean) {
  return authClient.updateUser({ marketingConsent });
}

export function changePassword(params: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions: boolean;
}) {
  return authClient.changePassword(params);
}
