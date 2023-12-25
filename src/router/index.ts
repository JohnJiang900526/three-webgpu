import { createRouter, createWebHashHistory } from 'vue-router';
import routes from "./list";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: routes
});

// 导航守卫
const title = "threejs-primary";
router.beforeEach((to, from, next) => {
  const str: string = (`${to.meta?.title || title}`);
  document.title = str;
  next();
});

export default router
