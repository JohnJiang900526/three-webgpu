import { defineAsyncComponent } from "vue"

const ClearCoat = defineAsyncComponent(() => {
  return import("./index.vue");
});

export default ClearCoat;
