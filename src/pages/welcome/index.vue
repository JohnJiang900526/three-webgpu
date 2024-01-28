<template>
  <div class="welcome-page">
    <div class="message">
      <div class="logo-warp">
        <img class="logo" :src="logo" alt="logo">
      </div>

      <h1 class="title">three.js webgpu 训练场</h1>

      <div class="entry" @click="entry"> 进入训练场</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from 'vue-router';
import { useStore } from '@/store';
import logo from "@/assets/favicon_white.ico";

  const router = useRouter();
  const store = useStore();

  onMounted(() => {
    initHandle();
  });

  // 初始化
  const initHandle = () => {
    if (store.isExpired()) {
      router.replace("/");
    }
  };

  // 进入系统
  const entry = () => {
    store.setLast();
    router.replace("/list");
  };
</script>
<style lang='less' scoped>
  @import "@/common/style/color.less";
  @import "@/common/style/mixins.less";

  .welcome-page {
    .relative-page ();
    background-color: #666;
    .message {
      width: 100%;
      height: auto;
      padding: 10px;
      box-sizing: border-box;
      .positionCenter();
      top: 35%;
      .logo-warp {
        padding: 50px 10px;
        box-sizing: border-box;
        .logo {
          width: 100px;
          height: 100px;
          display: block;
          margin: 0 auto;
          animation: app-logo-spin infinite 5s linear;
          pointer-events: none;
        }
      }
      .title {
        color: #fff;
        text-align: center;
        line-height: 1.25;
        font-size: 1.5rem;
        word-break: break-all;
      }
      .entry {
        width: 400px;
        color: #fff;
        margin: 3rem auto 0 auto;
        border: 1px solid #fff;
        padding: 15px;
        box-sizing: border-box;
        border-radius: 25px;
        text-align: center;
        cursor: pointer;
        .text {
          color: #fff;
        }
      }
    }
  }

  @keyframes app-logo-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
