/**
 * Shared API types
 */

export interface ApiError {
  message: string;
  code?: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
}
