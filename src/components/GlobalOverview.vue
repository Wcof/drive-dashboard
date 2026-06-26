<script setup lang="ts">
// GlobalOverview —— 左面板：总体运营概览 + 巡检总览 + 机器人总览 + 环境监测

import { computed, ref } from "vue"
import { useRobots } from "@/composables/useRobots"
import { ROBOT_MILEAGE_KM } from "@/mock/seedDashboard"

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

// 巡检总览 —— 4 类巡检任务统计（复刻参考页面）
const planSummary = {
  routine: { total: 3, running: 2 },
  security: { total: 1, running: 1 },
  temp: { total: 0, pending: 0 },
  exception: { total: 17, pending: 17 },
}

// 机器人总览 —— 列表式（带电量条），复刻参考页面 robot-overview
const robotStatusMap: Record<string, { label: string; cls: string }> = {
  executing: { label: '运行中', cls: 'safe' },
  returning: { label: '返航中', cls: 'warn' },
  charging: { label: '充电中', cls: 'charging' },
  standby: { label: '待命', cls: 'standby' },
  error: { label: '故障', cls: 'danger' },
}
const robotList = computed(() => robots.value.map(r => {
  const s = r.status === 'error' ? 'error'
    : r.status === 'charging' ? 'charging'
    : r.status === 'returning' ? 'returning'
    : r.currentTaskId ? 'executing' : 'standby'
  const label = r.name || r.id
  const battery = Math.max(5, Math.min(100, r.batteryLevel ?? (s === 'error' ? 12 : s === 'returning' ? 32 : s === 'charging' ? 64 : 89)))
  return { id: r.id, label, statusKey: s, status: robotStatusMap[s], battery }
}))
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

  <!-- 巡检总览（复刻参考页面 plan-summary-cards：4类巡检任务） -->
  <section class="plan-summary card">
    <div class="card-header">
      <h3 class="panel-title">巡检总览</h3>
    </div>
    <div class="plan-cards">
      <div class="plan-card">
        <div class="plan-card__head"><span class="plan-dot plan-dot--cyan"></span>例行巡检</div>
        <div class="plan-card__total">{{ planSummary.routine.total }}<span class="unit">项</span></div>
        <div class="plan-card__sub">执行中 <em>{{ planSummary.routine.running }}</em></div>
      </div>
      <div class="plan-card">
        <div class="plan-card__head"><span class="plan-dot plan-dot--blue"></span>自主安保</div>
        <div class="plan-card__total">{{ planSummary.security.total }}<span class="unit">项</span></div>
        <div class="plan-card__sub">执行中 <em>{{ planSummary.security.running }}</em></div>
      </div>
      <div class="plan-card">
        <div class="plan-card__head"><span class="plan-dot plan-dot--gray"></span>临时巡检</div>
        <div class="plan-card__total">{{ planSummary.temp.total }}<span class="unit">项</span></div>
        <div class="plan-card__sub">待调度 <em>{{ planSummary.temp.pending }}</em></div>
      </div>
      <div class="plan-card plan-card--warn">
        <div class="plan-card__head"><span class="plan-dot plan-dot--warn"></span>异常巡查</div>
        <div class="plan-card__total warn-txt">{{ planSummary.exception.total }}<span class="unit">项</span></div>
        <div class="plan-card__sub">待处理 <em class="warn-txt">{{ planSummary.exception.pending }}</em></div>
      </div>
    </div>
  </section>

  <!-- 机器人总览（复刻参考页面 robot-overview：列表 + 电量条） -->
  <section class="robot-overview card">
    <div class="card-header">
      <h3 class="panel-title">机器人总览</h3>
      <div class="rs-total">总里程: <strong>{{ totalMileage }}km</strong></div>
    </div>
    <div class="robot-list">
      <div v-for="rb in robotList" :key="rb.id" class="robot-row" :class="rb.status.cls">
        <span class="robot-row__status-dot" :class="rb.status.cls"></span>
        <div class="robot-row__main">
          <div class="robot-row__head">
            <span class="robot-row__name">{{ rb.label }}</span>
            <span class="robot-row__status-tag" :class="rb.status.cls">{{ rb.status.label }}</span>
          </div>
          <div class="robot-row__battery">
            <div class="battery-bar">
              <div class="battery-fill" :class="rb.status.cls" :style="{ width: rb.battery + '%' }"></div>
            </div>
            <span class="battery-val">{{ rb.battery }}%</span>
          </div>
        </div>
      </div>
    </div>
    <div class="robot-overview__stats">
      <div class="ros-item"><span class="ros-label">今日里程</span><span class="ros-val">{{ todayMileage }}<em>km</em></span></div>
      <div class="ros-item"><span class="ros-label">平均时速</span><span class="ros-val">{{ avgSpeed }}<em>km/h</em></span></div>
      <div class="ros-item"><span class="ros-label">执行/返航</span><span class="ros-val">{{ robotBiz.executing }}/{{ robotBiz.returning }}</span></div>
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

/* 巡检总览 —— 4 类任务卡 */
.plan-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.0800rem; }
.plan-card {
  padding: 0.1000rem 0.1200rem; border-radius: 0.0600rem;
  background: linear-gradient(135deg, rgba(8, 14, 26, 0.8) 0%, rgba(5, 8, 16, 0.5) 100%);
  border: 1px solid rgba(0, 229, 255, 0.15);
  display: flex; flex-direction: column; gap: 0.0400rem;
  transition: all 0.2s ease;
}
.plan-card:hover { border-color: rgba(0, 229, 255, 0.35); transform: translateY(-1px); }
.plan-card--warn { border-color: rgba(245, 158, 11, 0.3); }
.plan-card--warn:hover { border-color: rgba(245, 158, 11, 0.5); }
.plan-card__head { display: flex; align-items: center; gap: 0.0600rem; font-size: 0.1100rem; color: var(--hud-text-dim); }
.plan-dot { width: 0.0600rem; height: 0.0600rem; border-radius: 50%; box-shadow: 0 0 0.0600rem currentColor; }
.plan-dot--cyan { background: #00E5FF; color: #00E5FF; }
.plan-dot--blue { background: #3B82F6; color: #3B82F6; }
.plan-dot--gray { background: #64748B; color: #64748B; }
.plan-dot--warn { background: #F59E0B; color: #F59E0B; }
.plan-card__total { font-size: 0.2200rem; font-weight: 700; color: #FFFFFF; font-family: var(--hud-mono); line-height: 1.1; }
.plan-card__total .unit { font-size: 0.1000rem; color: var(--hud-text-dim); font-weight: 400; margin-left: 0.0300rem; }
.plan-card__sub { font-size: 0.1000rem; color: var(--hud-text-dim); }
.plan-card__sub em { font-style: normal; color: #00E5FF; font-family: var(--hud-mono); margin-left: 0.0400rem; }
.plan-card--warn .plan-card__sub em { color: #F59E0B; }

/* 机器人总览 —— 列表 + 电量条 */
.robot-list { display: flex; flex-direction: column; gap: 0.0600rem; }
.robot-row {
  display: flex; align-items: center; gap: 0.1000rem;
  padding: 0.0800rem 0.1000rem; border-radius: 0.0600rem;
  background: rgba(8, 14, 26, 0.6); border: 1px solid rgba(0, 229, 255, 0.1);
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}
.robot-row:hover { border-color: rgba(0, 229, 255, 0.25); transform: translateX(2px); }
.robot-row.safe { border-left-color: var(--hud-ok); }
.robot-row.warn { border-left-color: var(--hud-warn); }
.robot-row.charging { border-left-color: var(--hud-info); }
.robot-row.standby { border-left-color: var(--hud-accent-smog); }
.robot-row.danger { border-left-color: var(--hud-danger); background: rgba(239, 68, 68, 0.05); }
.robot-row__status-dot { width: 0.0800rem; height: 0.0800rem; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 0.0600rem currentColor; }
.robot-row__status-dot.safe { background: var(--hud-ok); color: var(--hud-ok); }
.robot-row__status-dot.warn { background: var(--hud-warn); color: var(--hud-warn); }
.robot-row__status-dot.charging { background: var(--hud-info); color: var(--hud-info); }
.robot-row__status-dot.standby { background: var(--hud-accent-smog); color: var(--hud-accent-smog); }
.robot-row__status-dot.danger { background: var(--hud-danger); color: var(--hud-danger); animation: pulseDot 1.2s ease-in-out infinite; }
@keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.robot-row__main { flex: 1; display: flex; flex-direction: column; gap: 0.0400rem; min-width: 0; }
.robot-row__head { display: flex; justify-content: space-between; align-items: center; }
.robot-row__name { font-size: 0.1200rem; color: var(--hud-text); font-weight: 500; }
.robot-row__status-tag { font-size: 0.0900rem; padding: 0.0100rem 0.0600rem; border-radius: 0.0200rem; border: 1px solid transparent; }
.robot-row__status-tag.safe { color: var(--hud-ok); border-color: rgba(16, 185, 129, 0.35); background: rgba(16, 185, 129, 0.08); }
.robot-row__status-tag.warn { color: var(--hud-warn); border-color: rgba(245, 158, 11, 0.35); background: rgba(245, 158, 11, 0.08); }
.robot-row__status-tag.charging { color: var(--hud-info); border-color: rgba(59, 130, 246, 0.35); background: rgba(59, 130, 246, 0.08); }
.robot-row__status-tag.standby { color: var(--hud-accent-smog); border-color: rgba(107, 142, 173, 0.35); background: rgba(107, 142, 173, 0.08); }
.robot-row__status-tag.danger { color: var(--hud-danger); border-color: rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.08); }
.robot-row__battery { display: flex; align-items: center; gap: 0.0600rem; }
.battery-bar { flex: 1; height: 0.0600rem; background: rgba(255, 255, 255, 0.06); border-radius: 9.9900rem; overflow: hidden; }
.battery-fill { height: 100%; border-radius: 9.9900rem; transition: width 0.4s ease; }
.battery-fill.safe { background: linear-gradient(90deg, #10B981, #34D399); }
.battery-fill.warn { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
.battery-fill.charging { background: linear-gradient(90deg, #3B82F6, #60A5FA); }
.battery-fill.standby { background: linear-gradient(90deg, #6B8EAD, #94A3B8); }
.battery-fill.danger { background: linear-gradient(90deg, #EF4444, #F87171); }
.battery-val { font-size: 0.0900rem; color: var(--hud-text-dim); font-family: var(--hud-mono); min-width: 0.3000rem; text-align: right; }

.robot-overview__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.0600rem; margin-top: 0.0800rem; padding-top: 0.0800rem; border-top: 1px solid rgba(107, 142, 173, 0.15); }
.ros-item { display: flex; flex-direction: column; align-items: center; gap: 0.0200rem; }
.ros-label { font-size: 0.0900rem; color: var(--hud-text-dim); }
.ros-val { font-size: 0.1400rem; color: #00E5FF; font-family: var(--hud-mono); font-weight: bold; }
.ros-val em { font-style: normal; font-size: 0.0900rem; color: var(--hud-text-dim); margin-left: 0.0200rem; font-weight: 400; }
</style>
