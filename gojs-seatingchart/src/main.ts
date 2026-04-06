import './assets/main.css';

import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';

const app = createApp(App);
const router = createRouter({
  routes: [],
  history: createWebHistory()
});
const pinia = createPinia();

app.use(router);
app.use(pinia);
app.use(ui);
app.mount('#app');
