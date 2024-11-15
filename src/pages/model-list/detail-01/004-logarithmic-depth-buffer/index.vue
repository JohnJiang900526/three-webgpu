<template>
  <div class="webgpu-page">
    <div ref="container" class="page-inner">
      <div ref="containerNormal" class="container-normal">
        <h2 class="renderer_label">normal z-buffer</h2>
      </div>
			<div ref="containerLogzbuf" class="container-logzbuf">
        <h2 class="renderer_label">logarithmic z-buffer</h2>
      </div>
      <div ref="rendererBorder" class="renderer-border"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Model } from "./tools";

let objModel: Model | null = null;
const container = ref<HTMLDivElement>(document.createElement("div"));
const containerNormal = ref<HTMLDivElement>(document.createElement("div"));
const containerLogzbuf = ref<HTMLDivElement>(document.createElement("div"));
const rendererBorder = ref<HTMLDivElement>(document.createElement("div"));

onMounted(() => {
  objModel = new Model(container.value, {
    border: rendererBorder.value,
    normal: containerNormal.value,
    logzbuf: containerLogzbuf.value,
  });
  objModel?.init();
});

onBeforeUnmount(() => {
  objModel?.dispose();
  objModel = null;
});
</script>
<style lang='less'>
  @import "@/common/style/color.less";
  @import "@/common/style/mixins.less";

  .webgpu-page {
    .absolute-page();
    .page-inner {
      position: relative;
      .width-and-height();
      .lil-gui.root {
        position: absolute;
        top: 0px;
        right: 0px;
      }
      .container-normal {
				width: 25%;
        height: 100%;
				display: inline-block;
				position: relative;
			}

			.container-logzbuf {
				width: 75%;
        height: 100%;
				display: inline-block;
				position: relative;
			}
      .renderer-border {
        position: absolute;
				top: 0;
				left: 25%;
				bottom: 0;
				width: 4px;
				z-index: 10;
				opacity: 0.8;
				background: #ccc;
				border: 1px inset #ccc;
				cursor: col-resize;
      }
      .renderer_label {
				position: absolute;
				bottom: 1em;
				width: 100%;
				color: white;
				z-index: 10;
				display: block;
				text-align: center;
			}
    }
  }
</style>

