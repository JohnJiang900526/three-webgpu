import type { RouteRecordRaw } from "vue-router";


import Backdrop from "@/pages/model-list/detail-01/001-backdrop/index.vue";
import BackdropArea from "@/pages/model-list/detail-01/002-backdrop-area/index.vue";
import BackdropWater from "@/pages/model-list/detail-01/003-backdrop-water/index.vue";
import DepthBuffer from "@/pages/model-list/detail-01/004-logarithmic-depth-buffer/index.vue";
import ClearCoat from "@/pages/model-list/detail-01/005-clearcoat/index.vue";


const routerList: RouteRecordRaw[] = [
  {
    path: '/list/clearcoat',
    meta: {title: "实验确定"},
    component: ClearCoat,
  },
  {
    path: '/list/logarithmic-depth-buffer',
    meta: {title: "对数深度缓冲"},
    component: DepthBuffer,
  },
  {
    path: '/list/backdrop-water',
    meta: {title: "backdrop 背景水"},
    component: BackdropWater,
  },
  {
    path: '/list/backdrop-area',
    meta: {title: "backdrop 背景区域"},
    component: BackdropArea,
  },
  {
    path: '/list/backdrop',
    meta: {title: "backdrop 背景"},
    component: Backdrop,
  },
];

export default routerList;