<script setup lang="ts">
// RobotList —— 左面板下区：机器人列表

import { computed } from "vue"
import { useRobots } from "@/composables/useRobots"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { RobotStatus } from "@/types/robot"

const { robots } = useRobots()
const { select, selectedRobot } = useSelectedRobot()

const totalMileage = computed(() => {
  return robots.value.reduce((acc, r) => acc + (r.batteryLevel * 12 + 120), 18000).toLocaleString()
})

const STATUS_TEXT: Record<RobotStatus, string> = {
  [RobotStatus.ONLINE]: "待命",
  [RobotStatus.PATROLLING]: "运行中",
  [RobotStatus.CHARGING]: "充电中",
  [RobotStatus.RETURNING]: "返充",
  [RobotStatus.ERROR]: "故障",
  [RobotStatus.PAUSED]: "暂停",
  [RobotStatus.OFFLINE]: "离线",
}

function statusColor(s: RobotStatus): string {
  if (s === RobotStatus.ERROR) return "#EF4444"
  if (s === RobotStatus.RETURNING) return "#F59E0B"
  if (s === RobotStatus.CHARGING) return "#3B82F6"
  if (s === RobotStatus.PATROLLING) return "#10B981"
  return "#94A3B8"
}

function batteryLevelClass(b: number): string {
  if (b < 20) return "low"
  if (b < 40) return "mid"
  return "high"
}
</script>

<template>
  <section class="robot-overview card">
    <div class="card-header">
      <h3 class="panel-title">机器人列表</h3>
      <div class="rs-total">总里程 <strong class="highlight">{{ totalMileage }} km</strong></div>
    </div>
    
    <div class="robot-list">
      <div 
        v-for="r in robots" 
        :key="r.id" 
        class="robot-item" 
        :class="{ 'robot-item--active': selectedRobot?.id === r.id }" 
        @click="select(r.id)"
      >
        <div class="ri-info">
          <div class="ri-header">
            <span class="ri-name">
              <span class="ri-indicator" :style="{ background: statusColor(r.status) }"></span>
              {{ r.name }}
            </span>
            <span class="ri-status-tag" :class="r.status">
              {{ STATUS_TEXT[r.status] }}
            </span>
          </div>
          
          <div class="ri-battery-section">
            <span class="ri-battery-label">电量</span>
            <div class="ri-battery-track">
              <div 
                class="ri-battery-fill" 
                :class="batteryLevelClass(r.batteryLevel)" 
                :style="{ width: r.batteryLevel + '%' }"
              ></div>
            </div>
            <span class="ri-battery-val" :class="batteryLevelClass(r.batteryLevel)">
              {{ r.batteryLevel }}%
            </span>
          </div>
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
  padding: 0.1400rem 0.1600rem;
  gap: 0.1200rem;
  box-shadow: 0 0.0400rem 0.2000rem rgba(0, 0, 0, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rs-total {
  font-size: 0.1100rem;
  color: var(--hud-text-dim);
}

.rs-total strong {
  font-family: var(--hud-mono);
  font-size: 0.1300rem;
  margin-left: 0.0400rem;
}

.robot-list {
  display: flex;
  flex-direction: column;
  gap: 0.0800rem;
}

.robot-item {
  background: rgba(8, 14, 26, 0.7);
  border: 1px solid rgba(0, 229, 255, 0.1);
  border-radius: 0.0600rem;
  padding: 0.1000rem 0.1200rem;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.robot-item:hover {
  border-color: rgba(0, 229, 255, 0.3);
  background: rgba(8, 14, 26, 0.95);
  box-shadow: 0 0.0200rem 0.1000rem rgba(0, 229, 255, 0.05);
  transform: translateX(0.0200rem);
}

.robot-item--active {
  border-color: #00E5FF;
  background: rgba(0, 229, 255, 0.06);
  box-shadow: 0 0 0.1200rem rgba(0, 229, 255, 0.15);
}

.ri-info {
  display: flex;
  flex-direction: column;
  gap: 0.0800rem;
}

.ri-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ri-name {
  font-size: 0.1200rem;
  font-weight: 600;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  gap: 0.0600rem;
}

.ri-indicator {
  width: 0.0600rem;
  height: 0.0600rem;
  border-radius: 50%;
  box-shadow: 0 0 0.0600rem currentColor;
}

.ri-status-tag {
  font-size: 0.1000rem;
  padding: 1px 0.0600rem;
  border-radius: 0.0200rem;
  font-weight: 600;
}

.ri-status-tag.patrolling { background: rgba(16, 185, 129, 0.12); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.2); }
.ri-status-tag.online { background: rgba(59, 130, 246, 0.12); color: #3B82F6; border: 1px solid rgba(59, 130, 246, 0.2); }
.ri-status-tag.returning { background: rgba(245, 158, 11, 0.12); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.2); }
.ri-status-tag.charging { background: rgba(96, 165, 250, 0.12); color: #60A5FA; border: 1px solid rgba(96, 165, 250, 0.2); }
.ri-status-tag.error { background: rgba(239, 68, 68, 0.12); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.25); }
.ri-status-tag.paused { background: rgba(148, 163, 184, 0.12); color: #94A3B8; border: 1px solid rgba(148, 163, 184, 0.2); }
.ri-status-tag.offline { background: rgba(71, 85, 105, 0.12); color: #475569; border: 1px solid rgba(71, 85, 105, 0.2); }

.ri-battery-section {
  display: flex;
  align-items: center;
  gap: 0.0800rem;
}

.ri-battery-label {
  font-size: 0.1000rem;
  color: var(--hud-text-dim);
}

.ri-battery-track {
  flex: 1;
  height: 0.0400rem;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 0.0200rem;
  overflow: hidden;
}

.ri-battery-fill {
  height: 100%;
  border-radius: 0.0200rem;
  transition: width 0.3s ease;
}

.ri-battery-fill.high { background: linear-gradient(90deg, #10B981, #34D399); }
.ri-battery-fill.mid { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
.ri-battery-fill.low { background: linear-gradient(90deg, #EF4444, #F87171); }

.ri-battery-val {
  font-family: var(--hud-mono);
  font-size: 0.1000rem;
  font-weight: bold;
}

.ri-battery-val.high { color: #10B981; }
.ri-battery-val.mid { color: #F59E0B; }
.ri-battery-val.low { color: #EF4444; }
</style>
