<script setup lang="ts">
// RobotPopup —— 机器人实时状态弹窗（复刻参考页面 showRobotPopup）
// 含：实时状态 stats + 云台实时视角 + 挂件检测指标卡

import { computed } from "vue"
import { useDashboard } from "@/composables/useDashboard"
import { useRobots } from "@/composables/useRobots"
import { makeMockImg } from "@/utils/mockImage"
import { ROBOT_MILEAGE_KM } from "@/mock/seedDashboard"
import { ROBOT_BIZ_STATUS_LABEL } from "@/mock/seedDashboard"

const { state, currentRobotExt, currentTask, currentInspectionPoint, openControlModal, openEnvMetricModal } = useDashboard()
const { byId } = useRobots()

const robot = computed(() => {
  if (currentRobotExt.value) return currentRobotExt.value
  const r = byId(state.currentRobotId)?.value
  if (!r) return null
  return {
    id: r.id,
    status: r.status === "error" ? "danger" : r.status === "charging" ? "charging" : r.status === "returning" ? "warn" : "safe",
    label: r.status === "charging" ? "充电中" : r.status === "returning" ? "返航中" : r.status === "error" ? "故障" : "执行中",
    task: r.currentTaskId ?? "无任务",
    battery: r.batteryLevel,
    coords: [r.position.longitude, r.position.latitude] as [number, number],
    taskId: r.currentTaskId,
    robotType: "四轮",
  }
})

const batteryClass = computed(() => {
  const b = robot.value?.battery ?? 0
  return b > 50 ? "high" : b > 20 ? "mid" : "low"
})

const remainMileage = computed(() => Math.round((robot.value?.battery ?? 0) * 1.2))
const todayMileage = computed(() => Math.max(18, Math.round((robot.value?.battery ?? 0) * 0.42)))
const totalMileage = computed(() => ROBOT_MILEAGE_KM[robot.value?.id ?? ""] ?? 0)

const statusLabel = computed(() => {
  const s = robot.value?.status
  if (s === "charging") return "充电中"
  if (s === "warn") return "返航中"
  if (s === "danger") return "异常"
  return "执行中"
})
const statusColor = computed(() => {
  const s = robot.value?.status
  if (s === "charging") return "#3B82F6"
  if (s === "warn") return "#F59E0B"
  if (s === "danger") return "#EF4444"
  return "#22C55E"
})

const bgImg = computed(() => currentTask.value?.bgImg || makeMockImg("Live", "#152338", "#2f4866"))
const ts = computed(() => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
})

const activeNode = computed(() => currentTask.value?.timeline.nodes.find((n) => n.status === "active") ?? currentTask.value?.timeline.nodes[0])
const attachmentMetrics = computed(() => currentInspectionPoint.value?.monitorPoints?.[0]?.metrics ?? {})

const bizStatus = computed(() => {
  const s = robot.value?.status
  if (s === "charging") return "charging"
  if (s === "warn") return "returning"
  if (s === "danger") return "warning"
  return "executing"
})

function emit(event: "close"): void { void event }

function gotoDispatch(): void {
  openControlModal(robot.value?.id)
}

// 挂件指标 → EnvMetricModal key 映射
const metricKeyMap: Record<string, string> = {
  "O₂": "O2",
  "氧气": "O2",
  "CO": "CO",
  "一氧化碳": "CO",
  "H₂S": "H2S",
  "硫化氢": "H2S",
  "PM2.5": "PM25",
  "噪音": "noise",
  "温度": "temp",
  "湿度": "humidity",
  "烟感": "smoke",
}
function openMetric(label: string): void {
  const key = metricKeyMap[label] ?? "O2"
  openEnvMetricModal(key)
}
</script>

<template>
  <div v-if="robot" class="map-popup">
    <div class="popup-header">
      <span class="popup-title">{{ robot.id }} 实时状态</span>
      <span class="tag gold">{{ robot.label }}</span>
      <span class="popup-close-btn" @click="emit('close')">✕</span>
    </div>
    <div class="popup-body">
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="popup-stat-label">运行状态</span>
          <span class="popup-stat-value" :style="{ color: statusColor }">{{ statusLabel }}</span>
        </div>
        <div class="popup-stat">
          <span class="popup-stat-label">当前任务</span>
          <span class="popup-stat-value">{{ currentTask?.taskName || robot.task || '无任务' }}</span>
        </div>
        <div class="popup-stat">
          <span class="popup-stat-label">机器人类型</span>
          <span class="popup-stat-value">{{ robot.robotType }}</span>
        </div>
        <div class="popup-stat span-2">
          <span class="popup-stat-label">剩余电量 / 剩余里程</span>
          <div class="popup-battery">
            <span class="popup-stat-value" style="min-width:0.8600rem">{{ robot.battery }}% / {{ remainMileage }}km</span>
            <div class="battery-bar"><div class="battery-fill" :class="batteryClass" :style="{ width: robot.battery + '%' }"></div></div>
          </div>
        </div>
        <div class="popup-stat">
          <span class="popup-stat-label">当前巡检点</span>
          <span class="popup-stat-value highlight">{{ activeNode?.name || '待命' }}</span>
        </div>
        <div class="popup-stat">
          <span class="popup-stat-label">剩余里程</span>
          <span class="popup-stat-value">{{ remainMileage }}km</span>
        </div>
        <div class="popup-stat">
          <span class="popup-stat-label">今日里程</span>
          <span class="popup-stat-value">{{ todayMileage }}km</span>
        </div>
        <div class="popup-stat">
          <span class="popup-stat-label">总里程</span>
          <span class="popup-stat-value">{{ totalMileage }}km</span>
        </div>
      </div>
      <div class="popup-ptz">
        <div class="ptz-header">
          <span>☰ 云台实时视角</span>
          <span class="ptz-live">● LIVE</span>
        </div>
        <div class="ptz-view" :style="{ backgroundImage: `url('${bgImg}')` }">
          <div class="ptz-crosshair"></div>
          <div class="ptz-overlay-text">{{ robot.id }} | CAM-01 | {{ ts }}</div>
        </div>
        <div class="ptz-action">
          <button class="ptz-control-entry" @click="gotoDispatch">前往调度台</button>
        </div>
      </div>
      <div class="popup-metrics-section">
        <div class="popup-metrics-title">挂件检测 · {{ ROBOT_BIZ_STATUS_LABEL[bizStatus] }}</div>
        <div class="env-realtime-grid two-columns slide-in">
          <div v-for="(m, k) in attachmentMetrics" :key="k" class="env-rt-card" :title="`查看${m.label}趋势`" style="cursor:pointer" @click="openMetric(m.label)">
            <span class="env-rt-icon">{{ m.icon }}</span>
            <span class="env-rt-name">{{ m.label }}</span>
            <span class="env-rt-val">{{ m.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-popup { width: 3.6000rem; background: rgba(10,16,26,0.92); border: 1px solid rgba(197,168,123,0.4); border-radius: 0.0800rem; box-shadow: 0 0.1200rem 0.4000rem rgba(0,0,0,0.6); color: var(--hud-text); font-size: 0.1200rem; }
.popup-header { display: flex; align-items: center; gap: 0.0800rem; padding: 0.1000rem 0.1400rem; border-bottom: 1px solid rgba(197,168,123,0.22); }
.popup-title { font-size: 0.1300rem; color: var(--hud-text); font-weight: 500; letter-spacing: 1px; }
.tag { padding: 0.0200rem 0.0800rem; border-radius: 0.0300rem; font-size: 0.1100rem; }
.tag.gold { background: rgba(197,168,123,0.18); color: var(--hud-accent); border: 1px solid rgba(197,168,123,0.4); }
.popup-close-btn { margin-left: auto; cursor: pointer; color: var(--hud-text-dim); font-size: 0.1400rem; }
.popup-close-btn:hover { color: var(--hud-text); }
.popup-body { padding: 0.1200rem 0.1400rem; max-height: 4.6000rem; overflow-y: auto; }
.popup-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.0800rem; margin-bottom: 0.1200rem; }
.popup-stat { display: flex; flex-direction: column; gap: 0.0200rem; }
.popup-stat.span-2 { grid-column: span 2; }
.popup-stat-label { font-size: 0.1000rem; color: var(--hud-text-dim); letter-spacing: 0.5px; }
.popup-stat-value { font-size: 0.1200rem; color: var(--hud-text); }
.popup-stat-value.highlight { color: var(--hud-accent); }
.popup-battery { display: flex; align-items: center; gap: 0.0800rem; }
.battery-bar { flex: 1; height: 0.0400rem; background: rgba(255,255,255,0.08); border-radius: 0.0200rem; overflow: hidden; }
.battery-fill { height: 100%; border-radius: 0.0200rem; }
.battery-fill.high { background: linear-gradient(90deg, #22C55E, #10B981); }
.battery-fill.mid { background: linear-gradient(90deg, #F59E0B, #F59E0B); }
.battery-fill.low { background: linear-gradient(90deg, #EF4444, #DC2626); }
.popup-ptz { margin: 0.1000rem 0; border: 1px solid rgba(107,142,173,0.22); border-radius: 0.0400rem; overflow: hidden; }
.ptz-header { display: flex; justify-content: space-between; align-items: center; padding: 0.0600rem 0.1000rem; background: rgba(0,0,0,0.3); font-size: 0.1100rem; color: var(--hud-text-dim); }
.ptz-live { color: #EF4444; font-size: 0.1000rem; }
.ptz-view { height: 1.4000rem; background-size: cover; background-position: center; position: relative; cursor: pointer; }
.ptz-crosshair { position: absolute; top: 50%; left: 50%; width: 0.2000rem; height: 0.2000rem; transform: translate(-50%, -50%); }
.ptz-crosshair::before, .ptz-crosshair::after { content: ""; position: absolute; background: rgba(197,168,123,0.7); }
.ptz-crosshair::before { top: 50%; left: 0; right: 0; height: 1px; }
.ptz-crosshair::after { left: 50%; top: 0; bottom: 0; width: 1px; }
.ptz-overlay-text { position: absolute; bottom: 0.0600rem; left: 0.0800rem; font-size: 0.1000rem; color: #cfe3f7; font-family: var(--hud-mono); background: rgba(0,0,0,0.5); padding: 0.0200rem 0.0600rem; border-radius: 0.0200rem; }
.ptz-action { padding: 0.0600rem 0.1000rem; background: rgba(0,0,0,0.3); }
.ptz-control-entry { width: 100%; padding: 0.0600rem; background: rgba(197,168,123,0.15); border: 1px solid rgba(197,168,123,0.4); color: var(--hud-accent); border-radius: 0.0300rem; cursor: pointer; font-size: 0.1100rem; letter-spacing: 1px; }
.ptz-control-entry:hover { background: rgba(197,168,123,0.25); }
.popup-metrics-section { margin-top: 0.1000rem; }
.popup-metrics-title { font-size: 0.1100rem; color: var(--hud-accent); margin-bottom: 0.0600rem; letter-spacing: 1px; }
.env-realtime-grid { display: grid; gap: 0.0600rem; }
.env-realtime-grid.two-columns { grid-template-columns: 1fr 1fr; }
.env-rt-card { display: flex; align-items: center; gap: 0.0600rem; padding: 0.0600rem 0.0800rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(107,142,173,0.18); border-radius: 0.0300rem; }
.env-rt-icon { font-size: 0.1200rem; }
.env-rt-name { flex: 1; font-size: 0.1000rem; color: var(--hud-text-dim); }
.env-rt-val { font-size: 0.1100rem; color: var(--hud-text); font-family: var(--hud-mono); }
.slide-in { animation: slideIn 0.3s ease; }
@keyframes slideIn { from { opacity: 0; transform: translateY(0.0600rem); } to { opacity: 1; transform: translateY(0); } }
</style>
