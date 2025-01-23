import type { RouteRecordRaw } from "vue-router";


import Sandbox from "@/pages/model-list/detail-05/041-webgpu-sandbox";
import Shadertoy from "@/pages/model-list/detail-05/042-webgpu-shadertoy";
import Shadowmap from "@/pages/model-list/detail-05/043-webgpu-shadowmap";
import Skinning from "@/pages/model-list/detail-05/044-webgpu-skinning";
import SkinningInstancing from "@/pages/model-list/detail-05/045-skinning-instancing";
import SkinningPoints from "@/pages/model-list/detail-05/046-skinning-points";
import WebgpuSprites from "@/pages/model-list/detail-05/047-webgpu-sprites";
import Textures2dArray from "@/pages/model-list/detail-05/048-textures-2d-array";
import TslEditor from "@/pages/model-list/detail-05/049-tsl-editor";
import TslTranspiler from "@/pages/model-list/detail-05/050-tsl-transpiler";

const routerList: RouteRecordRaw[] = [
  {
    path: '/list/webgpu-sandbox',
    meta: {title: "webgpu-sandbox 沙箱"},
    component: Sandbox,
  },
  {
    path: '/list/webgpu-shadertoy',
    meta: {title: "webgpu-shadertoy shader玩具"},
    component: Shadertoy,
  },
  {
    path: '/list/webgpu-shadowmap',
    meta: {title: "webgpu-shadowmap 阴影映射"},
    component: Shadowmap,
  },
  {
    path: '/list/webgpu-skinning',
    meta: {title: "webgpu-skinning 油漆"},
    component: Skinning,
  },
  {
    path: '/list/skinning-instancing',
    meta: {title: "skinning-instancing 油漆实例化"},
    component: SkinningInstancing,
  },

  {
    path: '/list/skinning-points',
    meta: {title: "skinning-points 油漆点"},
    component: SkinningPoints,
  },
  {
    path: '/list/webgpu-sprites',
    meta: {title: "webgpu-sprites 油漆精灵"},
    component: WebgpuSprites,
  },
  {
    path: '/list/textures-2d-array',
    meta: {title: "textures-2d-array 2d纹理"},
    component: Textures2dArray,
  },
  {
    path: '/list/tsl-editor',
    meta: {title: "tsl-editor tsl编辑器"},
    component: TslEditor,
  },
  {
    path: '/list/tsl-transpiler',
    meta: {title: "tsl-transpiler tsl转换器"},
    component: TslTranspiler,
  },
];

export default routerList;