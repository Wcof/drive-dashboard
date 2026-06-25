<script setup lang="ts">
// RobotDetail —— 聚焦态下区：机器人属性详情 + 操作按钮（解锁态）

import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { useAlerts } from "@/composables/useAlerts"
import { useTasks } from "@/composables/useTasks"
import { useLockState } from "@/composables/useLockState"
import { RobotStatus } from "@/types/robot"

const emit = defineEmits<{
  (e: "takeover", robotId: string): void
  (e: "dispatch", robotId: string): void
  (e: "ack-alert", alertId: string): void
  (e: "preempt", taskId: string): void
  (e: "terminate", taskId: string): void
  (e: "work-ticket-trigger"): void
  (e: "remote-control"): void
}>()

const { selectedRobot } = useSelectedRobot()
const { byRobot } = useAlerts()
const { byRobot: tasksByRobot } = useTasks()
const { isLocked } = useLockState()

const STATUS_TEXT: Record<RobotStatus, string> = {
  [RobotStatus.ONLINE]: "待命", [RobotStatus.PATROLLING]: "巡检中", [RobotStatus.CHARGING]: "充电中",
  [RobotStatus.RETURNING]: "返充", [RobotStatus.ERROR]: "故障", [RobotStatus.PAUSED]: "暂停", [RobotStatus.OFFLINE]: "离线",
}
function statusColor(s: RobotStatus): string {
  if (s === RobotStatus.ERROR) return "var(--hud-danger)"
  if (s === RobotStatus.RETURNING) return "var(--hud-warn)"
  if (s === RobotStatus.CHARGING) return "var(--hud-info)"
  if (s === RobotStatus.PATROLLING) return "var(--hud-ok)"
  return "var(--hud-text-dim)"
}
function batteryLevel(b: number): string {
  if (b < 20) return "low"
  if (b < 40) return "mid"
  return "high"
}
</script>

<template>
  <div v-if="selectedRobot" class="detail">
    <div class="detail__header">
      <div class="detail__title-row">
        <span class="detail__dot" :style="{ background: statusColor(selectedRobot.status), boxShadow: `0 0 8px ${statusColor(selectedRobot.status)}` }"></span>
        <span class="detail__title">{{ selectedRobot.name }}</span>
      </div>
      <span class="detail__status-tag" :style="{ color: statusColor(selectedRobot.status), borderColor: statusColor(selectedRobot.status) }">{{ STATUS_TEXT[selectedRobot.status] }}</span>
    </div>

    <div class="detail__stats">
      <div class="detail__stat">
        <span class="detail__stat-label">编号</span>
        <span class="detail__stat-value">{{ selectedRobot.serialNumber }}</span>
      </div>
      <div class="detail__stat">
        <span class="detail__stat-label">型号</span>
        <span class="detail__stat-value">{{ selectedRobot.model }}</span>
      </div>
      <div class="detail__stat">
        <span class="detail__stat-label">信号</span>
        <span class="detail__stat-value">{{ selectedRobot.signalStrength }}%</span>
      </div>
      <div class="detail__stat detail__stat--full">
        <span class="detail__stat-label">电量</span>
        <div class="detail__battery">
          <span class="detail__stat-value">{{ selectedRobot.batteryLevel }}%</span>
          <div class="battery-bar"><div class="battery-fill" :class="batteryLevel(selectedRobot.batteryLevel)" :style="{ width: selectedRobot.batteryLevel + '%' }"></div></div>
        </div>
      </div>
      <div class="detail__stat detail__stat--full">
        <span class="detail__stat-label">位置</span>
        <span class="detail__stat-value mono">{{ selectedRobot.position.longitude.toFixed(4) }}, {{ selectedRobot.position.latitude.toFixed(4) }}</span>
      </div>
      <div class="detail__stat">
        <span class="detail__stat-label">朝向</span>
        <span class="detail__stat-value">{{ selectedRobot.position.yaw }}°</span>
      </div>
    </div>

    <div class="detail__section panel-title">关联任务</div>
    <div v-if="!tasksByRobot(selectedRobot.id).value.length" class="detail__empty">暂无任务</div>
    <div v-for="t in tasksByRobot(selectedRobot.id).value" :key="t.id" class="detail__task">
      <div class="dt-info">
        <span class="dt-name">{{ t.name }}</span>
        <div class="dt-progress"><div class="dt-progress-bar" :style="{ width: t.progress + '%' }"></div></div>
        <span class="dt-val">{{ t.progress }}%</span>
      </div>
      <span v-if="!isLocked" class="detail__task-actions">
        <button class="mini-btn mini-btn--warn" @click="emit('preempt', t.id)">抢占</button>
        <button class="mini-btn mini-btn--danger" @click="emit('terminate', t.id)">终止</button>
      </span>
    </div>

    <div class="detail__section panel-title">关联告警</div>
    <div v-if="!byRobot(selectedRobot.id).value.length" class="detail__empty">暂无告警</div>
    <div v-for="a in byRobot(selectedRobot.id).value" :key="a.id" class="detail__alert" :class="`is-${a.severity}`">
      <span class="da-title">{{ a.title }}</span>
      <button v-if="!isLocked && a.status === 'active'" class="mini-btn mini-btn--warn" @click="emit('ack-alert', a.id)">ACK</button>
    </div>

    <div class="detail__actions" v-if="!isLocked">
      <button class="action-btn action-btn--accent" @click="emit('remote-control')">切入远控</button>
      <button class="action-btn action-btn--danger" @click="emit('takeover', selectedRobot.id)">故障接管</button>
      <button class="action-btn action-btn--warn" @click="emit('dispatch', selectedRobot.id)">紧急派车</button>
      <button class="action-btn action-btn--info" @click="emit('work-ticket-trigger')">触发作业票</button>
    </div>
  </div>
</template>

<style scoped>
.detail { font-size: 12px; display: flex; flex-direction: column; gap: 12px; }
.detail__header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: linear-gradient(135deg, rgba(197, 168, 123, 0.08), rgba(10, 16, 26, 0.4)); border: 1px solid rgba(197, 168, 123, 0.18); border-radius: 8px; }
.detail__title-row { display: flex; align-items: center; gap: 10px; }
.detail__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.detail__title { color: var(--hud-accent); font-weight: 600; font-size: 15px; letter-spacing: 1px; }
.detail__status-tag { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px; border: 1px solid; background: rgba(255, 255, 255, 0.04); }

.detail__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.detail__stat {
  padding: 10px 12px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(107, 142, 173, 0.16); border-radius: 6px;
  display: flex; flex-direction: column; gap: 4px;
  transition: all 0.2s ease;
}
.detail__stat:hover { border-color: rgba(197, 168, 123, 0.3); background: rgba(197, 168, 123, 0.04); }
.detail__stat--full { grid-column: span 2; }
.detail__stat-label { font-size: 10px; color: var(--hud-text-faint); letter-spacing: 0.5px; }
.detail__stat-value { font-size: 13px; color: var(--hud-text); font-family: var(--hud-mono); font-weight: 500; }
.mono { font-family: var(--hud-mono); }
.detail__battery { display: flex; align-items: center; gap: 10px; }
.battery-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.battery-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.battery-fill.high { background: linear-gradient(90deg, #22C55E, #4ADE80); }
.battery-fill.mid { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
.battery-fill.low { background: linear-gradient(90deg, #EF4444, #F87171); }

.detail__section { margin-top: 6px; }
.detail__empty { padding: 12px; text-align: center; color: var(--hud-text-faint); font-size: 11px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px dashed rgba(107, 142, 173, 0.2); }
.detail__task {
  padding: 10px 12px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(107, 142, 173, 0.14); border-radius: 6px;
  margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; gap: 10px;
  transition: all 0.2s ease;
}
.detail__task:hover { border-color: rgba(197, 168, 123, 0.25); }
.dt-info { flex: 1; display: flex; align-items: center; gap: 10px; }
.dt-name { font-size: 12px; color: var(--hud-text); min-width: 80px; }
.dt-progress { flex: 1; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.dt-progress-bar { height: 100%; background: linear-gradient(90deg, var(--hud-accent-smog), var(--hud-accent)); border-radius: 2px; transition: width 0.3s; }
.dt-val { font-family: var(--hud-mono); font-size: 11px; color: var(--hud-accent); min-width: 36px; text-align: right; }
.detail__task-actions { display: flex; gap: 6px; flex-shrink: 0; }
.mini-btn { padding: 4px 10px; background: transparent; border: 1px solid var(--hud-border); color: var(--hud-text-dim); cursor: pointer; border-radius: 4px; font-size: 10px; letter-spacing: 0.5px; transition: all 0.2s ease; }
.mini-btn:hover { transform: translateY(-1px); }
.mini-btn--warn { color: var(--hud-warn); border-color: rgba(245, 158, 11, 0.4); }
.mini-btn--warn:hover { background: rgba(245, 158, 11, 0.12); box-shadow: 0 0 8px rgba(245, 158, 11, 0.2); }
.mini-btn--danger { color: var(--hud-danger); border-color: rgba(239, 68, 68, 0.4); }
.mini-btn--danger:hover { background: rgba(239, 68, 68, 0.12); box-shadow: 0 0 8px rgba(239, 68, 68, 0.2); }

.detail__alert {
  padding: 10px 12px; background: rgba(255,255,255,0.02);
  border-radius: 6px; margin-bottom: 6px;
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  border: 1px solid rgba(107, 142, 173, 0.12);
}
.detail__alert.is-critical { border-left: 3px solid var(--hud-danger); background: rgba(239, 68, 68, 0.06); }
.detail__alert.is-warning { border-left: 3px solid var(--hud-warn); background: rgba(245, 158, 11, 0.06); }
.detail__alert.is-info { border-left: 3px solid var(--hud-info); background: rgba(59, 130, 246, 0.06); }
.da-title { font-size: 12px; color: var(--hud-text); }

.detail__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
.action-btn {
  padding: 10px 8px; background: rgba(255,255,255,0.04);
  color: var(--hud-text); border: 1px solid rgba(107, 142, 173, 0.22);
  border-radius: 6px; cursor: pointer; font-size: 12px; letter-spacing: 0.5px;
  transition: all 0.2s ease;
}
.action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }
.action-btn--accent { border-color: rgba(197,168,123,0.45); color: var(--hud-accent); background: rgba(197,168,123,0.08); }
.action-btn--accent:hover { background: rgba(197,168,123,0.18); box-shadow: 0 0 14px rgba(197,168,123,0.25); }
.action-btn--danger { border-color: rgba(239,68,68,0.45); color: var(--hud-danger); background: rgba(239,68,68,0.06); }
.action-btn--danger:hover { background: rgba(239,68,68,0.16); box-shadow: 0 0 14px rgba(239,68,68,0.25); }
.action-btn--warn { border-color: rgba(245,158,11,0.45); color: var(--hud-warn); background: rgba(245,158,11,0.06); }
.action-btn--warn:hover { background: rgba(245,158,11,0.16); box-shadow: 0 0 14px rgba(245,158,11,0.25); }
.action-btn--info { border-color: rgba(59,130,246,0.45); color: #60A5FA; background: rgba(59,130,246,0.06); }
.action-btn--info:hover { background: rgba(59,130,246,0.16); box-shadow: 0 0 14px rgba(59,130,246,0.25); }
</style>
