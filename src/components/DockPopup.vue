<script setup lang="ts">
// DockPopup —— 充电站弹窗（复刻参考页面 showDockPopup）
// 含：充电站门面 + 状态 stats + 充电队列 + 最近充电机器人

import { computed } from "vue"
import { useDashboard } from "@/composables/useDashboard"
import type { DockQueueStats } from "@/types/dashboard"

const props = defineProps<{ dockId: string }>()
const { docks } = useDashboard()

const dock = computed(() => docks.value.find((d) => d.id === props.dockId) ?? null)

const statusMap: Record<string, string> = { charging: "充电中", safe: "空闲", warn: "注意", danger: "异常" }
const statusTag: Record<string, string> = { charging: "charging", safe: "safe", warn: "warn", danger: "warn" }

const queueStats = computed<DockQueueStats>(() => {
  if (!dock.value) return { charging: 0, parked: 0, fullNotLeave: 0, queue: 0 }
  const d = dock.value
  return {
    charging: d.status === "charging" ? 1 : 0,
    parked: d.status === "safe" ? 1 : 0,
    fullNotLeave: d.fullNotLeave,
    queue: d.queueCount,
  }
})
</script>

<template>
  <div v-if="dock" class="map-popup">
    <div class="popup-header">
      <span class="popup-title">{{ dock.name }}</span>
      <span class="tag" :class="statusTag[dock.status]">{{ statusMap[dock.status] }}</span>
      <span class="popup-close-btn" @click="$emit('close')">✕</span>
    </div>
    <div class="popup-body">
      <div class="dock-facade" :style="{ backgroundImage: `url('${dock.facadeImg}')` }">
        <div class="dock-facade-overlay">{{ dock.id }}</div>
      </div>
      <div class="popup-stats">
        <div class="popup-stat"><span class="popup-stat-label">运行状态</span><span class="popup-stat-value">{{ statusMap[dock.status] }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">当前机器人</span><span class="popup-stat-value">{{ dock.bot }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">输出电压</span><span class="popup-stat-value">{{ dock.voltage }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">累计充电次数</span><span class="popup-stat-value">{{ dock.totalCharges }}次</span></div>
        <div class="popup-stat"><span class="popup-stat-label">已充满未离站</span><span class="popup-stat-value">{{ queueStats.fullNotLeave }}台</span></div>
        <div class="popup-stat"><span class="popup-stat-label">排队台数</span><span class="popup-stat-value">{{ queueStats.queue }}台</span></div>
        <div class="popup-stat"><span class="popup-stat-label">最近充电机器人</span><span class="popup-stat-value">{{ dock.lastRobot }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">位置坐标</span><span class="popup-stat-value">{{ dock.coords[0].toFixed(4) }}, {{ dock.coords[1].toFixed(4) }}</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-popup { width: 3.6000rem; background: rgba(10,16,26,0.92); border: 1px solid rgba(197,168,123,0.4); border-radius: 0.0800rem; box-shadow: 0 0.1200rem 0.4000rem rgba(0,0,0,0.6); color: var(--hud-text); font-size: 0.1200rem; }
.popup-header { display: flex; align-items: center; gap: 0.0800rem; padding: 0.1000rem 0.1400rem; border-bottom: 1px solid rgba(197,168,123,0.22); }
.popup-title { font-size: 0.1300rem; color: var(--hud-text); font-weight: 500; letter-spacing: 1px; }
.tag { padding: 0.0200rem 0.0800rem; border-radius: 0.0300rem; font-size: 0.1100rem; }
.tag.charging { background: rgba(59,130,246,0.18); color: #3B82F6; border: 1px solid rgba(59,130,246,0.4); }
.tag.safe { background: rgba(34,197,94,0.18); color: #22C55E; border: 1px solid rgba(34,197,94,0.4); }
.tag.warn { background: rgba(245,158,11,0.18); color: #F59E0B; border: 1px solid rgba(245,158,11,0.4); }
.popup-close-btn { margin-left: auto; cursor: pointer; color: var(--hud-text-dim); font-size: 0.1400rem; }
.popup-body { padding: 0.1200rem 0.1400rem; max-height: 4.6000rem; overflow-y: auto; }
.dock-facade { height: 1.2000rem; background-size: cover; background-position: center; border-radius: 0.0400rem; margin-bottom: 0.1200rem; position: relative; }
.dock-facade-overlay { position: absolute; bottom: 0.0600rem; left: 0.0800rem; font-size: 0.1100rem; color: #cfe3f7; background: rgba(0,0,0,0.5); padding: 0.0200rem 0.0600rem; border-radius: 0.0200rem; font-family: var(--hud-mono); }
.popup-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.0800rem; }
.popup-stat { display: flex; flex-direction: column; gap: 0.0200rem; }
.popup-stat-label { font-size: 0.1000rem; color: var(--hud-text-dim); letter-spacing: 0.5px; }
.popup-stat-value { font-size: 0.1200rem; color: var(--hud-text); }
</style>
