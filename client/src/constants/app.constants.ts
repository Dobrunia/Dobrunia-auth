/**
 * Frontend application constants
 */

import { clientConfig } from '../config';

export const APP_NAME = 'Dobrunia Auth';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  /** Выбор приложения (client) перед входом */
  ACCOUNT: '/account',
  SESSIONS: '/sessions',
  OAUTH_CALLBACK: '/oauth/callback',
} as const;

export const API_BASE_URL = clientConfig.apiUrl;
