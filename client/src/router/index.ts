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

  if (authed && (to.path === ROUTES.LOGIN || to.path === ROUTES.REGISTER)) {
    return ROUTES.HOME;
  }

  return true;
});

export default router;
