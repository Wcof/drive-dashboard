<script setup lang="ts">
// DockPopup —— 充电站弹窗（增强版：充电状态可视化 + 队列展示 + 能耗统计）

import { computed } from "vue"
import { useDashboard } from "@/composables/useDashboard"
import type { DockQueueStats } from "@/types/dashboard"

const props = defineProps<{ dockId: string }>()
const { docks } = useDashboard()

const dock = computed(() => docks.value.find((d) => d.id === props.dockId) ?? null)

const statusMap: Record<string, string> = { charging: "充电中", safe: "空闲", warn: "注意", danger: "异常" }
const statusTag: Record<string, string> = { charging: "charging", safe: "safe", warn: "warn", danger: "warn" }
const statusColor: Record<string, string> = { charging: "#3B82F6", safe: "#22C55E", warn: "#F59E0B", danger: "#EF4444" }

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

const voltageStatus = computed(() => {
  if (!dock.value) return "safe"
  const v = parseInt(dock.value.voltage)
  if (v < 380) return "danger"
  if (v < 390) return "warn"
  return "safe"
})

// 充电站占位率
const occupancyPct = computed(() => {
  if (!dock.value) return 0
  return Math.round(((queueStats.value.charging + queueStats.value.parked) / 3) * 100)
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
      <!-- 充电站门面 -->
      <div class="dock-facade" :style="{ backgroundImage: `url('${dock.facadeImg}')` }">
        <div class="dock-facade-overlay">{{ dock.id }}</div>
        <div class="dock-status-badge" :style="{ background: statusColor[dock.status] }">{{ statusMap[dock.status] }}</div>
      </div>
      
      <!-- 充电站使用率 -->
      <div class="dock-occupancy">
        <span class="dock-occ-label">充电位占用率</span>
        <div class="dock-occ-bar">
          <div class="dock-occ-fill" :style="{ width: occupancyPct + '%' }"></div>
        </div>
        <span class="dock-occ-val">{{ occupancyPct }}%</span>
      </div>

      <div class="popup-stats">
        <div class="popup-stat"><span class="popup-stat-label">运行状态</span><span class="popup-stat-value" :style="{ color: statusColor[dock.status] }">{{ statusMap[dock.status] }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">当前机器人</span><span class="popup-stat-value">{{ dock.bot }}</span></div>
        <div class="popup-stat">
          <span class="popup-stat-label">输出电压</span>
          <span class="popup-stat-value" :class="{ 'danger-txt': voltageStatus === 'danger', 'warn-txt': voltageStatus === 'warn' }">{{ dock.voltage }}</span>
        </div>
        <div class="popup-stat"><span class="popup-stat-label">累计充电</span><span class="popup-stat-value">{{ dock.totalCharges }}次</span></div>
        <div class="popup-stat"><span class="popup-stat-label">已充满未离站</span><span class="popup-stat-value warn-txt">{{ queueStats.fullNotLeave }}台</span></div>
        <div class="popup-stat"><span class="popup-stat-label">排队等待</span><span class="popup-stat-value" :class="{ 'warn-txt': queueStats.queue > 0 }">{{ queueStats.queue }}台</span></div>
        <div class="popup-stat"><span class="popup-stat-label">最近充电机器人</span><span class="popup-stat-value">{{ dock.lastRobot }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">坐标</span><span class="popup-stat-value mono">{{ dock.coords[0].toFixed(4) }}, {{ dock.coords[1].toFixed(4) }}</span></div>
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
.popup-body { padding: 0.1200rem 0.1400rem; }
.dock-facade { height: 1.0000rem; background-size: cover; background-position: center; border-radius: 0.0400rem; margin-bottom: 0.1000rem; position: relative; }
.dock-facade-overlay { position: absolute; bottom: 0.0600rem; left: 0.0800rem; font-size: 0.1000rem; color: #cfe3f7; background: rgba(0,0,0,0.5); padding: 0.0200rem 0.0600rem; border-radius: 0.0200rem; font-family: var(--hud-mono); }
.dock-status-badge { position: absolute; top: 0.0600rem; right: 0.0600rem; padding: 0.0200rem 0.0600rem; border-radius: 0.0200rem; font-size: 0.0900rem; color: #fff; }

.dock-occupancy { display: flex; align-items: center; gap: 0.0600rem; margin-bottom: 0.1000rem; padding: 0.0600rem 0.0800rem; background: rgba(0,0,0,0.25); border-radius: 0.0300rem; }
.dock-occ-label { font-size: 0.0900rem; color: var(--hud-text-dim); min-width: 0.6000rem; }
.dock-occ-bar { flex: 1; height: 0.0600rem; background: rgba(255,255,255,0.06); border-radius: 9.9900rem; overflow: hidden; }
.dock-occ-fill { height: 100%; background: linear-gradient(90deg, #00E5FF, #3B82F6); border-radius: 9.9900rem; transition: width 0.3s ease; }
.dock-occ-val { font-family: var(--hud-mono); font-size: 0.1000rem; color: #00E5FF; min-width: 0.3400rem; text-align: right; }

.popup-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.0600rem; }
.popup-stat { display: flex; flex-direction: column; gap: 0.0200rem; }
.popup-stat-label { font-size: 0.0900rem; color: var(--hud-text-dim); letter-spacing: 0.5px; }
.popup-stat-value { font-size: 0.1100rem; color: var(--hud-text); }
.mono { font-family: var(--hud-mono); }
.danger-txt { color: #EF4444; }
.warn-txt { color: #F59E0B; }
</style>
