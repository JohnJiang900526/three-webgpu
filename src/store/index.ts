
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useStore = defineStore('use-store', () => {
  const threshold = (24 * 3600 * 1000);

  const last = ref(0);
  const isShowBar = ref(true);

  const setLast = () => {
    const timer = Date.now();
    last.value = timer;
  };

  const getLast = () => {
    return last.value;
  }

  const isExpired = () => {
    if (last.value === 0) {
      return true;
    }

    const current = Date.now();
    const diff = current - last.value;
    
    return (diff > threshold) ? true : false;
  };

  const showBar = () => {
    isShowBar.value = true;
  };
  const hideBar = () => {
    isShowBar.value = false;
  };

  return {
    last,
    setLast,
    getLast,
    isShowBar,
    showBar,
    hideBar,
    isExpired,
  }
}, { persist: true });
