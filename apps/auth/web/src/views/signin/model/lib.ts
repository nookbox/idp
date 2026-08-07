import { ERROR_MESSAGES, SAVED_EMAIL_KEY } from './constants';

export function getSavedEmail(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SAVED_EMAIL_KEY) ?? '';
}

export function getErrorMessage(message?: string): string {
  if (!message) return '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.';
  return (
    ERROR_MESSAGES[message] ??
    '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
  );
}

export function saveEmail(email: string) {
  localStorage.setItem(SAVED_EMAIL_KEY, email);
}

export function clearSavedEmail() {
  localStorage.removeItem(SAVED_EMAIL_KEY);
}
