import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import { ROUTES } from './constants/app.constants';

const routes = [
  { path: '/', name: 'home', redirect: ROUTES.LOGIN },
  {
    path: ROUTES.REGISTER,
    name: 'register',
    component: () => import('./features/auth/register/register.page.vue'),
  },
  {
    path: ROUTES.LOGIN,
    name: 'login',
    component: () => import('./features/auth/login/login.page.vue'),
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('./features/dashboard/dashboard.page.vue'),
  },
  {
    path: '/dashboard/services',
    name: 'dashboard-services',
    component: () => import('./features/dashboard/services.page.vue'),
  },
  {
    path: '/callback',
    name: 'oauth-callback',
    component: () => import('./features/oauth/callback.page.vue'),
  },
  {
    path: '/admin/clients',
    name: 'admin-clients',
    component: () => import('./features/admin/clients/clients-list.page.vue'),
  },
  {
    path: '/admin/clients/new',
    name: 'admin-client-create',
    component: () => import('./features/admin/clients/client-form.page.vue'),
  },
  {
    path: '/admin/clients/:id',
    name: 'admin-client-edit',
    component: () => import('./features/admin/clients/client-form.page.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app');
