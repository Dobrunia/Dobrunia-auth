import { createRouter, createWebHistory } from 'vue-router';
import { ROUTES } from '@/constants/app.constants';
import { tokenStorage } from '@/lib/token-storage';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: ROUTES.HOME,
      component: () => import('@/view/SessionsPage.vue'),
      meta: { requiresAuth: true },
    },
    { path: ROUTES.SESSIONS, redirect: ROUTES.HOME },
    {
      path: ROUTES.PROFILE,
      component: () => import('@/view/ProfilePage.vue'),
      meta: { requiresAuth: true },
    },
    { path: ROUTES.ACCOUNT, component: () => import('@/view/AccountSelectPage.vue') },
    { path: ROUTES.OAUTH_BRIDGE, component: () => import('@/view/OAuthBridgePage.vue') },
    { path: ROUTES.LOGIN, component: () => import('@/view/LoginPage.vue') },
    { path: ROUTES.REGISTER, component: () => import('@/view/RegisterPage.vue') },
    { path: ROUTES.OAUTH_CALLBACK, component: () => import('@/view/OAuthCallbackPage.vue') },
  ],
});

router.beforeEach((to) => {
  const authed = Boolean(tokenStorage.getAccess());

  if (to.meta.requiresAuth && !authed) {
    return {
      path: ROUTES.LOGIN,
      query: { returnTo: to.fullPath },
    };
  }

  if (
    authed &&
    (to.path === ROUTES.LOGIN || to.path === ROUTES.REGISTER) &&
    to.query.oauth !== '1'
  ) {
    return ROUTES.HOME;
  }

  if (authed && to.path === ROUTES.LOGIN && to.query.oauth === '1') {
    const raw = typeof to.query.return_url === 'string' ? to.query.return_url : '';
    if (raw) {
      return { path: ROUTES.OAUTH_BRIDGE, query: { return_url: raw } };
    }
  }

  return true;
});

export default router;
