import type { RouteRecordRaw } from "vue-router";


import Backdrop from "@/pages/model-list/detail-01/001-backdrop";
import BackdropArea from "@/pages/model-list/detail-01/002-backdrop-area";
import BackdropWater from "@/pages/model-list/detail-01/003-backdrop-water";
import DepthBuffer from "@/pages/model-list/detail-01/004-logarithmic-depth-buffer";
import ClearCoat from "@/pages/model-list/detail-01/005-clearcoat";
import ComputeAudio from "@/pages/model-list/detail-01/006-compute-audio";
import ComputeParticles from "@/pages/model-list/detail-01/007-compute-particles";
import ParticlesRain from "@/pages/model-list/detail-01/008-particles-rain";
import ParticlesSnow from "@/pages/model-list/detail-01/009-particles-snow";
import ComputePoints from "@/pages/model-list/detail-01/010-compute-points";

const routerList: RouteRecordRaw[] = [
  {
    path: '/list/compute-points',
    meta: {title: "计算点"},
    component: ComputePoints,
  },
  {
    path: '/list/particles-snow',
    meta: {title: "粒子雪"},
    component: ParticlesSnow,
  },
  {
    path: '/list/particles-rain',
    meta: {title: "粒子雨"},
    component: ParticlesRain,
  },
  {
    path: '/list/compute-particles',
    meta: {title: "计算粒子"},
    component: ComputeParticles,
  },
  {
    path: '/list/compute-audio',
    meta: {title: "计算音频"},
    component: ComputeAudio,
  },
  {
    path: '/list/clearcoat',
    meta: {title: "油漆"},
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