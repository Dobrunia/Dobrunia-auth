import { clearTokens } from '../api/request';
import { ROUTES } from '../../constants/app.constants';

/**
 * Logout current session and clear local state
 * Server is the single source of truth - tokens are only cleared on successful server response
 */
export async function logout(redirectTo: string = ROUTES.LOGIN): Promise<void> {
  try {
    // Call logout endpoint to revoke session on server
    const { request } = await import('../api/request');
    
    await request('/auth/logout', {
      method: 'POST',
      requiresAuth: true,
      skipRefresh: true,
    });
    
    // Only clear tokens if server responded successfully
    clearTokens();
    
    // Redirect
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  } catch (error) {
    // Don't clear tokens on error - server is source of truth
    // User might still have a valid session
    console.error('Logout error:', error);
    throw error; // Re-throw to let caller handle
  }
}

/**
 * Logout all sessions and clear local state
 * Server is the single source of truth - tokens are only cleared on successful server response
 */
export async function logoutAll(redirectTo: string = ROUTES.LOGIN): Promise<void> {
  try {
    // Call logout-all endpoint to revoke all sessions
    const { request } = await import('../api/request');
    
    await request('/auth/logout-all', {
      method: 'POST',
      requiresAuth: true,
      skipRefresh: true,
    });
    
    // Only clear tokens if server responded successfully
    clearTokens();
    
    // Redirect
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  } catch (error) {
    // Don't clear tokens on error - server is source of truth
    // User might still have a valid session
    console.error('Logout all error:', error);
    throw error; // Re-throw to let caller handle
  }
}
