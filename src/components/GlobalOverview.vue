<script setup lang="ts">
// GlobalOverview —— 左面板：总体运营概览 + 巡检覆盖 + 机器人总览 + 环境监测（增强版）
// 覆盖率和成效展示 + 数据新鲜度

import { computed } from "vue"
import { useRobots } from "@/composables/useRobots"
import { useAlerts } from "@/composables/useAlerts"
import { useTasks } from "@/composables/useTasks"
import { useDashboard } from "@/composables/useDashboard"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { useLockState } from "@/composables/useLockState"
import { InspectionTaskInstanceStatus } from "@/types/inspection"
import { ROBOT_MILEAGE_KM } from "@/mock/seedDashboard"

const { robots } = useRobots()
const { criticalCount, warningCount, infoCount } = useAlerts()
const { tasks } = useTasks()
const dash = useDashboard()
const { select } = useSelectedRobot()
const { isLocked } = useLockState()

const totalRobots = computed(() => robots.value.length)
const onlineRobots = computed(() => robots.value.filter(r => r.status === 'online' || r.status === 'patrolling').length)
const patrollingCount = computed(() => robots.value.filter(r => r.status === 'patrolling').length)

// 巡检覆盖统计
const planSummary = computed(() => {
  const total = tasks.value.length
  const running = tasks.value.filter(t => t.status === InspectionTaskInstanceStatus.RUNNING).length
  const completed = tasks.value.filter(t => t.status === InspectionTaskInstanceStatus.COMPLETED).length
  const pending = tasks.value.filter(t => t.status === InspectionTaskInstanceStatus.PENDING).length
  const failed = tasks.value.filter(t => t.status === InspectionTaskInstanceStatus.FAILED).length
  return { total, running, completed, pending, failed }
})

// 覆盖率计算
const coverageRate = computed(() => {
  const total = planSummary.value.total
  if (total === 0) return 0
  return Math.round((planSummary.value.completed / total) * 100)
})

// 设施覆盖率（来自设施概览数据）
const facilityCoverage = computed(() => {
  const summary = dash.facilitySummary.value
  const total = summary.reduce((s, f) => s + f.total, 0)
  const online = summary.reduce((s, f) => s + f.online, 0)
  return total ? Math.round((online / total) * 100) : 0
})

// 机器人总览汇总
const robotBiz = computed(() => {
  const acc: Record<string, number> = { executing: 0, returning: 0, charging: 0, standby: 0, warning: 0 }
  robots.value.forEach(r => {
    const s = r.status === 'error' ? 'warning' : r.status === 'charging' ? 'charging' : r.status === 'returning' ? 'returning' : r.currentTaskId ? 'executing' : 'standby'
    acc[s] = (acc[s] || 0) + 1
  })
  return acc
})

const totalMileage = computed(() => Object.values(ROBOT_MILEAGE_KM).reduce((s, v) => s + v, 0))
const todayMileage = computed(() => {
  const executing = robotBiz.value.executing
  const avgKmPerRobot = 38
  return executing * avgKmPerRobot + Math.round(totalMileage.value * 0.015)
})
const avgSpeed = computed(() => Math.max(6, robotBiz.value.executing * 2 + robotBiz.value.returning))

const totalAlerts = computed(() => criticalCount.value + warningCount.value + infoCount.value)

// 环境数据（dashboard 实时驱动 + 采样时间 + 新鲜度）
const envMetrics = computed(() => dash.envSummary.value)

function onEnvClick(env: { key: string }): void {
  dash.selectMetric(env.key)
  dash.openEnvMetricModal(env.key)
}

// 新鲜度标签
function freshnessLabel(f?: string): string {
  if (f === 'realtime') return '实时'
  if (f === 'recent') return '近期'
  if (f === 'history') return '历史'
  return ''
}
function freshnessClass(f?: string): string {
  if (f === 'realtime') return 'fresh-realtime'
  if (f === 'recent') return 'fresh-recent'
  return 'fresh-history'
}

// KPI 钻取闭环
function onRobotKpiClick(): void {
  if (isLocked.value) return
  const firstOnline = robots.value.find(r => r.status === 'online' || r.status === 'patrolling')
  if (!firstOnline) return
  select(firstOnline.id)
  dash.state.currentRobotId = firstOnline.id
  dash.setFocus('robot', firstOnline.id)
  dash.state.autoplayEnabled = false
}

function onAlertKpiClick(): void {
  if (isLocked.value) return
  const firstAlert = dash.alertsExt.value[0]
  if (!firstAlert) return
  dash.setFocus('alert', firstAlert.id)
  dash.state.autoplayEnabled = false
  if (!isLocked.value) dash.openAlertDetailModal()
}

function onTaskKpiClick(): void {
  if (isLocked.value) return
  const firstRunning = dash.taskPool.value.find(t => t.state === 'running')
  if (!firstRunning) return
  dash.withTaskSelection(firstRunning.tk, firstRunning.bot)
  dash.setFocus('robot', firstRunning.bot)
  dash.state.autoplayEnabled = false
}
</script>

<template>
  <!-- 总体运营概览 -->
  <section class="overview card">
    <div class="card-header">
      <h3 class="panel-title">总体运营概览</h3>
      <span class="overview-timestamp">实时</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card kpi-card--clickable" :class="{ 'kpi-card--disabled': isLocked }" :title="isLocked ? '锁定态仅查看' : '点击聚焦首台在线机器人'" @click="onRobotKpiClick">
        <div class="kpi-icon robots-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
            <circle cx="12" cy="5" r="2"></circle>
            <path d="M12 7v4"></path>
            <line x1="8" y1="16" x2="8" y2="16"></line>
            <line x1="16" y1="16" x2="16" y2="16"></line>
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-value">{{ onlineRobots }}<span class="kpi-sub">/{{ totalRobots }}</span></div>
          <div class="kpi-label">在线机器人</div>
        </div>
      </div>
      <div class="kpi-card kpi-card--clickable" :class="{ 'kpi-card--disabled': isLocked }" :title="isLocked ? '锁定态仅查看' : '点击聚焦首条执行中任务'" @click="onTaskKpiClick">
        <div class="kpi-icon complete-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-value">{{ planSummary.completed }}</div>
          <div class="kpi-label">今日完成</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon points-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-value">{{ planSummary.total }}</div>
          <div class="kpi-label">任务总数</div>
        </div>
      </div>
      <div class="kpi-card kpi-card--clickable" :class="{ 'kpi-card--warn': totalAlerts > 0, 'kpi-card--disabled': isLocked }" :title="isLocked ? '锁定态仅查看' : '点击查看首条告警详情'" @click="onAlertKpiClick">
        <div class="kpi-icon error-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12" y2="17"></line>
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-value" :class="{ 'danger-txt': criticalCount > 0 }">{{ totalAlerts }}</div>
          <div class="kpi-label">实时告警</div>
        </div>
      </div>
    </div>
  </section>

  <!-- 巡检覆盖与成效 -->
  <section class="coverage card">
    <div class="card-header">
      <h3 class="panel-title">巡检覆盖与成效</h3>
      <span class="plan-stats">覆盖率 {{ coverageRate }}%</span>
    </div>
    <div class="coverage-bar-wrapper">
      <div class="coverage-bar">
        <div class="cov-fill" :style="{ width: coverageRate + '%' }" :class="coverageRate >= 80 ? 'cov-high' : coverageRate >= 50 ? 'cov-mid' : 'cov-low'"></div>
      </div>
      <div class="coverage-stats">
        <div class="cov-stat">
          <span class="cov-stat-label">已覆盖设施</span>
          <span class="cov-stat-val">{{ facilityCoverage }}<em>%</em></span>
        </div>
        <div class="cov-stat">
          <span class="cov-stat-label">检测点次</span>
          <span class="cov-stat-val">2,386<em>次</em></span>
        </div>
        <div class="cov-stat">
          <span class="cov-stat-label">替代人工</span>
          <span class="cov-stat-val">12.5<em>h</em></span>
        </div>
      </div>
    </div>
    <div class="plan-cards">
      <div class="plan-card">
        <div class="plan-card__head"><span class="plan-dot plan-dot--cyan"></span>执行中</div>
        <div class="plan-card__total">{{ planSummary.running }}<span class="unit">项</span></div>
        <div class="plan-card__sub">完成率 <em>{{ planSummary.total ? Math.round(planSummary.completed / planSummary.total * 100) : 0 }}%</em></div>
      </div>
      <div class="plan-card">
        <div class="plan-card__head"><span class="plan-dot plan-dot--blue"></span>已完成</div>
        <div class="plan-card__total">{{ planSummary.completed }}<span class="unit">项</span></div>
        <div class="plan-card__sub">异常 <em>{{ planSummary.failed }}</em></div>
      </div>
      <div class="plan-card">
        <div class="plan-card__head"><span class="plan-dot plan-dot--gray"></span>待执行</div>
        <div class="plan-card__total">{{ planSummary.pending }}<span class="unit">项</span></div>
        <div class="plan-card__sub">共 <em>{{ planSummary.total }}项</em></div>
      </div>
      <div class="plan-card" :class="{ 'plan-card--warn': planSummary.failed > 0 }">
        <div class="plan-card__head"><span class="plan-dot" :class="planSummary.failed > 0 ? 'plan-dot--warn' : 'plan-dot--gray'"></span>异常/失败</div>
        <div class="plan-card__total" :class="{ 'warn-txt': planSummary.failed > 0 }">{{ planSummary.failed }}<span class="unit">项</span></div>
        <div class="plan-card__sub">{{ planSummary.failed > 0 ? '需关注' : '无异常' }}</div>
      </div>
    </div>
  </section>

  <!-- 机器人运行 -->
  <section class="robot-overview card">
    <div class="card-header">
      <h3 class="panel-title">机器人运行</h3>
      <div class="rs-total">总里程: <strong>{{ totalMileage }}km</strong></div>
    </div>
    <div class="robot-status-bar">
      <div class="rs-item">
        <span class="rs-dot safe"></span>
        <span class="rs-label">执行</span>
        <span class="rs-val">{{ robotBiz.executing }}</span>
      </div>
      <div class="rs-item">
        <span class="rs-dot charging"></span>
        <span class="rs-label">充电</span>
        <span class="rs-val">{{ robotBiz.charging }}</span>
      </div>
      <div class="rs-item">
        <span class="rs-dot warn"></span>
        <span class="rs-label">返航</span>
        <span class="rs-val">{{ robotBiz.returning }}</span>
      </div>
      <div class="rs-item">
        <span class="rs-dot" :class="robotBiz.warning > 0 ? 'danger' : 'safe'"></span>
        <span class="rs-label">故障</span>
        <span class="rs-val" :class="{ 'danger-txt': robotBiz.warning > 0 }">{{ robotBiz.warning }}</span>
      </div>
    </div>
    <div class="robot-overview__stats">
      <div class="ros-item"><span class="ros-label">今日里程</span><span class="ros-val">{{ todayMileage }}<em>km</em></span></div>
      <div class="ros-item"><span class="ros-label">平均时速</span><span class="ros-val">{{ avgSpeed }}<em>km/h</em></span></div>
      <div class="ros-item"><span class="ros-label">在线/巡检</span><span class="ros-val">{{ onlineRobots }}/{{ patrollingCount }}</span></div>
    </div>
  </section>

  <!-- 环境监测（含采样时间与数据新鲜度） -->
  <section class="env-monitor card">
    <div class="card-header">
      <h3 class="panel-title">环境监测</h3>
      <span class="env-update">实时更新</span>
    </div>
    <div class="gauge-grid">
      <div v-for="env in envMetrics" :key="env.label" class="gauge-item" @click="onEnvClick(env)">
        <div class="gauge-wrapper">
          <svg viewBox="0 0 36 36" class="circular-chart" :class="env.status">
            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="circle" :stroke-dasharray="`${Math.min(parseFloat(env.value) * 3, 80)}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div class="gauge-val">{{ env.icon }}<span class="unit">{{ env.value }}</span></div>
        </div>
        <div class="gauge-label">{{ env.label }}</div>
        <div class="gauge-freshness" :class="freshnessClass(env.freshness)">
          <span class="freshness-dot"></span>
          <span class="freshness-text">{{ freshnessLabel(env.freshness) }}</span>
          <span v-if="env.samplingTime" class="freshness-time">{{ env.samplingTime }}</span>
        </div>
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
  padding: 0.1200rem 0.1400rem;
  gap: 0.0800rem;
  box-shadow: 0 0.0400rem 0.2000rem rgba(0, 0, 0, 0.3);
}

.card-header { display: flex; justify-content: space-between; align-items: center; }

.overview-timestamp, .plan-stats, .env-update {
  font-size: 0.0900rem; color: var(--hud-text-faint);
  letter-spacing: 0.5px; padding: 0.0100rem 0.0600rem;
  background: rgba(0, 229, 255, 0.06); border-radius: 0.0200rem;
}
.plan-stats { color: var(--hud-accent-dim); }
.env-update { color: #10B981; background: rgba(16, 185, 129, 0.08); }

/* KPI Grid */
.kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.0600rem; }
.kpi-card {
  padding: 0.0800rem 0.1000rem; border-radius: 0.0400rem;
  background: linear-gradient(135deg, rgba(8, 14, 26, 0.8) 0%, rgba(5, 8, 16, 0.5) 100%);
  border: 1px solid rgba(0, 229, 255, 0.12);
  display: flex; align-items: center; gap: 0.0800rem;
  transition: all 0.25s ease;
}
.kpi-card:hover { border-color: rgba(0, 229, 255, 0.3); box-shadow: 0 0.0400rem 0.1200rem rgba(0, 229, 255, 0.08); transform: translateY(-1px); }
.kpi-card--clickable { cursor: pointer; }
.kpi-card--clickable:hover { border-color: rgba(0, 229, 255, 0.45); box-shadow: 0 0 0.0800rem rgba(0, 229, 255, 0.18); }
.kpi-card--disabled { cursor: not-allowed; opacity: 0.7; }
.kpi-card--disabled:hover { border-color: rgba(0, 229, 255, 0.12); box-shadow: none; transform: none; }
.kpi-card--warn { border-color: rgba(245, 158, 11, 0.2); }
.kpi-card--warn:hover { border-color: rgba(245, 158, 11, 0.4); box-shadow: 0 0.0400rem 0.1200rem rgba(245, 158, 11, 0.1); }

.kpi-icon {
  width: 0.3400rem; height: 0.3400rem; border-radius: 0.0500rem;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.robots-icon { background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.2); color: #00E5FF; }
.complete-icon { background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); color: #10B981; }
.points-icon { background: rgba(96, 165, 250, 0.08); border: 1px solid rgba(96, 165, 250, 0.2); color: #60A5FA; }
.error-icon { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); color: #EF4444; }

.kpi-content { display: flex; flex-direction: column; }
.kpi-value { font-size: 0.1800rem; font-weight: 700; color: #FFFFFF; font-family: var(--hud-mono); line-height: 1.2; }
.kpi-sub { font-size: 0.1000rem; color: var(--hud-text-dim); font-weight: 400; margin-left: 0.0200rem; }
.kpi-label { font-size: 0.1000rem; color: var(--hud-text-dim); margin-top: 0.0200rem; }
.danger-txt { color: #EF4444; }

/* 巡检覆盖与成效 */
.coverage-bar-wrapper { display: flex; flex-direction: column; gap: 0.0400rem; }
.coverage-bar { height: 0.0600rem; background: rgba(255,255,255,0.06); border-radius: 0.0300rem; overflow: hidden; }
.cov-fill { height: 100%; border-radius: 0.0300rem; transition: width 0.6s ease; min-width: 2%; }
.cov-high { background: linear-gradient(90deg, #10B981, #34D399); }
.cov-mid { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
.cov-low { background: linear-gradient(90deg, #EF4444, #F87171); }

.coverage-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.0400rem; }
.cov-stat { display: flex; flex-direction: column; align-items: center; gap: 0.0200rem; background: rgba(0,0,0,0.2); padding: 0.0400rem; border-radius: 0.0300rem; }
.cov-stat-label { font-size: 0.0800rem; color: var(--hud-text-dim); }
.cov-stat-val { font-size: 0.1400rem; color: #00E5FF; font-family: var(--hud-mono); font-weight: bold; }
.cov-stat-val em { font-style: normal; font-size: 0.0800rem; color: var(--hud-text-dim); margin-left: 0.0200rem; font-weight: 400; }

/* 任务卡片 */
.plan-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.0500rem; }
.plan-card {
  padding: 0.0600rem 0.0800rem; border-radius: 0.0400rem;
  background: linear-gradient(135deg, rgba(8, 14, 26, 0.8) 0%, rgba(5, 8, 16, 0.5) 100%);
  border: 1px solid rgba(0, 229, 255, 0.12);
  display: flex; flex-direction: column; gap: 0.0200rem;
  transition: all 0.2s ease;
}
.plan-card:hover { border-color: rgba(0, 229, 255, 0.3); transform: translateY(-1px); }
.plan-card--warn { border-color: rgba(245, 158, 11, 0.25); }
.plan-card__head { display: flex; align-items: center; gap: 0.0400rem; font-size: 0.0900rem; color: var(--hud-text-dim); }
.plan-dot { width: 0.0500rem; height: 0.0500rem; border-radius: 50%; box-shadow: 0 0 0.0500rem currentColor; }
.plan-dot--cyan { background: #00E5FF; color: #00E5FF; }
.plan-dot--blue { background: #3B82F6; color: #3B82F6; }
.plan-dot--gray { background: #64748B; color: #64748B; }
.plan-dot--warn { background: #F59E0B; color: #F59E0B; }
.plan-card__total { font-size: 0.1800rem; font-weight: 700; color: #FFFFFF; font-family: var(--hud-mono); line-height: 1.1; }
.plan-card__total .unit { font-size: 0.0800rem; color: var(--hud-text-dim); font-weight: 400; margin-left: 0.0200rem; }
.plan-card__sub { font-size: 0.0800rem; color: var(--hud-text-dim); }
.plan-card__sub em { font-style: normal; color: #00E5FF; font-family: var(--hud-mono); margin-left: 0.0200rem; }
.plan-card--warn .plan-card__sub em { color: #F59E0B; }

/* 机器人运行 */
.robot-status-bar { display: flex; gap: 0.0400rem; padding: 0.0300rem 0; }
.rs-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.0200rem; background: rgba(0,0,0,0.2); padding: 0.0500rem; border-radius: 0.0400rem; }
.rs-dot { width: 0.0400rem; height: 0.0400rem; border-radius: 50%; box-shadow: 0 0 0.0500rem currentColor; }
.rs-dot.safe { background: #22C55E; color: #22C55E; }
.rs-dot.charging { background: #3B82F6; color: #3B82F6; }
.rs-dot.warn { background: #F59E0B; color: #F59E0B; }
.rs-dot.danger { background: #EF4444; color: #EF4444; }
.rs-label { font-size: 0.0800rem; color: var(--hud-text-dim); }
.rs-val { font-size: 0.1400rem; font-weight: 700; color: #FFFFFF; font-family: var(--hud-mono); }

.robot-overview .rs-total { font-size: 0.0900rem; color: var(--hud-text-dim); }
.robot-overview .rs-total strong { color: var(--hud-accent); font-family: var(--hud-mono); }
.robot-overview__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.0400rem; margin-top: 0.0300rem; padding-top: 0.0500rem; border-top: 1px solid rgba(107, 142, 173, 0.12); }
.ros-item { display: flex; flex-direction: column; align-items: center; gap: 0.0200rem; }
.ros-label { font-size: 0.0800rem; color: var(--hud-text-dim); }
.ros-val { font-size: 0.1200rem; color: #00E5FF; font-family: var(--hud-mono); font-weight: bold; }
.ros-val em { font-style: normal; font-size: 0.0800rem; color: var(--hud-text-dim); margin-left: 0.0200rem; font-weight: 400; }

/* 环境监测 */
.gauge-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.0400rem; }
.gauge-item { display: flex; flex-direction: column; align-items: center; gap: 0.0200rem; cursor: pointer; position: relative; }
.gauge-item:hover .gauge-wrapper { transform: scale(1.05); }
.gauge-wrapper { position: relative; width: 0.5000rem; height: 0.5000rem; transition: transform 0.2s ease; }
.circular-chart { width: 100%; height: 100%; transform: rotate(-90deg); }
.circle-bg { fill: none; stroke: rgba(255, 255, 255, 0.05); stroke-width: 2.2; }
.circle { fill: none; stroke-width: 2.2; stroke-linecap: round; transition: stroke-dasharray 0.3s ease; }
.safe .circle { stroke: #10B981; }
.warn .circle { stroke: #F59E0B; }
.danger .circle { stroke: #EF4444; }
.gauge-val { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: var(--hud-mono); font-size: 0.0800rem; font-weight: bold; color: #E2E8F0; }
.gauge-val .unit { font-size: 0.0600rem; color: var(--hud-text-dim); font-weight: 400; }
.gauge-label { font-size: 0.0800rem; color: var(--hud-text-dim); }

/* 数据新鲜度指示 */
.gauge-freshness { display: flex; align-items: center; gap: 0.0300rem; font-size: 0.0700rem; }
.freshness-dot { width: 0.0400rem; height: 0.0400rem; border-radius: 50%; }
.fresh-realtime .freshness-dot { background: #22C55E; box-shadow: 0 0 0.0500rem #22C55E; }
.fresh-recent .freshness-dot { background: #F59E0B; box-shadow: 0 0 0.0500rem #F59E0B; }
.fresh-history .freshness-dot { background: #64748B; box-shadow: 0 0 0.0500rem #64748B; }
.freshness-text { color: var(--hud-text-faint); }
.freshness-time { color: var(--hud-text-faint); font-family: var(--hud-mono); }
</style>
