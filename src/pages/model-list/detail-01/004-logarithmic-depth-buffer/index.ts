import { defineAsyncComponent } from "vue"

const DepthBuffer = defineAsyncComponent(() => {
  return import("./index.vue");
});

export default DepthBuffer;
