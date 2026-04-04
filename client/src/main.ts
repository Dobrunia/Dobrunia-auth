import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import faviconUrl from './assets/favicon.svg?url';

const link = document.createElement('link');
link.rel = 'icon';
link.type = 'image/svg+xml';
link.href = faviconUrl;
document.head.appendChild(link);

const app = createApp(App);
app.use(router);
app.mount('#app');
