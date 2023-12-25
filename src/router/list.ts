import type { RouteRecordRaw } from "vue-router";

import Welcome from "@/pages/welcome/index.vue";
import List from "@/pages/model-list/index.vue";

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
    children: [

    ]
  },
];

export default routes;
