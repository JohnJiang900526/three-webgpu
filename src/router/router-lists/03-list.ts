import type { RouteRecordRaw } from "vue-router";


import LightsCustom from "@/pages/model-list/detail-03/021-lights-custom";
import IesSpotlight from "@/pages/model-list/detail-03/022-lights-ies-spotlight";
import LightsPhong from "@/pages/model-list/detail-03/023-lights-phong";
import LightsSelective from "@/pages/model-list/detail-03/024-lights-selective";
import LinesFat from "@/pages/model-list/detail-03/025-lines-fat";
import LoaderGltf from "@/pages/model-list/detail-03/026-loader-gltf";
import GltfCompressed from "@/pages/model-list/detail-03/027-gltf-compressed";
import GltfIridescence from "@/pages/model-list/detail-03/028-gltf-iridescence";
import GltfSheen from "@/pages/model-list/detail-03/029-gltf-sheen";
import LoaderMaterialx from "@/pages/model-list/detail-03/030-loader-materialx";

const routerList: RouteRecordRaw[] = [
  {
    path: '/list/lights-custom',
    meta: {title: "lights-custom 灯光自定义"},
    component: LightsCustom,
  },
  {
    path: '/list/ies-spotlight',
    meta: {title: "ies-spotlight 点光"},
    component: IesSpotlight,
  },
  {
    path: '/list/lights-phong',
    meta: {title: "lights-phong phong光"},
    component: LightsPhong,
  },
  {
    path: '/list/lights-selective',
    meta: {title: "lights-selective 灯光选择"},
    component: LightsSelective,
  },
  {
    path: '/list/lines-fat',
    meta: {title: "lines-fat 粗线"},
    component: LinesFat,
  },

  {
    path: '/list/loader-gltf',
    meta: {title: "loader-gltf 加载gltf"},
    component: LoaderGltf,
  },
  {
    path: '/list/gltf-compressed',
    meta: {title: "gltf-compressed gltf压缩"},
    component: GltfCompressed,
  },
  {
    path: '/list/gltf-iridescence',
    meta: {title: "gltf-iridescence gltf彩虹"},
    component: GltfIridescence,
  },
  {
    path: '/list/gltf-sheen',
    meta: {title: "gltf-sheen gltf的sheen光泽"},
    component: GltfSheen,
  },
  {
    path: '/list/loader-materialx',
    meta: {title: "loader-materialx 加载矩阵"},
    component: LoaderMaterialx,
  },
];

export default routerList;