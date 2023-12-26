import { defineAsyncComponent } from "vue"

const BackdropWater = defineAsyncComponent(() => {
  return import("./index.vue");
});

export default BackdropWater;
