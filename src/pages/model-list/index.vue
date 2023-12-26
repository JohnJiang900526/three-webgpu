<template>
  <div class="list-page">
    <div @click="showBarHandle" v-show="!isShowBar" class="slide-base-action">
      <span class="icon mdi mdi-arrow-left-bold-box-outline"></span>
    </div>
    <div :style="{ 'left': left }" class="side-bar">
      <div class="header">
        <div class="header-item search">
          <input class="search-input" placeholder="请输入关键字" type="text">
        </div>
        <div @click="hideBarHandle" class="header-item action">
          <span class="icon mdi mdi-arrow-left-bold-box-outline"></span>
        </div>
      </div>
      <div class="content">
        <div v-if="list.length > 0" class="list-content">
          <cell-group title="WebGPU">
            <cell v-for="item in list" is-link @click="openLink(item.path)" :key="item.path">
              <template #title>
                <span :class="`title ${ isActive(item) }`">{{ formatTitle(item) }}</span>
              </template>
            </cell>
          </cell-group>
        </div>
        <div v-else>
          <Empty image="search" description="没有匹配到对应的模型，请重新搜索" />
        </div>

        <div style="height: 200px;"></div>
      </div>
    </div>
    <div class="main-content">
      <RouterView />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouteRecordRaw, RouterView, useRouter, useRoute } from "vue-router";
import { Cell, CellGroup, Empty } from 'vant';
import { storeToRefs } from "pinia";
import { useStore } from '@/store';
import { routerList } from '@/router/list';
import { cloneDeep } from "lodash";

const router = useRouter();
const route = useRoute();
const store = useStore();
const { isShowBar } = storeToRefs(store);

const list = ref<RouteRecordRaw[]>([...cloneDeep(routerList.reverse())]);

const left = computed<string>(() => {
  if (isShowBar.value) {
    return "0px";
  } else {
    return "-350px";
  }
});

const formatTitle = (item: RouteRecordRaw) => {
  return item?.meta?.title as string;
};
const isActive = (item: RouteRecordRaw) => {
  return (route.path === item?.path) ? "active": "";
};

const openLink = (path: string) => {
  router.push(path);
};

const showBarHandle = () => {
  store.showBar();
};

const hideBarHandle = () => {
  store.hideBar();
};
</script>
<style lang='less' scoped>
@import "@/common/style/color.less";
@import "@/common/style/mixins.less";

.list-page {
  .relative-page ();
  background-color: #666;

  .slide-base-action {
    width: 40px;
    height: 25px;
    position: absolute;
    top: 10px;
    left: 0;
    z-index: 1;
    text-align: center;
    cursor: pointer;
    background-color: #000;
    padding: 4px 5px;
    border-top-right-radius: 15px;
    border-bottom-right-radius: 15px;

    .icon {
      display: inline-block;
      color: #999;
      transform: rotate(180deg);
    }
  }

  .side-bar {
    width: 300px;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10;
    overflow-x: visible;
    overflow-y: auto;
    background-color: #333333c2;
    display: flex;
    flex-direction: column;
    transition: left 0.25s;
    border-right: 1px solid #656565;

    .header {
      flex: 0 0 45px;
      height: 45px;
      .bottom-line();
      display: flex;

      .header-item {
        flex: 1;

        &.search {
          padding: 8px 5px;
          box-sizing: border-box;

          .search-input {
            width: 100%;
            height: 30px;
            border-radius: 5px;
            padding: 3px 5px 3px 10px;
            background-color: transparent;
            border: 1px solid #666;
            font-size: 14px;
          }
        }

        &.action {
          flex: 0 0 50px;
          text-align: center;
          position: relative;
          cursor: pointer;

          .icon {
            font-size: 18px;
            color: #999;
            .positionCenter();
          }
        }
      }
    }

    .content {
      flex: 1;
      overflow-x: hidden;
      overflow-y: auto;

      .list-content {
        --van-cell-background: transparent !important;
        --van-cell-group-background: transparent !important;
        --van-cell-text-color: #fff;
        --van-cell-active-color: #999 !important;
        .title {
          transition: all 0.5s;

          &.active {
            color: #1989fa;
          }
        }
      }
    }
  }

  .main-content {
    .width-and-height();
    position: relative;
  }
}</style>
