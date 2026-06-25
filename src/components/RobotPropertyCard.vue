<script setup lang="ts">
// RobotPropertyCard —— 聚焦态机器人属性摘要浮卡
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { RobotStatus } from "@/types/robot"

const { selectedRobot } = useSelectedRobot()
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
</script>

<template>
  <div v-if="selectedRobot" class="prop-card">
    <div class="prop-card__header">
      <span class="prop-card__dot" :style="{ background: statusColor(selectedRobot.status), boxShadow: `0 0 8px ${statusColor(selectedRobot.status)}` }"></span>
      <div class="prop-card__name">{{ selectedRobot.name }}</div>
    </div>
    <div class="prop-card__divider"></div>
    <div class="prop-card__stats">
      <div class="prop-card__stat"><span>状态</span><b :style="{ color: statusColor(selectedRobot.status) }">{{ STATUS_TEXT[selectedRobot.status] }}</b></div>
      <div class="prop-card__stat"><span>电量</span><b>{{ selectedRobot.batteryLevel }}%</b></div>
      <div class="prop-card__stat"><span>信号</span><b>{{ selectedRobot.signalStrength }}%</b></div>
      <div class="prop-card__stat"><span>朝向</span><b>{{ selectedRobot.position.yaw }}°</b></div>
    </div>
  </div>
</template>

<style scoped>
.prop-card {
  width: 220px;
  background: linear-gradient(180deg, rgba(12, 18, 30, 0.96) 0%, rgba(8, 12, 22, 0.96) 100%);
  border: 1px solid rgba(197, 168, 123, 0.35);
  border-radius: 8px; padding: 14px 16px; font-size: 12px;
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.7), 0 0 20px rgba(197,168,123,0.1);
  position: relative;
}
.prop-card::before {
  content: ""; position: absolute; top: 0; left: 12px; right: 12px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(197, 168, 123, 0.7) 50%, transparent);
}
.prop-card__header { display: flex; align-items: center; gap: 10px; }
.prop-card__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.prop-card__name { color: var(--hud-accent); font-weight: 600; font-size: 14px; letter-spacing: 0.5px; }
.prop-card__divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(107, 142, 173, 0.3), transparent); margin: 12px 0; }
.prop-card__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
.prop-card__stat { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
.prop-card__stat span { color: var(--hud-text-dim); font-size: 11px; }
.prop-card__stat b { color: var(--hud-text); font-family: var(--hud-mono); font-size: 12px; font-weight: 500; }
</style>
