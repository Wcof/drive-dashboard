<script setup lang="ts">
// Sidebar —— 右侧面板：安全风险 + 实时告警 + 设备运行状态 + 能耗监测
// 聚焦态：PTZ控制 + 机器人详情

import { computed } from "vue"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { useAlerts } from "@/composables/useAlerts"
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

const totalAlerts = computed(() => criticalCount.value + warningCount.value + infoCount.value || 20)

// 设施设备 total
const facilityTotal = 48
const facilityNormal = 44
const facilityOffline = 2
const facilityWarn = 2
</script>

<template>
  <template v-if="!isFocused">
    <!-- 安全风险 -->
    <section class="safety-risk card">
      <div class="card-header">
        <h3 class="panel-title">安全风险</h3>
        <span class="hud-tag">实时评测</span>
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
            <span class="shield-num">{{ totalAlerts }}</span>
            <span class="shield-lbl">当前告警数</span>
          </div>
        </div>
        
        <!-- Breakdown -->
        <div class="risk-breakdown">
          <div class="rb-item">
            <span class="rb-dot cyan"></span>
            <span class="rb-label">巡检点</span>
            <span class="rb-val">10</span>
          </div>
          <div class="rb-item">
            <span class="rb-dot blue"></span>
            <span class="rb-label">设备识别</span>
            <span class="rb-val">7</span>
          </div>
          <div class="rb-item">
            <span class="rb-dot yellow"></span>
            <span class="rb-label">气体异常</span>
            <span class="rb-val">3</span>
          </div>
          <div class="rb-item">
            <span class="rb-dot danger"></span>
            <span class="rb-label">安全行为</span>
            <span class="rb-val">1</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 实时告警 -->
    <BroadcastCard />

    <!-- 设备运行状态 -->
    <section class="facility card">
      <div class="card-header">
        <h3 class="panel-title">设备运行状态</h3>
        <span class="hud-tag">分布统计</span>
      </div>
      
      <div class="equipment-chart-wrapper">
        <svg width="76" height="76" viewBox="0 0 36 36" class="donut-chart">
          <!-- Normal segment (91.7%) starting at top -->
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10B981" stroke-width="3" stroke-dasharray="91.7 8.3" stroke-dashoffset="25" />
          <!-- Warning segment (4.2%) -->
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" stroke-width="3" stroke-dasharray="4.2 95.8" stroke-dashoffset="-66.7" />
          <!-- Offline segment (4.2%) -->
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EF4444" stroke-width="3" stroke-dasharray="4.2 95.8" stroke-dashoffset="-70.9" />
          <text x="18" y="17.2" class="donut-total">{{ facilityTotal }}</text>
          <text x="18" y="23.2" class="donut-total-lbl">设备数</text>
        </svg>
        <div class="donut-legend">
          <div class="dl-item">
            <span class="dl-dot safe"></span>
            <span class="dl-label">正常</span>
            <span class="dl-val">{{ facilityNormal }} <span class="dl-pct">(91.7%)</span></span>
          </div>
          <div class="dl-item">
            <span class="dl-dot warn"></span>
            <span class="dl-label">告警</span>
            <span class="dl-val">{{ facilityWarn }} <span class="dl-pct">(4.2%)</span></span>
          </div>
          <div class="dl-item">
            <span class="dl-dot danger"></span>
            <span class="dl-label">离线</span>
            <span class="dl-val">{{ facilityOffline }} <span class="dl-pct">(4.2%)</span></span>
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
        <!-- 电 -->
        <div class="energy-item">
          <span class="ei-title">今日用电</span>
          <div class="ei-value-row">
            <span class="ei-val">398</span>
            <span class="ei-unit">kWh</span>
          </div>
          <div class="ei-trend down">同比 ↓ 8.2%</div>
        </div>
        <!-- 水 -->
        <div class="energy-item">
          <span class="ei-title">今日用水</span>
          <div class="ei-value-row">
            <span class="ei-val">12.5</span>
            <span class="ei-unit">t</span>
          </div>
          <div class="ei-trend down">同比 ↓ 5.1%</div>
        </div>
        <!-- 气 -->
        <div class="energy-item">
          <span class="ei-title">今日燃气</span>
          <div class="ei-value-row">
            <span class="ei-val">55</span>
            <span class="ei-unit">m³</span>
          </div>
          <div class="ei-trend up">同比 ↑ 3.3%</div>
        </div>
        <!-- 能耗 -->
        <div class="energy-item">
          <span class="ei-title">环境能耗</span>
          <div class="ei-value-row">
            <span class="ei-val">1.2</span>
            <span class="ei-unit">tce</span>
          </div>
          <div class="ei-trend down">同比 ↓ 6.7%</div>
        </div>
      </div>
      
      <!-- High-tech Sparkline -->
      <div class="sparkline-container">
        <svg viewBox="0 0 240 42" class="sparkline-svg">
          <defs>
            <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.32" />
              <stop offset="100%" stop-color="#00E5FF" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M 0 32 Q 30 18 60 28 T 120 22 T 180 12 T 240 18 L 240 42 L 0 42 Z" fill="url(#sparkline-grad)" />
          <path d="M 0 32 Q 30 18 60 28 T 120 22 T 180 12 T 240 18" fill="none" stroke="#00E5FF" stroke-width="1.8" stroke-linecap="round" />
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

.hud-tag {
  font-size: 0.1000rem;
  padding: 1px 0.0600rem;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.2);
  border-radius: 0.0300rem;
  color: #00E5FF;
  letter-spacing: 0.5px;
}

/* 安全风险 */
.risk-container {
  display: flex;
  align-items: center;
  gap: 0.2000rem;
  padding: 0.0400rem 0;
}

.shield-badge {
  position: relative;
  width: 0.9000rem;
  height: 0.9000rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.shield-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.shield-text {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 0.0600rem;
}

.shield-num {
  font-family: var(--hud-mono);
  font-size: 0.2600rem;
  font-weight: 800;
  color: #00E5FF;
  line-height: 1.1;
  text-shadow: 0 0 0.1000rem rgba(0, 229, 255, 0.5);
}

.shield-lbl {
  font-size: 0.0900rem;
  color: var(--hud-text-dim);
  margin-top: 0.0200rem;
}

.risk-breakdown {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.0600rem;
}

.rb-item {
  display: flex;
  align-items: center;
  gap: 0.0800rem;
  padding: 0.0400rem 0.1000rem;
  background: rgba(8, 14, 26, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 0.0400rem;
}

.rb-dot {
  width: 0.0600rem;
  height: 0.0600rem;
  border-radius: 50%;
  box-shadow: 0 0 0.0500rem currentColor;
}

.rb-dot.cyan { color: #00E5FF; background: #00E5FF; }
.rb-dot.blue { color: #3B82F6; background: #3B82F6; }
.rb-dot.yellow { color: #F59E0B; background: #F59E0B; }
.rb-dot.danger { color: #EF4444; background: #EF4444; }

.rb-label {
  font-size: 0.1100rem;
  color: var(--hud-text-dim);
  flex: 1;
}

.rb-val {
  font-family: var(--hud-mono);
  font-size: 0.1300rem;
  font-weight: 700;
  color: #FFFFFF;
}

/* 设备运行状态 Chart */
.equipment-chart-wrapper {
  display: flex;
  align-items: center;
  gap: 0.2400rem;
  padding: 0.0600rem 0;
}

.donut-chart {
  transform: rotate(-90deg);
  flex-shrink: 0;
}

.donut-total {
  font-family: var(--hud-mono);
  font-size: 0.0800rem;
  font-weight: 800;
  fill: #FFFFFF;
  text-anchor: middle;
}

.donut-total-lbl {
  font-size: 0.0350rem;
  fill: var(--hud-text-dim);
  text-anchor: middle;
}

.donut-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.0600rem;
}

.dl-item {
  display: flex;
  align-items: center;
  gap: 0.0800rem;
  font-size: 0.1100rem;
  color: var(--hud-text-dim);
}

.dl-dot {
  width: 0.0600rem;
  height: 0.0600rem;
  border-radius: 50%;
}
.dl-dot.safe { background: #10B981; box-shadow: 0 0 0.0500rem #10B981; }
.dl-dot.warn { background: #F59E0B; box-shadow: 0 0 0.0500rem #F59E0B; }
.dl-dot.danger { background: #EF4444; box-shadow: 0 0 0.0500rem #EF4444; }

.dl-label {
  flex: 1;
}

.dl-val {
  font-family: var(--hud-mono);
  font-weight: bold;
  color: #FFFFFF;
}

.dl-pct {
  font-weight: 400;
  font-size: 0.1000rem;
  color: var(--hud-text-dim);
}

/* 能耗监测 */
.energy-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.0800rem;
}

.energy-item {
  background: rgba(8, 14, 26, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 0.0400rem;
  padding: 0.0800rem 0.1000rem;
  display: flex;
  flex-direction: column;
  gap: 0.0300rem;
}

.ei-title {
  font-size: 0.1100rem;
  color: var(--hud-text-dim);
}

.ei-value-row {
  display: flex;
  align-items: baseline;
  gap: 0.0200rem;
}

.ei-val {
  font-family: var(--hud-mono);
  font-size: 0.1800rem;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1.1;
}

.ei-unit {
  font-size: 0.0900rem;
  color: var(--hud-text-dim);
}

.ei-trend {
  font-size: 0.1000rem;
  font-weight: 500;
}
.ei-trend.down { color: #10B981; }
.ei-trend.up { color: #EF4444; }

.sparkline-container {
  margin-top: 0.0600rem;
  border-top: 1px dashed rgba(0, 229, 255, 0.15);
  padding-top: 0.1000rem;
  height: 0.4200rem;
}

.sparkline-svg {
  width: 100%;
  height: 100%;
}

/* 聚焦态 */
.sidebar__back {
  height: 0.3200rem;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.3);
  border-radius: 0.0400rem;
  color: #00E5FF;
  cursor: pointer;
  font-size: 0.1200rem;
  transition: all 0.2s ease;
  letter-spacing: 1px;
  margin-bottom: 0.0800rem;
}

.sidebar__back:hover {
  background: rgba(0, 229, 255, 0.15);
  border-color: rgba(0, 229, 255, 0.5);
  box-shadow: 0 0 0.1000rem rgba(0, 229, 255, 0.15);
}

.sidebar__section {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0.1200rem;
  background: rgba(8, 14, 26, 0.52);
  border: 1px solid rgba(0, 229, 255, 0.12);
  border-radius: 0.0600rem;
  backdrop-filter: blur(0.1200rem);
  display: flex;
  flex-direction: column;
}
</style>
