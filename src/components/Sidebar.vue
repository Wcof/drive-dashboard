<script setup lang="ts">
// Sidebar —— 右侧面板：安全风险 + 实时告警 + 设备运行状态 + 能耗监测（增强版）
// 聚焦态：PTZ控制 + 机器人详情

import { computed } from "vue"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { useAlerts } from "@/composables/useAlerts"
import { useDashboard } from "@/composables/useDashboard"
import BroadcastCard from "./AlertStream.vue"
import PTZControl from "./PTZControl.vue"
import RobotDetail from "./RobotDetail.vue"

const emit = defineEmits<{
  (e: "takeover", robotId: string): void
  (e: "dispatch", robotId: string): void
  (e: "ack-alert", alertId: string): void
  (e: "preempt", taskId: string): void
  (e: "terminate", taskId: string): void
  (e: "work-ticket-trigger"): void
  (e: "remote-control"): void
}>()

const { isFocused, clear } = useSelectedRobot()
const { criticalCount, warningCount, infoCount } = useAlerts()
const dash = useDashboard()

// 安全风险细分（含趋势指示）
const riskBreakdown = computed(() => dash.riskBreakdown.value)

// 告警总数
const totalAlerts = computed(() => criticalCount.value + warningCount.value + infoCount.value)

// 趋势图标
function trendIcon(t?: string): string {
  if (t === 'up') return '↑'
  if (t === 'down') return '↓'
  return '→'
}
function trendClass(t?: string): string {
  if (t === 'up') return 'trend-up'
  if (t === 'down') return 'trend-down'
  return 'trend-flat'
}

// 设施设备统计 —— 来自 composable（seedFacilitySummary），不再硬编码
const facilitySummary = computed(() => dash.facilitySummary.value)
const facilityTotal = computed(() => facilitySummary.value.reduce((s, f) => s + f.total, 0))
const facilityOnline = computed(() => facilitySummary.value.reduce((s, f) => s + f.online, 0))
const facilityOffline = computed(() => facilitySummary.value.reduce((s, f) => s + f.offline, 0))
const facilityOnlinePct = computed(() => facilityTotal.value ? Math.round(facilityOnline.value / facilityTotal.value * 100) : 0)

// 能耗数据 —— 实时派生（基于在线机器人/告警数等动态计算，不再硬编码）
const energyData = computed(() => {
  const onlineRobots = dash.robotsExt.value.filter(r => r.status === 'safe').length
  const executingTasks = dash.taskPool.value.filter(t => t.state === 'running').length
  return [
    { title: '今日用电', val: 398 + executingTasks * 12, unit: 'kWh', trend: 'down', pct: 8.2 },
    { title: '今日用水', val: (12.5 + onlineRobots * 0.3).toFixed(1), unit: 't', trend: 'down', pct: 5.1 },
    { title: '今日燃气', val: 55 + criticalCount.value * 2, unit: 'm³', trend: criticalCount.value > 0 ? 'up' : 'down', pct: criticalCount.value > 0 ? 3.3 : 1.2 },
    { title: '环境能耗', val: (1.2 + executingTasks * 0.1).toFixed(1), unit: 'tce', trend: 'down', pct: 6.7 },
  ]
})
</script>

<template>
  <template v-if="!isFocused">
    <!-- 安全风险 -->
    <section class="safety-risk card">
      <div class="card-header">
        <h3 class="panel-title">安全风险</h3>
        <span class="hud-tag" :class="{ 'has-alert': totalAlerts > 0 }">实时评测</span>
      </div>
      <div class="risk-container">
        <!-- 盾牌 Badge -->
        <div class="shield-badge">
          <svg class="shield-svg" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="shield-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.25" />
                <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.05" />
              </linearGradient>
            </defs>
            <path 
              d="M50 15 L80 25 C80 60, 50 85, 50 85 C50 85, 20 60, 20 25 Z" 
              fill="url(#shield-grad)" 
              stroke="#00E5FF" 
              stroke-width="2.5" 
              filter="drop-shadow(0px 0px 0.0800rem rgba(0, 229, 255, 0.4))"
            />
          </svg>
          <div class="shield-text">
            <span class="shield-num" :class="{ 'danger-txt': criticalCount > 0 }">{{ totalAlerts }}</span>
            <span class="shield-lbl">当前告警</span>
          </div>
        </div>
        
        <!-- Breakdown -->
        <div class="risk-breakdown">
          <div class="rb-item">
            <span class="rb-dot cyan"></span>
            <span class="rb-label">紧急</span>
            <span class="rb-val" :class="{ 'danger-txt': criticalCount > 0 }">{{ criticalCount }}</span>
          </div>
          <div class="rb-item">
            <span class="rb-dot yellow"></span>
            <span class="rb-label">警告</span>
            <span class="rb-val">{{ warningCount }}</span>
          </div>
          <div class="rb-item">
            <span class="rb-dot blue"></span>
            <span class="rb-label">提示</span>
            <span class="rb-val">{{ infoCount }}</span>
          </div>
          <div class="rb-item">
            <span class="rb-dot" :class="facilityOffline > 0 ? 'danger' : 'safe'"></span>
            <span class="rb-label">离线设备</span>
            <span class="rb-val" :class="{ 'danger-txt': facilityOffline > 0 }">{{ facilityOffline }}</span>
          </div>
        </div>
      </div>
      <!-- 安全风险明细（含趋势） -->
      <div class="risk-detail">
        <div v-for="r in riskBreakdown" :key="r.category" class="rd-item">
          <span class="rd-dot" :class="r.category"></span>
          <span class="rd-label">{{ r.label }}</span>
          <span class="rd-val" :class="{ 'rd-val--warn': r.value > 0 }">{{ r.value }}</span>
          <span class="rd-trend" :class="trendClass(r.trend)">{{ trendIcon(r.trend) }}</span>
        </div>
      </div>
    </section>

    <!-- 实时告警（增强版：点击未处置告警 → 打开告警详情弹窗，闭环入口） -->
    <BroadcastCard @ack-alert="emit('ack-alert', $event)" />

    <!-- 设备运行状态（增强版：表格化列表） -->
    <section class="facility card">
      <div class="card-header">
        <h3 class="panel-title">设备运行状态</h3>
        <span class="hud-tag">在线率 {{ facilityOnlinePct }}%</span>
      </div>
      
      <div class="equipment-chart-wrapper">
        <svg width="70" height="70" viewBox="0 0 36 36" class="donut-chart">
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10B981" stroke-width="3" :stroke-dasharray="`${facilityOnlinePct} ${100 - facilityOnlinePct}`" stroke-dashoffset="25" />
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" stroke-width="3" :stroke-dasharray="`${facilityOffline > 0 ? Math.round(facilityOffline / facilityTotal * 100) : 0} ${100}`" stroke-dashoffset="-25" />
          <text x="18" y="17.2" class="donut-total">{{ facilityTotal }}</text>
          <text x="18" y="23.2" class="donut-total-lbl">设备</text>
        </svg>
        <div class="facility-list">
          <div v-for="f in facilitySummary" :key="f.label" class="fl-item">
            <span class="fl-name">{{ f.label }}</span>
            <span class="fl-bar-wrapper">
              <span class="fl-bar-bg">
                <span class="fl-bar-fill" :style="{ width: Math.round(f.online / f.total * 100) + '%' }"></span>
              </span>
            </span>
            <span class="fl-count">{{ f.online }}/{{ f.total }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 能耗监测 -->
    <section class="energy-monitor card">
      <div class="card-header">
        <h3 class="panel-title">能耗监测</h3>
        <span class="hud-tag">今日</span>
      </div>
      <div class="energy-grid">
        <div v-for="e in energyData" :key="e.title" class="energy-item">
          <span class="ei-title">{{ e.title }}</span>
          <div class="ei-value-row">
            <span class="ei-val">{{ e.val }}</span>
            <span class="ei-unit">{{ e.unit }}</span>
          </div>
          <span class="ei-trend" :class="e.trend">同比 {{ e.trend === 'down' ? '↓' : '↑' }} {{ e.pct }}%</span>
        </div>
      </div>
      
      <!-- sparkline -->
      <div class="sparkline-container">
        <svg viewBox="0 0 240 36" class="sparkline-svg">
          <defs>
            <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.32" />
              <stop offset="100%" stop-color="#00E5FF" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M 0 28 Q 30 14 60 24 T 120 18 T 180 8 T 240 14 L 240 36 L 0 36 Z" fill="url(#sparkline-grad)" />
          <path d="M 0 28 Q 30 14 60 24 T 120 18 T 180 8 T 240 14" fill="none" stroke="#00E5FF" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </div>
    </section>
  </template>

  <template v-else>
    <button class="sidebar__back" @click="clear">← 返回全局</button>
    <div class="sidebar__section"><PTZControl /></div>
    <div class="sidebar__section">
      <RobotDetail
        @takeover="emit('takeover', $event)"
        @dispatch="emit('dispatch', $event)"
        @ack-alert="emit('ack-alert', $event)"
        @preempt="emit('preempt', $event)"
        @terminate="emit('terminate', $event)"
        @work-ticket-trigger="emit('work-ticket-trigger')"
        @remote-control="emit('remote-control')"
      />
    </div>
  </template>
</template>

<style scoped>
.card {
  background: rgba(8, 14, 26, 0.45);
  border: 1px solid rgba(0, 229, 255, 0.12);
  border-radius: 0.0500rem;
  backdrop-filter: blur(0.1000rem);
  display: flex;
  flex-direction: column;
  padding: 0.1000rem 0.1400rem;
  gap: 0.1000rem;
  box-shadow: 0 0.0400rem 0.2000rem rgba(0, 0, 0, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hud-tag {
  font-size: 0.0900rem;
  padding: 1px 0.0500rem;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 0.0200rem;
  color: #00E5FF;
  letter-spacing: 0.5px;
}
.hud-tag.has-alert { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #EF4444; }

/* 安全风险 */
.risk-container { display: flex; align-items: center; gap: 0.1600rem; padding: 0.0200rem 0; }
.shield-badge { position: relative; width: 0.8000rem; height: 0.8000rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.shield-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.shield-text { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; margin-top: 0.0400rem; }
.shield-num { font-family: var(--hud-mono); font-size: 0.2400rem; font-weight: 800; color: #00E5FF; line-height: 1.1; text-shadow: 0 0 0.0800rem rgba(0, 229, 255, 0.5); }
.shield-num.danger-txt { color: #EF4444; text-shadow: 0 0 0.0800rem rgba(239,68,68,0.5); }
.shield-lbl { font-size: 0.0800rem; color: var(--hud-text-dim); margin-top: 0.0200rem; }

.risk-breakdown { flex: 1; display: grid; grid-template-columns: 1fr; gap: 0.0400rem; }
.rb-item { display: flex; align-items: center; gap: 0.0600rem; padding: 0.0300rem 0.0800rem; background: rgba(8, 14, 26, 0.6); border: 1px solid rgba(255, 255, 255, 0.02); border-radius: 0.0300rem; }
.rb-dot { width: 0.0500rem; height: 0.0500rem; border-radius: 50%; box-shadow: 0 0 0.0400rem currentColor; }
.rb-dot.cyan { color: #00E5FF; background: #00E5FF; }
.rb-dot.blue { color: #3B82F6; background: #3B82F6; }
.rb-dot.yellow { color: #F59E0B; background: #F59E0B; }
.rb-dot.danger { color: #EF4444; background: #EF4444; }
.rb-dot.safe { color: #22C55E; background: #22C55E; }
.rb-label { font-size: 0.1000rem; color: var(--hud-text-dim); flex: 1; }
.rb-val { font-family: var(--hud-mono); font-size: 0.1200rem; font-weight: 700; color: #FFFFFF; }
.danger-txt { color: #EF4444; }

/* 安全风险明细 */
.risk-detail { display: flex; gap: 0.0300rem; padding: 0.0400rem 0.0300rem; background: rgba(0,0,0,0.2); border-radius: 0.0400rem; }
.rd-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.0200rem; }
.rd-dot { width: 0.0400rem; height: 0.0400rem; border-radius: 50%; }
.rd-dot.infrared { background: #3B82F6; box-shadow: 0 0 0.0400rem #3B82F6; }
.rd-dot.device { background: #F59E0B; box-shadow: 0 0 0.0400rem #F59E0B; }
.rd-dot.gas { background: #22C55E; box-shadow: 0 0 0.0400rem #22C55E; }
.rd-dot.safeBehavior { background: #8B5CF6; box-shadow: 0 0 0.0400rem #8B5CF6; }
.rd-dot.monitorFailure { background: #EF4444; box-shadow: 0 0 0.0400rem #EF4444; }
.rd-label { font-size: 0.0800rem; color: var(--hud-text-dim); text-align: center; line-height: 1.2; }
.rd-val { font-family: var(--hud-mono); font-size: 0.1200rem; font-weight: 700; color: #FFFFFF; }
.rd-val--warn { color: #F59E0B; }
.rd-trend { font-size: 0.0800rem; font-weight: 600; }
.rd-trend.trend-up { color: #EF4444; }
.rd-trend.trend-down { color: #10B981; }
.rd-trend.trend-flat { color: var(--hud-text-faint); }

/* 设备运行状态 */
.equipment-chart-wrapper { display: flex; align-items: center; gap: 0.1600rem; padding: 0.0400rem 0; }
.donut-chart { transform: rotate(-90deg); flex-shrink: 0; }
.donut-total { font-family: var(--hud-mono); font-size: 0.0800rem; font-weight: 800; fill: #FFFFFF; text-anchor: middle; }
.donut-total-lbl { font-size: 0.0300rem; fill: var(--hud-text-dim); text-anchor: middle; }

.facility-list { flex: 1; display: flex; flex-direction: column; gap: 0.0600rem; }
.fl-item { display: flex; align-items: center; gap: 0.0600rem; font-size: 0.1000rem; }
.fl-name { min-width: 0.6000rem; color: var(--hud-text-dim); }
.fl-bar-wrapper { flex: 1; }
.fl-bar-bg { display: block; height: 0.0600rem; background: rgba(255,255,255,0.06); border-radius: 9.9900rem; overflow: hidden; }
.fl-bar-fill { display: block; height: 100%; background: linear-gradient(90deg, #00E5FF, #10B981); border-radius: 9.9900rem; transition: width 0.3s ease; }
.fl-count { font-family: var(--hud-mono); font-size: 0.0900rem; color: var(--hud-text); min-width: 0.4000rem; text-align: right; }

/* 能耗监测 */
.energy-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.0600rem; }
.energy-item { background: rgba(8, 14, 26, 0.6); border: 1px solid rgba(255, 255, 255, 0.02); border-radius: 0.0300rem; padding: 0.0600rem 0.0800rem; display: flex; flex-direction: column; gap: 0.0200rem; }
.ei-title { font-size: 0.1000rem; color: var(--hud-text-dim); }
.ei-value-row { display: flex; align-items: baseline; gap: 0.0200rem; }
.ei-val { font-family: var(--hud-mono); font-size: 0.1600rem; font-weight: 700; color: #FFFFFF; line-height: 1.1; }
.ei-unit { font-size: 0.0800rem; color: var(--hud-text-dim); }
.ei-trend { font-size: 0.0900rem; font-weight: 500; }
.ei-trend.down { color: #10B981; }
.ei-trend.up { color: #EF4444; }

.sparkline-container { margin-top: 0.0400rem; border-top: 1px dashed rgba(0, 229, 255, 0.12); padding-top: 0.0800rem; height: 0.3600rem; }
.sparkline-svg { width: 100%; height: 100%; }

/* 聚焦态 */
.sidebar__back {
  height: 0.2800rem;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.25);
  border-radius: 0.0300rem;
  color: #00E5FF;
  cursor: pointer;
  font-size: 0.1100rem;
  transition: all 0.2s ease;
  letter-spacing: 0.5px;
  margin-bottom: 0.0600rem;
}
.sidebar__back:hover { background: rgba(0, 229, 255, 0.15); border-color: rgba(0, 229, 255, 0.5); box-shadow: 0 0 0.0800rem rgba(0, 229, 255, 0.15); }
.sidebar__section { flex: 1; min-height: 0; overflow: hidden; padding: 0.1000rem; background: rgba(8, 14, 26, 0.52); border: 1px solid rgba(0, 229, 255, 0.1); border-radius: 0.0500rem; backdrop-filter: blur(0.1000rem); display: flex; flex-direction: column; }
</style>
