<script setup lang="ts">
// EnvMetricModal —— 环境指标历史弹窗（复刻参考页面 env-metric-modal）
// 含：指标选择 + 7/30 天切换 + 历史折线图（mock）

import { computed, ref } from "vue"
import { useDashboard } from "@/composables/useDashboard"

const { currentMonitorPoint, envMetricModalKey, envMetricModalRange, closeEnvMetricModal } = useDashboard()

const range = ref<number>(envMetricModalRange.value)
const metricKey = ref<string>(envMetricModalKey.value)

const metrics = computed(() => currentMonitorPoint.value?.metrics ?? {})
const currentMetric = computed(() => metrics.value[metricKey.value])

const metricKeys = computed(() => Object.keys(metrics.value))

// mock 历史数据（7天/30天）
const historyLabels = computed(() => {
  const n = range.value === 7 ? 7 : 30
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
})

const historyValues = computed(() => {
  const base = currentMetric.value?.value ?? "0"
  const numBase = parseFloat(base) || 0
  const n = range.value === 7 ? 7 : 30
  return Array.from({ length: n }, (_, i) => {
    const jitter = (Math.sin(i * 1.3) * 0.15 + Math.cos(i * 0.7) * 0.1) * numBase
    return Math.max(0, numBase + jitter)
  })
})

// SVG 折线图
const chartWidth = 600
const chartHeight = 200
const chartPadding = 40

const polylinePoints = computed(() => {
  const vals = historyValues.value
  const max = Math.max(...vals, 1)
  const min = Math.min(...vals, 0)
  const rangeY = max - min || 1
  return vals.map((v, i) => {
    const x = chartPadding + (i / (vals.length - 1)) * (chartWidth - 2 * chartPadding)
    const y = chartHeight - chartPadding - ((v - min) / rangeY) * (chartHeight - 2 * chartPadding)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")
})

const yTicks = computed(() => {
  const vals = historyValues.value
  const max = Math.max(...vals, 1)
  const min = Math.min(...vals, 0)
  const rangeY = max - min || 1
  return [0, 0.25, 0.5, 0.75, 1].map((p) => {
    const val = min + p * rangeY
    const y = chartHeight - chartPadding - p * (chartHeight - 2 * chartPadding)
    return { y, label: val.toFixed(1) }
  })
})
</script>

<template>
  <div class="env-modal-mask" @click.self="closeEnvMetricModal">
    <div class="env-modal">
      <div class="env-modal-close" @click="closeEnvMetricModal">×</div>
      <div class="env-modal-header">
        <h3 class="env-modal-title">环境指标历史 · {{ currentMetric?.label ?? metricKey }}</h3>
      </div>
      <div class="env-modal-body">
        <div class="env-controls">
          <div class="env-metric-tabs">
            <button v-for="k in metricKeys" :key="k" class="env-m-tab" :class="{ active: metricKey === k }" @click="metricKey = k">{{ metrics[k]?.icon }} {{ metrics[k]?.label }}</button>
          </div>
          <div class="env-range-tabs">
            <button class="env-r-tab" :class="{ active: range === 7 }" @click="range = 7">近7天</button>
            <button class="env-r-tab" :class="{ active: range === 30 }" @click="range = 30">近30天</button>
          </div>
        </div>
        <div class="env-chart-container">
          <svg :width="chartWidth" :height="chartHeight" class="env-chart">
            <!-- Y 轴 -->
            <line :x1="chartPadding" :y1="chartPadding" :x2="chartPadding" :y2="chartHeight - chartPadding" stroke="rgba(107,142,173,0.3)" stroke-width="1" />
            <!-- X 轴 -->
            <line :x1="chartPadding" :y1="chartHeight - chartPadding" :x2="chartWidth - chartPadding" :y2="chartHeight - chartPadding" stroke="rgba(107,142,173,0.3)" stroke-width="1" />
            <!-- Y 刻度 -->
            <text v-for="tick in yTicks" :key="tick.label" :x="chartPadding - 6" :y="tick.y + 4" text-anchor="end" fill="#94A3B8" font-size="10">{{ tick.label }}</text>
            <!-- 折线 -->
            <polyline :points="polylinePoints" fill="none" stroke="#C5A87B" stroke-width="2" stroke-linejoin="round" />
            <!-- 数据点 -->
            <circle v-for="(p, i) in polylinePoints.split(' ')" :key="i" :cx="p.split(',')[0]" :cy="p.split(',')[1]" r="3" fill="#C5A87B" />
            <!-- X 标签（间隔显示） -->
            <text v-for="(label, i) in historyLabels" :key="i" v-show="i % Math.ceil(historyLabels.length / 7) === 0" :x="chartPadding + (i / (historyLabels.length - 1)) * (chartWidth - 2 * chartPadding)" :y="chartHeight - chartPadding + 16" text-anchor="middle" fill="#94A3B8" font-size="10">{{ label }}</text>
          </svg>
        </div>
        <div class="env-current">
          <span class="env-current-label">当前值</span>
          <span class="env-current-value">{{ currentMetric?.value ?? "--" }}</span>
          <span class="env-current-unit">{{ currentMetric?.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.env-modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(0.1rem); }
.env-modal { width: 90%; max-width: 7rem; background: rgba(10,16,26,0.92); border: 1px solid rgba(197,168,123,0.4); border-radius: 0.08rem; padding: 0.24rem; position: relative; }
.env-modal-close { position: absolute; top: 0.16rem; right: 0.2rem; font-size: 0.28rem; color: #fff; cursor: pointer; }
.env-modal-header { margin-bottom: 0.2rem; padding-bottom: 0.16rem; border-bottom: 1px solid rgba(107,142,173,0.22); }
.env-modal-title { margin: 0; font-size: 0.18rem; color: var(--hud-accent); letter-spacing: 0.02rem; }
.env-controls { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.16rem; gap: 0.12rem; }
.env-metric-tabs { display: flex; flex-wrap: wrap; gap: 0.06rem; }
.env-m-tab { padding: 0.04rem 0.1rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 0.03rem; cursor: pointer; font-size: 0.11rem; }
.env-m-tab.active { color: var(--hud-accent); border-color: var(--hud-accent); background: rgba(197,168,123,0.12); }
.env-range-tabs { display: flex; gap: 0.06rem; }
.env-r-tab { padding: 0.04rem 0.1rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 0.03rem; cursor: pointer; font-size: 0.11rem; }
.env-r-tab.active { color: #00E5FF; border-color: #00E5FF; background: rgba(0,229,255,0.12); }
.env-chart-container { background: rgba(0,0,0,0.3); border-radius: 0.04rem; padding: 0.12rem; overflow-x: auto; }
.env-chart { width: 100%; max-width: 6rem; height: auto; }
.env-current { display: flex; align-items: center; gap: 0.12rem; margin-top: 0.12rem; padding: 0.1rem; background: rgba(0,0,0,0.3); border-radius: 0.04rem; }
.env-current-label { font-size: 0.11rem; color: var(--hud-text-dim); }
.env-current-value { font-size: 0.2rem; color: var(--hud-accent); font-family: var(--hud-mono); }
.env-current-unit { font-size: 0.11rem; color: var(--hud-text-dim); }
</style>
