<script setup lang="ts">
// GlobalOverview —— 左面板：总体运营概览 + 巡检总览 + 机器人总览 + 环境监测

import { computed, ref } from "vue"
import { useRobots } from "@/composables/useRobots"
import { ROBOT_MILEAGE_KM, ATTACHMENT_SUMMARY_BASE } from "@/mock/seedDashboard"

const { robots } = useRobots()

const totalRobots = computed(() => robots.value.length || 5)
const completedToday = ref(1)
const totalFacilityPoints = ref(48)
const totalFailures = computed(() => robots.value.filter(r => r.status === 'error').length || 1)

// 机器人总览统计
const robotBiz = computed(() => {
  const acc: Record<string, number> = { executing: 0, returning: 0, charging: 0, standby: 0, warning: 0 }
  robots.value.forEach(r => {
    const s = r.status === 'error' ? 'warning' : r.status === 'charging' ? 'charging' : r.status === 'returning' ? 'returning' : r.currentTaskId ? 'executing' : 'standby'
    acc[s] = (acc[s] || 0) + 1
  })
  return acc
})
const totalMileage = computed(() => Object.values(ROBOT_MILEAGE_KM).reduce((s, v) => s + v, 0))
const todayMileage = 286
const avgSpeed = computed(() => Math.max(6, robotBiz.value.executing * 2 + robotBiz.value.returning))
const gas = ATTACHMENT_SUMMARY_BASE.gasSensors
const gimbal = ATTACHMENT_SUMMARY_BASE.gimbals
</script>

<template>
  <!-- 总体运营概览 -->
  <section class="overview card">
    <div class="card-header">
      <h3 class="panel-title">总体运营概览</h3>
    </div>
    <div class="kpi-grid">
      <!-- 机器人总数 -->
      <div class="kpi-card">
        <div class="kpi-icon robots-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
            <circle cx="12" cy="5" r="2"></circle>
            <path d="M12 7v4"></path>
            <line x1="8" y1="16" x2="8" y2="16"></line>
            <line x1="16" y1="16" x2="16" y2="16"></line>
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-value">{{ totalRobots }}</div>
          <div class="kpi-label">机器人总数</div>
        </div>
      </div>
      <!-- 今日巡检完成 -->
      <div class="kpi-card">
        <div class="kpi-icon complete-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-value">{{ completedToday }}</div>
          <div class="kpi-label">今日巡检完成</div>
        </div>
      </div>
      <!-- 巡检点总数 -->
      <div class="kpi-card">
        <div class="kpi-icon points-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-value">{{ totalFacilityPoints }}</div>
          <div class="kpi-label">巡检点总数</div>
        </div>
      </div>
      <!-- 累计故障点数 -->
      <div class="kpi-card kpi-card--err">
        <div class="kpi-icon error-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12" y2="17"></line>
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-value danger-txt">{{ totalFailures }}</div>
          <div class="kpi-label">累计故障点数</div>
        </div>
      </div>
    </div>
  </section>

  <!-- 巡检总览（复刻参考页面 plan-summary-cards） -->
  <section class="plan-summary card">
    <div class="card-header">
      <h3 class="panel-title">巡检总览</h3>
    </div>
    <div class="summary-grid four-columns">
      <div class="summary-item"><span class="s-label">巡检点次</span><span class="s-val">68</span><span class="s-meta">今日累计</span></div>
      <div class="summary-item"><span class="s-label">已巡检里程</span><span class="s-val">326km</span><span class="s-meta">巡检里程</span></div>
      <div class="summary-item"><span class="s-label">覆盖率</span><span class="s-val">83%</span><span class="s-meta">当日覆盖</span></div>
      <div class="summary-item"><span class="s-label">检测项</span><span class="s-val">192</span><span class="s-meta">检测项数量</span></div>
      <div class="summary-item"><span class="s-label">设施设备数</span><span class="s-val">62</span><span class="s-meta">纳管设备</span></div>
      <div class="summary-item"><span class="s-label">异常数</span><span class="s-val warn-txt">3</span><span class="s-meta">待跟踪项</span></div>
    </div>
  </section>

  <!-- 机器人总览 -->
  <section class="robot-overview card">
    <div class="card-header">
      <h3 class="panel-title">机器人总览</h3>
      <div class="rs-total">机器人总里程: <strong>{{ totalMileage }}km</strong></div>
    </div>
    <div class="summary-grid four-columns">
      <div class="summary-item"><span class="s-label">执行中/返航中</span><span class="s-val">{{ robotBiz.executing }}/{{ robotBiz.returning }}</span><span class="s-meta">当前状态</span></div>
      <div class="summary-item"><span class="s-label">充电中</span><span class="s-val">{{ robotBiz.charging }}</span><span class="s-meta">充电状态</span></div>
      <div class="summary-item"><span class="s-label">临时任务</span><span class="s-val">3</span><span class="s-meta">临时插单</span></div>
      <div class="summary-item"><span class="s-label">机器人总数</span><span class="s-val">{{ totalRobots }}</span><span class="s-meta">在册机器人</span></div>
      <div class="summary-item"><span class="s-label">今日里程</span><span class="s-val">{{ todayMileage }}km</span><span class="s-meta">总里程 {{ totalMileage }}km</span></div>
      <div class="summary-item"><span class="s-label">平均时速</span><span class="s-val">{{ avgSpeed }}km/h</span><span class="s-meta">当日均值</span></div>
    </div>
    <div class="sub-summary-block">
      <div class="sub-summary-header"><span>气体感应器</span></div>
      <div class="summary-grid three-columns">
        <div class="summary-item"><span class="s-label">传感器总数</span><span class="s-val">{{ gas.total }}</span><span class="s-meta">总数</span></div>
        <div class="summary-item"><span class="s-label">传感器正常</span><span class="s-val">{{ gas.normal }}</span><span class="s-meta">正常</span></div>
        <div class="summary-item"><span class="s-label">传感器异常</span><span class="s-val warn-txt">{{ gas.offline }}</span><span class="s-meta">已掉线</span></div>
      </div>
    </div>
    <div class="sub-summary-block">
      <div class="sub-summary-header"><span>云台</span></div>
      <div class="summary-grid three-columns">
        <div class="summary-item"><span class="s-label">云台总数</span><span class="s-val">{{ gimbal.total }}</span><span class="s-meta">总数</span></div>
        <div class="summary-item"><span class="s-label">云台正常</span><span class="s-val">{{ gimbal.normal }}</span><span class="s-meta">正常</span></div>
        <div class="summary-item"><span class="s-label">云台异常</span><span class="s-val warn-txt">{{ gimbal.offline }}</span><span class="s-meta">已掉线</span></div>
      </div>
    </div>
  </section>

  <!-- 环境监测 -->
  <section class="env-monitor card">
    <div class="card-header">
      <h3 class="panel-title">环境监测</h3>
    </div>
    <div class="gauge-grid">
      <!-- 温度 -->
      <div class="gauge-item">
        <div class="gauge-wrapper">
          <svg viewBox="0 0 36 36" class="circular-chart cyan">
            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="circle" stroke-dasharray="57, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div class="gauge-val">20.5<span class="unit">℃</span></div>
        </div>
        <div class="gauge-label">温度</div>
      </div>
      <!-- 湿度 -->
      <div class="gauge-item">
        <div class="gauge-wrapper">
          <svg viewBox="0 0 36 36" class="circular-chart blue">
            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="circle" stroke-dasharray="45, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div class="gauge-val">45<span class="unit">%RH</span></div>
        </div>
        <div class="gauge-label">湿度</div>
      </div>
      <!-- PM2.5 -->
      <div class="gauge-item">
        <div class="gauge-wrapper">
          <svg viewBox="0 0 36 36" class="circular-chart green">
            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="circle" stroke-dasharray="18, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div class="gauge-val">18<span class="unit">μg/m³</span></div>
        </div>
        <div class="gauge-label">PM2.5</div>
      </div>
      <!-- 噪声 -->
      <div class="gauge-item">
        <div class="gauge-wrapper">
          <svg viewBox="0 0 36 36" class="circular-chart yellow">
            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="circle" stroke-dasharray="52, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div class="gauge-val">52<span class="unit">dB</span></div>
        </div>
        <div class="gauge-label">噪声</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.card {
  background: rgba(8, 14, 26, 0.45);
  border: 1px solid rgba(0, 229, 255, 0.12);
  border-radius: 0.0600rem;
  backdrop-filter: blur(0.1200rem);
  display: flex;
  flex-direction: column;
  padding: 0.1400rem 0.1600rem;
  gap: 0.1200rem;
  box-shadow: 0 0.0400rem 0.2000rem rgba(0, 0, 0, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.1000rem;
}

.kpi-card {
  padding: 0.1000rem 0.1200rem;
  border-radius: 0.0600rem;
  background: linear-gradient(135deg, rgba(8, 14, 26, 0.8) 0%, rgba(5, 8, 16, 0.5) 100%);
  border: 1px solid rgba(0, 229, 255, 0.15);
  display: flex;
  align-items: center;
  gap: 0.1000rem;
  transition: all 0.25s ease;
}

.kpi-card:hover {
  border-color: rgba(0, 229, 255, 0.35);
  box-shadow: 0 0.0400rem 0.1200rem rgba(0, 229, 255, 0.1);
  transform: translateY(-1px);
}

.kpi-card--err {
  border-color: rgba(239, 68, 68, 0.25);
}
.kpi-card--err:hover {
  border-color: rgba(239, 68, 68, 0.45);
  box-shadow: 0 0.0400rem 0.1200rem rgba(239, 68, 68, 0.12);
}

.kpi-icon {
  width: 0.3800rem;
  height: 0.3800rem;
  border-radius: 0.0600rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.robots-icon {
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.25);
  color: #00E5FF;
}

.complete-icon {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #10B981;
}

.points-icon {
  background: rgba(96, 165, 250, 0.08);
  border: 1px solid rgba(96, 165, 250, 0.25);
  color: #60A5FA;
}

.error-icon {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #EF4444;
}

.kpi-content {
  display: flex;
  flex-direction: column;
}

.kpi-value {
  font-size: 0.2000rem;
  font-weight: 700;
  color: #FFFFFF;
  font-family: var(--hud-mono);
  line-height: 1.2;
}

.kpi-label {
  font-size: 0.1100rem;
  color: var(--hud-text-dim);
  margin-top: 0.0200rem;
}

/* 巡检总览 summary-grid */
.summary-grid {
  display: grid;
  gap: 0.0800rem;
}

.summary-grid.four-columns {
  grid-template-columns: repeat(4, 1fr);
}

.summary-item {
  background: rgba(8, 14, 26, 0.6);
  border: 1px solid rgba(0, 229, 255, 0.1);
  border-radius: 0.0600rem;
  padding: 0.0800rem 0.0400rem;
  display: flex;
  flex-direction: column;
  gap: 0.0300rem;
  align-items: center;
  text-align: center;
  transition: all 0.2s ease;
}

.summary-item:hover {
  border-color: rgba(0, 229, 255, 0.25);
  box-shadow: 0 0.0400rem 0.1000rem rgba(0, 229, 255, 0.05);
}

.s-label {
  font-size: 0.1100rem;
  color: var(--hud-text-dim);
  font-weight: 500;
}

.s-val {
  font-size: 0.1800rem;
  font-family: var(--hud-mono);
  color: #00E5FF;
  font-weight: bold;
}

.s-meta {
  font-size: 0.1000rem;
  color: var(--hud-text-faint);
}

.active-count {
  color: #10B981;
  font-weight: 600;
}

/* Gauge Grid for Environment */
.gauge-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.0800rem;
}

.gauge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.0400rem;
}

.gauge-wrapper {
  position: relative;
  width: 0.6000rem;
  height: 0.6000rem;
}

.circular-chart {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.circle-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.05);
  stroke-width: 2.2;
}

.circle {
  fill: none;
  stroke-width: 2.2;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s ease;
}

.cyan .circle { stroke: #00E5FF; }
.blue .circle { stroke: #3B82F6; }
.green .circle { stroke: #10B981; }
.yellow .circle { stroke: #F59E0B; }

.gauge-val {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-family: var(--hud-mono);
  font-size: 0.1100rem;
  font-weight: bold;
  color: #E2E8F0;
  text-shadow: 0 0 0.0400rem rgba(0, 0, 0, 0.6);
}

.gauge-val .unit {
  font-size: 0.0800rem;
  color: var(--hud-text-dim);
  font-weight: 400;
  margin-top: -1px;
}

.gauge-label {
  font-size: 0.1100rem;
  color: var(--hud-text-dim);
}

/* 机器人总览 */
.robot-overview .rs-total { font-size: 0.1000rem; color: var(--hud-text-dim); }
.robot-overview .rs-total strong { color: var(--hud-accent); font-family: var(--hud-mono); }
.sub-summary-block { margin-top: 0.0800rem; }
.sub-summary-header { font-size: 0.1000rem; color: var(--hud-text-dim); margin-bottom: 0.0400rem; border-bottom: 1px solid rgba(107,142,173,0.15); padding-bottom: 0.0300rem; }
.summary-grid.three-columns { grid-template-columns: repeat(3, 1fr); }
.warn-txt { color: #F59E0B; }
</style>
