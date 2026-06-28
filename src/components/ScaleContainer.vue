<script setup lang="ts">
// ScaleContainer —— UI 层缩放容器
// 将内部子元素锁定在 1920×1080 设计稿比例，通过 transform: scale() 自适应视口
// 地图层（Mapbox Canvas）不应放入此容器，应 absolute 全屏铺满视口
//
// 用法：<ScaleContainer> 所有 HUD 面板、TopBar、Sidebar 等自研 UI </ScaleContainer>

import { computed } from "vue"
import { useScale, DESIGN_WIDTH, DESIGN_HEIGHT } from "@/composables/useScale"

const { scaleState } = useScale()

const wrapperStyle = computed(() => ({
  width: `${DESIGN_WIDTH}px`,
  height: `${DESIGN_HEIGHT}px`,
  transform: `translate(${scaleState.value.offsetX}px, ${scaleState.value.offsetY}px) scale(${scaleState.value.scale})`,
  transformOrigin: "0 0",
}))
</script>

<template>
  <!-- 外层占满视口，仅作定位基准；不缩放，避免影响地图层 -->
  <div class="scale-layer">
    <!-- 内层固定 1920×1080，整体 scale；超出部分由 overflow:hidden 裁剪 -->
    <div class="scale-stage" :style="wrapperStyle">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.scale-layer {
  position: absolute;
  inset: 0;
  /* 占满视口，但本身不缩放；内部 scale-stage 通过 transform 缩放 */
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
}
/* scale-stage 内所有 HUD 元素允许交互；外层 pointer-events:none 避免遮挡地图空白区 */
.scale-stage {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: auto;
  will-change: transform;
}
</style>
