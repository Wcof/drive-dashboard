<script setup lang="ts">
// LayerToggle —— ADR#125 右上角折叠图层开关面板
// 锁定态隐藏（不可改图层显隐）；解锁态可手动开关 P2 图层

import { computed } from "vue"
import { useLayers, LAYER_DEFAULTS, type LayerKey } from "@/composables/useLayers"
import { useLockState } from "@/composables/useLockState"

const { isLocked } = useLockState()
const { visibility, toggle } = useLayers()

const allLayers = computed(() => (Object.keys(LAYER_DEFAULTS) as LayerKey[]).map((k) => ({
  key: k,
  label: labelOf(k),
  priority: LAYER_DEFAULTS[k].priority,
  visible: visibility[k],
})))

function labelOf(k: LayerKey): string {
  const map: Record<LayerKey, string> = {
    baseRaster: "底图 raster",
    buildings3d: "建筑物 3D",
    roadNetwork: "路网",
    robotPosition: "机器人实时位置",
    alertAnchors: "告警锚点",
    regions: "区域分区",
    inspectionPoints: "巡检点",
    trajectory: "机器人轨迹",
    fovCone: "视频视野锥",
    navPoints: "导航点",
    coverageHeatmap: "任务覆盖热力",
    workTicketGuard: "作业票监护区",
    patrolAnchors: "边巡边检锚点",
  }
  return map[k]
}
</script>

<template>
  <div v-if="!isLocked" class="layer-toggle">
    <div class="layer-toggle__header">图层开关</div>
    <div class="layer-toggle__list">
      <label v-for="l in allLayers" :key="l.key" class="layer-toggle__row" :class="{ 'is-p2': l.priority === 'P2' }">
        <input
          type="checkbox"
          :checked="l.visible"
          :disabled="l.priority !== 'P2'"
          @change="toggle(l.key)"
        />
        <span class="layer-toggle__label">{{ l.label }}</span>
        <span class="layer-toggle__priority">{{ l.priority }}</span>
      </label>
    </div>
    <div class="layer-toggle__hint">P0/P1 固定显隐，仅 P2 可手动开关</div>
  </div>
</template>

<style scoped>
.layer-toggle {
  position: absolute;
  top: 0.1200rem;
  right: 0.1200rem;
  width: 2.0000rem;
  background: var(--hud-bg-elev);
  border: 1px solid var(--hud-border);
  border-radius: 0.0400rem;
  padding: 0.0800rem;
  font-size: 0.1200rem;
  z-index: 10;
}
.layer-toggle__header { color: var(--hud-accent); margin-bottom: 0.0600rem; font-weight: 600; }
.layer-toggle__row { display: flex; align-items: center; gap: 0.0600rem; padding: 0.0200rem 0; cursor: pointer; }
.layer-toggle__row.is-p2 { color: var(--hud-warn); }
.layer-toggle__label { flex: 1; color: var(--hud-text); }
.layer-toggle__priority { color: var(--hud-text-dim); font-family: var(--hud-mono); font-size: 0.1000rem; }
.layer-toggle__hint { color: var(--hud-text-dim); font-size: 0.1000rem; margin-top: 0.0600rem; border-top: 1px solid var(--hud-border); padding-top: 0.0400rem; }
</style>
