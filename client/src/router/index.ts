import { createRouter, createWebHistory } from 'vue-router';
import { ROUTES } from '@/constants/app.constants';
import { tokenStorage } from '@/lib/token-storage';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: ROUTES.HOME, component: () => import('@/view/HomePage.vue') },
    { path: ROUTES.ACCOUNT, component: () => import('@/view/AccountSelectPage.vue') },
    { path: ROUTES.LOGIN, component: () => import('@/view/LoginPage.vue') },
    { path: ROUTES.REGISTER, component: () => import('@/view/RegisterPage.vue') },
    {
      path: ROUTES.SESSIONS,
      component: () => import('@/view/SessionsPage.vue'),
      meta: { requiresAuth: true },
    },
    { path: ROUTES.OAUTH_CALLBACK, component: () => import('@/view/OAuthCallbackPage.vue') },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !tokenStorage.getAccess()) {
    return {
      path: ROUTES.LOGIN,
      query: { returnTo: to.fullPath },
    };
  }
  return true;
});

export default router;
