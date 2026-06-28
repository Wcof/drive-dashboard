<script setup lang="ts">
// MinimapOverlay —— ADR#84 聚焦态左下角小地图，点击放大回全局
// 增强：按机器人经纬度归一化定位点位，选中机器人高亮
import { computed } from "vue"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { getMockDataService } from "@/composables/useMockDataService"

const { clear, selectedRobot } = useSelectedRobot()
const { state } = getMockDataService()

// 经纬度边界（与 seed 一致），用于把机器人位置归一化到小地图 canvas
const LNG_MIN = 121.4712, LNG_MAX = 121.4768
const LAT_MIN = 31.2275, LAT_MAX = 31.2322

const dots = computed(() => state.robots.map((r) => {
  const x = ((r.position.longitude - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100
  const y = (1 - (r.position.latitude - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 100
  return {
    id: r.id,
    status: r.status,
    left: `${Math.max(2, Math.min(96, x))}%`,
    top: `${Math.max(2, Math.min(94, y))}%`,
    selected: selectedRobot.value?.id === r.id,
  }
}))

// 告警锚点也映射到小地图
const alertDots = computed(() => state.alerts.slice(0, 8).map((a) => {
  const robot = state.robots.find((r) => r.id === a.robotId)
  if (!robot) return null
  const x = ((robot.position.longitude - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100
  const y = (1 - (robot.position.latitude - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 100
  return { id: a.id, severity: a.severity, left: `${Math.max(2, Math.min(96, x))}%`, top: `${Math.max(2, Math.min(94, y))}%` }
}).filter(Boolean) as { id: string; severity: string; left: string; top: string }[])
</script>

<template>
  <div class="minimap" @click="clear">
    <div class="minimap__hint">小地图 · 点击返回全局</div>
    <div class="minimap__canvas">
      <!-- 区域网格背景 -->
      <div class="minimap__grid"></div>
      <!-- 告警锚点（底层） -->
      <span v-for="a in alertDots" :key="`a-${a.id}`" class="minimap__alert" :class="`is-${a.severity}`" :style="{ left: a.left, top: a.top }"></span>
      <!-- 机器人点位 -->
      <span v-for="d in dots" :key="d.id" class="minimap__dot" :class="[`is-${d.status}`, { 'is-selected': d.selected }]" :style="{ left: d.left, top: d.top }"></span>
    </div>
  </div>
</template>

<style scoped>
.minimap { position: absolute; left: 12px; bottom: 132px; width: 180px; height: 140px; background: var(--hud-bg-elev); border: 1px solid var(--hud-accent); border-radius: 4px; cursor: pointer; z-index: 10; overflow: hidden; }
.minimap__hint { color: var(--hud-accent); font-size: 11px; padding: 4px 6px; background: rgba(0,0,0,0.4); }
.minimap__canvas { position: relative; width: 100%; height: calc(100% - 24px); }
.minimap__grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(0,229,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.08) 1px, transparent 1px); background-size: 30px 30px; opacity: 0.6; }
.minimap__dot { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: var(--hud-accent); transform: translate(-50%, -50%); box-shadow: 0 0 4px currentColor; transition: all 0.3s ease; }
.minimap__dot.is-error { background: var(--hud-danger); color: var(--hud-danger); }
.minimap__dot.is-patrolling { background: var(--hud-ok); color: var(--hud-ok); }
.minimap__dot.is-charging { background: var(--hud-info); color: var(--hud-info); }
.minimap__dot.is-returning { background: var(--hud-warn); color: var(--hud-warn); }
.minimap__dot.is-selected { width: 11px; height: 11px; box-shadow: 0 0 8px #00E5FF; border: 1px solid #00E5FF; }
.minimap__alert { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: #EF4444; transform: translate(-50%, -50%); animation: miniPulse 1.5s infinite; }
.minimap__alert.is-warning { background: #F59E0B; }
.minimap__alert.is-info { background: #3B82F6; }
@keyframes miniPulse { 0%,100% { opacity: 1; transform: translate(-50%,-50%) scale(1); } 50% { opacity: 0.4; transform: translate(-50%,-50%) scale(1.6); } }
</style>
