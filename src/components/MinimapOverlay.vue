<script setup lang="ts">
// MinimapOverlay —— ADR#84 聚焦态左下角小地图，点击放大回全局
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { getMockDataService } from "@/composables/useMockDataService"

const { clear } = useSelectedRobot()
const { state } = getMockDataService()
</script>

<template>
  <div class="minimap" @click="clear">
    <div class="minimap__hint">小地图 · 点击返回全局</div>
    <div class="minimap__canvas">
      <span v-for="r in state.robots" :key="r.id" class="minimap__dot" :class="`is-${r.status}`" />
    </div>
  </div>
</template>

<style scoped>
.minimap { position: absolute; left: 12px; bottom: 132px; width: 180px; height: 140px; background: var(--hud-bg-elev); border: 1px solid var(--hud-accent); border-radius: 4px; cursor: pointer; z-index: 10; }
.minimap__hint { color: var(--hud-accent); font-size: 11px; padding: 4px; }
.minimap__canvas { position: relative; width: 100%; height: calc(100% - 24px); }
.minimap__dot { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: var(--hud-accent); }
.minimap__dot.is-error { background: var(--hud-danger); }
.minimap__dot.is-patrolling { background: var(--hud-ok); }
</style>
