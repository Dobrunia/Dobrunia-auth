/**
 * Frontend application constants
 */

import { clientConfig } from '../config';

export const APP_NAME = 'Dobrunia Auth';

export const ROUTES = {
  /** Дашборд: список сессий (требует входа) */
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  /** Только для OAuth: выбор client / аккаунта из уже известных входов */
  ACCOUNT: '/account',
  /** Профиль: имя, ник, аватар, удаление аккаунта */
  PROFILE: '/profile',
  /** Старый путь; редирект на HOME */
  SESSIONS: '/sessions',
  OAUTH_CALLBACK: '/oauth/callback',
} as const;

export const API_BASE_URL = clientConfig.apiUrl;
