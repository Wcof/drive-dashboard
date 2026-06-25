<script setup lang="ts">
// ApPopup —— AP 设备弹窗（复刻参考页面 showApPopup）
// 含：信号强度 + 信道 + 频段 + 在线用户 + 运行时长

import { computed } from "vue"
import { useDashboard } from "@/composables/useDashboard"

const props = defineProps<{ apId: string }>()
const { apDevices } = useDashboard()

const ap = computed(() => apDevices.value.find((a) => a.id === props.apId) ?? null)

const statusMap: Record<string, string> = { safe: "正常", warn: "信号弱", danger: "离线" }
const statusTag: Record<string, string> = { safe: "safe", warn: "warn", danger: "warn" }
const signalColor = computed(() => {
  if (!ap.value) return "#94A3B8"
  const dBm = parseInt(ap.value.signal)
  if (dBm > -60) return "#22C55E"
  if (dBm > -75) return "#F59E0B"
  return "#EF4444"
})
</script>

<template>
  <div v-if="ap" class="map-popup">
    <div class="popup-header">
      <span class="popup-title">{{ ap.name }}</span>
      <span class="tag" :class="statusTag[ap.status]">{{ statusMap[ap.status] }}</span>
      <span class="popup-close-btn" @click="$emit('close')">✕</span>
    </div>
    <div class="popup-body">
      <div class="popup-stats">
        <div class="popup-stat"><span class="popup-stat-label">设备 ID</span><span class="popup-stat-value">{{ ap.id }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">所属区域</span><span class="popup-stat-value">{{ ap.area }} 区</span></div>
        <div class="popup-stat"><span class="popup-stat-label">信号强度</span><span class="popup-stat-value" :style="{ color: signalColor }">{{ ap.signal }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">工作信道</span><span class="popup-stat-value">{{ ap.channel }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">工作频段</span><span class="popup-stat-value">{{ ap.band }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">在线用户</span><span class="popup-stat-value">{{ ap.users }} 个</span></div>
        <div class="popup-stat"><span class="popup-stat-label">运行时长</span><span class="popup-stat-value">{{ ap.uptime }}</span></div>
        <div class="popup-stat"><span class="popup-stat-label">位置坐标</span><span class="popup-stat-value">{{ ap.coords[0].toFixed(4) }}, {{ ap.coords[1].toFixed(4) }}</span></div>
      </div>
      <div class="ap-signal-bar">
        <div class="ap-signal-label">信号质量</div>
        <div class="ap-signal-track">
          <div class="ap-signal-fill" :style="{ width: ap.status === 'safe' ? '85%' : ap.status === 'warn' ? '50%' : '15%', background: signalColor }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-popup { width: 3.4000rem; background: rgba(10,16,26,0.92); border: 1px solid rgba(197,168,123,0.4); border-radius: 0.0800rem; box-shadow: 0 0.1200rem 0.4000rem rgba(0,0,0,0.6); color: var(--hud-text); font-size: 0.1200rem; }
.popup-header { display: flex; align-items: center; gap: 0.0800rem; padding: 0.1000rem 0.1400rem; border-bottom: 1px solid rgba(197,168,123,0.22); }
.popup-title { font-size: 0.1300rem; color: var(--hud-text); font-weight: 500; letter-spacing: 1px; }
.tag { padding: 0.0200rem 0.0800rem; border-radius: 0.0300rem; font-size: 0.1100rem; }
.tag.safe { background: rgba(34,197,94,0.18); color: #22C55E; border: 1px solid rgba(34,197,94,0.4); }
.tag.warn { background: rgba(245,158,11,0.18); color: #F59E0B; border: 1px solid rgba(245,158,11,0.4); }
.popup-close-btn { margin-left: auto; cursor: pointer; color: var(--hud-text-dim); font-size: 0.1400rem; }
.popup-body { padding: 0.1200rem 0.1400rem; }
.popup-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.0800rem; margin-bottom: 0.1200rem; }
.popup-stat { display: flex; flex-direction: column; gap: 0.0200rem; }
.popup-stat-label { font-size: 0.1000rem; color: var(--hud-text-dim); letter-spacing: 0.5px; }
.popup-stat-value { font-size: 0.1200rem; color: var(--hud-text); }
.ap-signal-bar { margin-top: 0.0800rem; }
.ap-signal-label { font-size: 0.1000rem; color: var(--hud-text-dim); margin-bottom: 0.0400rem; }
.ap-signal-track { height: 0.0600rem; background: rgba(255,255,255,0.08); border-radius: 0.0300rem; overflow: hidden; }
.ap-signal-fill { height: 100%; border-radius: 0.0300rem; transition: all 0.3s ease; }
</style>
