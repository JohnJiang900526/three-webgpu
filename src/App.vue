<template>
  <RouterView />
</template>
<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router';
import { onMounted } from "vue";
import { useStore } from '@/store';

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
</script>

<style lang="less" scoped>

</style>
