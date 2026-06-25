<script setup lang="ts">
// FocusPanel —— ADR#84 聚焦态中央容器：双光视频 + 机器人属性摘要
import { ref } from "vue"
import VideoFeed from "./VideoFeed.vue"
import RobotPropertyCard from "./RobotPropertyCard.vue"
import MinimapOverlay from "./MinimapOverlay.vue"

const fullscreen = ref(false)
function toggleFullscreen(): void { fullscreen.value = !fullscreen.value }
</script>

<template>
  <div class="focus-panel" :class="{ 'is-fullscreen': fullscreen }">
    <VideoFeed :fullscreen="fullscreen" @toggle-fullscreen="toggleFullscreen" />
    <RobotPropertyCard v-if="!fullscreen" />
    <MinimapOverlay v-if="fullscreen" />
  </div>
</template>

<style scoped>
.focus-panel { flex: 1; display: flex; gap: 0.0800rem; padding: 0.0800rem; position: relative; }
.focus-panel.is-fullscreen { flex-direction: column; }
</style>
