import type { RouteRecordRaw } from "vue-router";


import VideoPanorama from "@/pages/model-list/detail-06/051-video-panorama";
import WebaudioOrientation from "@/pages/model-list/detail-06/052-webaudio-orientation";
import WebaudioSandbox from "@/pages/model-list/detail-06/053-webaudio-sandbox";
import WebgpuSkinning from "@/pages/model-list/detail-06/054-webgpu-skinning";
import WebaudioTiming from "@/pages/model-list/detail-06/055-webaudio-timing";
import WebaudioVisualizer from "@/pages/model-list/detail-06/056-webaudio-visualizer";
import ArCones from "@/pages/model-list/detail-06/057-ar-cones";
import ArLighting from "@/pages/model-list/detail-06/058-ar-lighting";
import ArPlaneDetection from "@/pages/model-list/detail-06/059-ar-plane-detection";
import VrHandinput from "@/pages/model-list/detail-06/060-vr-handinput";

const routerList: RouteRecordRaw[] = [
  {
    path: '/list/video-panorama',
    meta: {title: "video-panorama 视频全景"},
    component: VideoPanorama,
  },
  {
    path: '/list/webaudio-orientation',
    meta: {title: "webaudio-orientation 音频方向"},
    component: WebaudioOrientation,
  },
  {
    path: '/list/webaudio-sandbox',
    meta: {title: "webaudio-sandbox 音频沙箱"},
    component: WebaudioSandbox,
  },
  {
    path: '/list/webgpu-skinning',
    meta: {title: "webgpu-skinning 油漆"},
    component: WebgpuSkinning,
  },
  {
    path: '/list/webaudio-timing',
    meta: {title: "webaudio-timing 音频时间"},
    component: WebaudioTiming,
  },

  {
    path: '/list/webaudio-visualizer',
    meta: {title: "webaudio-visualizer 音频观察仪"},
    component: WebaudioVisualizer,
  },
  {
    path: '/list/ar-cones',
    meta: {title: "ar-cones AR锥形"},
    component: ArCones,
  },
  {
    path: '/list/ar-lighting',
    meta: {title: "ar-lighting AR灯光"},
    component: ArLighting,
  },
  {
    path: '/list/ar-plane-detection',
    meta: {title: "ar-plane-detection AR平板探测"},
    component: ArPlaneDetection,
  },
  {
    path: '/list/vr-handinput',
    meta: {title: "vr-handinput VR手写"},
    component: VrHandinput,
  },
];

export default routerList;