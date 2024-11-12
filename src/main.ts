import { createApp } from 'vue'
import { createPinia } from 'pinia';
import persistedstate from 'pinia-plugin-persistedstate'
import router from './router';

import App from './App.vue'
import '@/common/style/index.less';

const pinia = createPinia();
const app = createApp(App);
pinia.use(persistedstate);

app.use(pinia);
app.use(router);

app.config.warnHandler = () => {
  return false;
}

app.mount('#app');
