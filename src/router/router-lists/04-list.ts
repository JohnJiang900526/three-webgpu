import type { RouteRecordRaw } from "vue-router";


import Materials from "@/pages/model-list/detail-04/031-materials";
import MaterialsVideo from "@/pages/model-list/detail-04/032-materials-video";
import MaterialxNoise from "@/pages/model-list/detail-04/033-materialx-noise";
import RenderTargets from "@/pages/model-list/detail-04/034-render-targets";
import MorphTargets from "@/pages/model-list/detail-04/035-morph-targets";
import MorphTargetsFace from "@/pages/model-list/detail-04/036-morph-targets-face";
import WebgpuOcclusion from "@/pages/model-list/detail-04/037-webgpu-occlusion";
import WebgpuParticles from "@/pages/model-list/detail-04/038-webgpu-particles";
import WebgpuPortal from "@/pages/model-list/detail-04/039-webgpu-portal";
import WebgpuRtt from "@/pages/model-list/detail-04/040-webgpu-rtt";

const routerList: RouteRecordRaw[] = [
  {
    path: '/list/materials',
    meta: {title: "materials 材料"},
    component: Materials,
  },
  {
    path: '/list/materials-video',
    meta: {title: "materials-video 视频材料"},
    component: MaterialsVideo,
  },
  {
    path: '/list/materialx-noise',
    meta: {title: "materialx-noise 噪音矩阵"},
    component: MaterialxNoise,
  },
  {
    path: '/list/render-targets',
    meta: {title: "render-targets 渲染目标"},
    component: RenderTargets,
  },
  {
    path: '/list/morph-targets',
    meta: {title: "morph-targets 变形目标"},
    component: MorphTargets,
  },

  {
    path: '/list/morph-targets-face',
    meta: {title: "morph-targets-face 变形目标脸"},
    component: MorphTargetsFace,
  },
  {
    path: '/list/webgpu-occlusion',
    meta: {title: "webgpu-occlusion 闭塞"},
    component: WebgpuOcclusion,
  },
  {
    path: '/list/webgpu-particles',
    meta: {title: "webgpu-particles 粒子"},
    component: WebgpuParticles,
  },
  {
    path: '/list/webgpu-portal',
    meta: {title: "webgpu-portal 门户"},
    component: WebgpuPortal,
  },
  {
    path: '/list/webgpu-rtt',
    meta: {title: "webgpu-rtt RTT文件"},
    component: WebgpuRtt,
  },
];

export default routerList.reverse();