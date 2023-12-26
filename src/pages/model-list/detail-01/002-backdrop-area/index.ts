import { defineAsyncComponent } from "vue"

const BackdropArea = defineAsyncComponent(() => {
  return import("./index.vue");
});

export default BackdropArea;
