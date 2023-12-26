import { defineAsyncComponent } from "vue"

const Backdrop = defineAsyncComponent(() => {
  return import("./index.vue");
});

export default Backdrop;
