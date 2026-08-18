import { AuthErrorLike, getAuthErrorMessage } from '@/shared/lib/auth-error';
import {
  SAVED_EMAIL_KEY,
  SIGNIN_ERROR_MESSAGES,
  SIGNIN_FALLBACK_ERROR,
} from './constants';

export function getSavedEmail(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SAVED_EMAIL_KEY) ?? '';
}

export function getErrorMessage(error?: AuthErrorLike | null): string {
  return getAuthErrorMessage(
    error,
    SIGNIN_FALLBACK_ERROR,
    SIGNIN_ERROR_MESSAGES,
  );
}

export function saveEmail(email: string) {
  localStorage.setItem(SAVED_EMAIL_KEY, email);
}

export function clearSavedEmail() {
  localStorage.removeItem(SAVED_EMAIL_KEY);
}
