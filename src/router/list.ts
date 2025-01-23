import type { RouteRecordRaw } from "vue-router";

import Welcome from "@/pages/welcome/index.vue";
import List from "@/pages/model-list/index.vue";

import routerList01 from "@/router/router-lists/01-list";
import routerList02 from "@/router/router-lists/02-list";
import routerList03 from "@/router/router-lists/03-list";
import routerList04 from "@/router/router-lists/04-list";
import routerList05 from "@/router/router-lists/05-list";
import routerList06 from "@/router/router-lists/06-list";

export const routerList = [
  ...routerList01,
  ...routerList02,
];

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Welcome',
    meta: { title: "欢迎来到我的首页" },
    component: Welcome
  },
  {
    path: '/list',
    name: 'List',
    meta: { title: "模型列表" },
    component: List,
    children: routerList,
  },
];

export default routes;
