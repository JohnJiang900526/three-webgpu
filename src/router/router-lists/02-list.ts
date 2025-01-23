import type { RouteRecordRaw } from "vue-router";


import Texture from "@/pages/model-list/detail-02/011-compute-texture";
import PingPong from "@/pages/model-list/detail-02/012-compute-pingpong";
import Adjustments from "@/pages/model-list/detail-02/013-cubemap-adjustments";
import Dynamic from "@/pages/model-list/detail-02/014-cubemap-dynamic";
import Mix from "@/pages/model-list/detail-02/015-cubemap-mix";
import DepthTexture from "@/pages/model-list/detail-02/016-depth-texture";
import Equirectangular from "@/pages/model-list/detail-02/017-equirectangular";
import InstanceMesh from "@/pages/model-list/detail-02/018-instance-mesh";
import InstancePoints from "@/pages/model-list/detail-02/019-instance-points";
import InstanceUniform from "@/pages/model-list/detail-02/020-instance-uniform";

const routerList: RouteRecordRaw[] = [
  {
    path: '/list/texture',
    meta: {title: "texture 纹理"},
    component: Texture,
  },
  {
    path: '/list/pingpong',
    meta: {title: "pingpong 乒乓"},
    component: PingPong,
  },
  {
    path: '/list/adjustments',
    meta: {title: "adjustments 调整"},
    component: Adjustments,
  },
  {
    path: '/list/dynamic',
    meta: {title: "dynamic 动态"},
    component: Dynamic,
  },
  {
    path: '/list/mix',
    meta: {title: "mix 混合"},
    component: Mix,
  },

  {
    path: '/list/depth-texture',
    meta: {title: "DepthTexture 深度纹理"},
    component: DepthTexture,
  },
  {
    path: '/list/equirectangular',
    meta: {title: "Equirectangular 等距柱状投影"},
    component: Equirectangular,
  },
  {
    path: '/list/instance-mesh',
    meta: {title: "instance-mesh 实例化网格"},
    component: InstanceMesh,
  },
  {
    path: '/list/instance-points',
    meta: {title: "instance-points 实例化点"},
    component: InstancePoints,
  },
  {
    path: '/list/instance-uniform',
    meta: {title: "instance-uniform 实例化Uniform"},
    component: InstanceUniform,
  },
];

export default routerList.reverse();