import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import { ROUTES } from './constants/app.constants';

const routes = [
  {
    path: '/',
    name: 'home',
    component: { template: '<div>Home</div>' },
  },
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
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app');
