import { createRouter, createWebHistory } from 'vue-router';
import { tokens } from '@/lib/tokens';

export const ROUTES = {
  home: '/',
  login: '/login',
  oauthCallback: '/oauth/callback',
} as const;

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: ROUTES.home,
      component: () => import('@/views/ProtectedView.vue'),
      meta: { requiresAuth: true },
    },
    { path: ROUTES.login, component: () => import('@/views/LoginView.vue') },
    { path: ROUTES.oauthCallback, component: () => import('@/views/OAuthCallbackView.vue') },
  ],
});

router.beforeEach((to) => {
  const authed = Boolean(tokens.getAccess());

  if (to.meta.requiresAuth && !authed) {
    return { path: ROUTES.login, query: { returnTo: to.fullPath } };
  }

  if (authed && to.path === ROUTES.login) {
    return ROUTES.home;
  }

  return true;
});

export default router;
