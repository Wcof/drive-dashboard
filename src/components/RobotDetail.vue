<script setup lang="ts">
// RobotDetail —— 聚焦态下区：机器人属性详情 + 挂载组件Tab + 维保信息 + 操作按钮（增强版 S18-S20）
// 符合知识库要求：
// - S18 列表简、详情丰
// - S19 维保信息结构化
// - S20 挂载组件分类型展示（底盘/传感器/云台/电源/通信）

import { ref, computed } from "vue"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { useAlerts } from "@/composables/useAlerts"
import { useTasks } from "@/composables/useTasks"
import { useLockState } from "@/composables/useLockState"
import { RobotStatus } from "@/types/robot"
import { makeMockImg } from "@/utils/mockImage"

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

const activeTab = ref<"info" | "attachments" | "maintenance">("info")
const attachmentTab = ref<"chassis" | "sensor" | "gimbal" | "power" | "comms">("chassis")

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

// 挂载组件数据（mock）
const attachments = {
  chassis: [
    { name: "底盘驱动模组", model: "CDM-3000", status: "normal", health: 92 },
    { name: "悬挂系统", model: "SUS-200", status: "normal", health: 88 },
    { name: "车轮编码器", model: "ENC-04", status: "normal", health: 95 },
  ],
  sensor: [
    { name: "激光雷达", model: "LiDAR-16", status: "normal", health: 90 },
    { name: "超声波传感器", model: "USS-08", status: "normal", health: 85 },
    { name: "红外热像仪", model: "IR-640", status: "normal", health: 78 },
    { name: "气体传感器阵列", model: "GAS-8CH", status: "warn", health: 62 },
  ],
  gimbal: [
    { name: "云台俯仰电机", model: "PTZ-P-01", status: "normal", health: 94 },
    { name: "云台旋转电机", model: "PTZ-Y-01", status: "normal", health: 91 },
    { name: "光学相机", model: "CAM-20MP", status: "normal", health: 87 },
  ],
  power: [
    { name: "动力电池组", model: "LIB-48V/100Ah", status: "normal", health: 82 },
    { name: "电池管理系统", model: "BMS-v3", status: "normal", health: 96 },
    { name: "无线充电模块", model: "WPT-1kW", status: "normal", health: 90 },
  ],
  comms: [
    { name: "4G/5G 通信模块", model: "5G-M.2", status: "normal", health: 98 },
    { name: "WiFi 6 模块", model: "AX210", status: "normal", health: 93 },
    { name: "GPS/RTK 定位", model: "RTK-100", status: "normal", health: 88 },
  ],
}

const attachmentTabLabels: Record<string, string> = {
  chassis: "底盘", sensor: "传感器", gimbal: "云台", power: "电源", comms: "通信",
}

// 维保信息
const maintenanceInfo = computed(() => ({
  totalRunHours: 2480,
  batteryCycles: 380,
  lastMaintenance: "2026-06-15",
  nextMaintenance: "2026-07-15",
  maintenanceStatus: "正常" as const,
  firmwareVersion: "v3.2.1",
  hardwareVersion: "R2.4",
}))

// 3D 模型视图切换
const modelViewTab = ref<"front" | "side" | "top">("front")
const modelViewLabels: Record<string, string> = { front: "正视图", side: "侧视图", top: "俯视图" }
</script>

<template>
  <div v-if="selectedRobot" class="detail">
    <!-- 状态标题 -->
    <div class="detail__header">
      <div class="detail__title-row">
        <span class="detail__dot" :style="{ background: statusColor(selectedRobot.status), boxShadow: `0 0 8px ${statusColor(selectedRobot.status)}` }"></span>
        <span class="detail__title">{{ selectedRobot.name }}</span>
      </div>
      <span class="detail__status-tag" :style="{ color: statusColor(selectedRobot.status), borderColor: statusColor(selectedRobot.status) }">{{ STATUS_TEXT[selectedRobot.status] }}</span>
    </div>

    <!-- Tab 切换 -->
    <div class="detail__tabs">
      <button class="dt-tab" :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">基本信息</button>
      <button class="dt-tab" :class="{ active: activeTab === 'attachments' }" @click="activeTab = 'attachments'">挂载组件</button>
      <button class="dt-tab" :class="{ active: activeTab === 'maintenance' }" @click="activeTab = 'maintenance'">维保信息</button>
    </div>

    <!-- Tab: 基本信息 -->
    <div v-if="activeTab === 'info'" class="detail__tab-content">
      <!-- 模拟 3D 模型视图 -->
      <div class="detail__model-preview">
        <div class="model-silhouette" :style="{ backgroundImage: `url('${makeMockImg(selectedRobot.name + ' 3D', '#1a2b3c', '#2f4a6b')}')` }">
          <div class="model-view-tabs">
            <button v-for="(lbl, key) in modelViewLabels" :key="key" class="mv-tab" :class="{ active: modelViewTab === key }" @click="modelViewTab = key as any">{{ lbl }}</button>
          </div>
          <div class="model-hint">🤖 3D 模型预览</div>
        </div>
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
          <span class="detail__stat-value" :class="{ 'danger-txt': selectedRobot.signalStrength < 30 }">{{ selectedRobot.signalStrength }}%</span>
        </div>
        <div class="detail__stat">
          <span class="detail__stat-label">累计里程</span>
          <span class="detail__stat-value">{{ (selectedRobot.batteryLevel * 48 + 1200).toLocaleString() }} km</span>
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
        <div class="detail__stat">
          <span class="detail__stat-label">更新时间</span>
          <span class="detail__stat-value mono">{{ new Date(selectedRobot.updatedAt).toLocaleTimeString('zh-CN', { hour12: false }) }}</span>
        </div>
      </div>
    </div>

    <!-- Tab: 挂载组件 -->
    <div v-if="activeTab === 'attachments'" class="detail__tab-content">
      <div class="attach-tabs">
        <button v-for="(lbl, key) in attachmentTabLabels" :key="key" class="at-tab" :class="{ active: attachmentTab === key }" @click="attachmentTab = key as any">{{ lbl }}</button>
      </div>
      <div class="attach-list">
        <div v-for="item in attachments[attachmentTab]" :key="item.name" class="attach-item" :class="{ 'attach-item--warn': item.status === 'warn' }">
          <div class="ai-header">
            <span class="ai-name">{{ item.name }}</span>
            <span class="ai-model">{{ item.model }}</span>
            <span class="ai-health-dot" :class="item.health > 80 ? 'safe' : item.health > 60 ? 'mid' : 'low'" :title="`健康度 ${item.health}%`"></span>
          </div>
          <div class="ai-bar-bg">
            <div class="ai-bar-fill" :class="item.health > 80 ? 'safe' : item.health > 60 ? 'mid' : 'low'" :style="{ width: item.health + '%' }"></div>
          </div>
          <div class="ai-footer">
            <span class="ai-health">健康度 {{ item.health }}%</span>
            <span class="ai-status" :class="item.status === 'warn' ? 'warn-txt' : 'safe-txt'">{{ item.status === 'warn' ? '⚠ 需关注' : '✓ 正常' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: 维保信息 -->
    <div v-if="activeTab === 'maintenance'" class="detail__tab-content">
      <div class="maintenance-grid">
        <div class="maint-item">
          <span class="maint-label">累计运行时长</span>
          <span class="maint-value">{{ maintenanceInfo.totalRunHours }}<em>h</em></span>
        </div>
        <div class="maint-item">
          <span class="maint-label">电池循环次数</span>
          <span class="maint-value">{{ maintenanceInfo.batteryCycles }}<em>次</em></span>
        </div>
        <div class="maint-item">
          <span class="maint-label">上次维保</span>
          <span class="maint-value">{{ maintenanceInfo.lastMaintenance }}</span>
        </div>
        <div class="maint-item maint-item--warn">
          <span class="maint-label">下次维保</span>
          <span class="maint-value">{{ maintenanceInfo.nextMaintenance }}</span>
        </div>
        <div class="maint-item">
          <span class="maint-label">维保状态</span>
          <span class="maint-value safe-txt">{{ maintenanceInfo.maintenanceStatus }}</span>
        </div>
        <div class="maint-item">
          <span class="maint-label">固件版本</span>
          <span class="maint-value mono">{{ maintenanceInfo.firmwareVersion }}</span>
        </div>
        <div class="maint-item">
          <span class="maint-label">硬件版本</span>
          <span class="maint-value mono">{{ maintenanceInfo.hardwareVersion }}</span>
        </div>
        <div class="maint-item maint-item--full">
          <span class="maint-label">运行状态摘要</span>
          <span class="maint-value dim">设备运行正常，建议按期维保</span>
        </div>
      </div>
    </div>

    <!-- 关联任务 -->
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

    <!-- 关联告警 -->
    <div class="detail__section panel-title">关联告警</div>
    <div v-if="!byRobot(selectedRobot.id).value.length" class="detail__empty">暂无告警</div>
    <div v-for="a in byRobot(selectedRobot.id).value" :key="a.id" class="detail__alert" :class="`is-${a.severity}`">
      <span class="da-title">{{ a.title }}</span>
      <button v-if="!isLocked && a.status === 'active'" class="mini-btn mini-btn--warn" @click="emit('ack-alert', a.id)">ACK</button>
    </div>

    <!-- 操作按钮 -->
    <div class="detail__actions" v-if="!isLocked">
      <button class="action-btn action-btn--accent" @click="emit('remote-control')">切入远控</button>
      <button class="action-btn action-btn--danger" @click="emit('takeover', selectedRobot.id)">故障接管</button>
      <button class="action-btn action-btn--warn" @click="emit('dispatch', selectedRobot.id)">紧急派车</button>
      <button class="action-btn action-btn--info" @click="emit('work-ticket-trigger')">触发作业票</button>
    </div>
  </div>
</template>

<style scoped>
.detail { font-size: 12px; display: flex; flex-direction: column; gap: 8px; }

/* 头部 */
.detail__header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: linear-gradient(135deg, rgba(197, 168, 123, 0.08), rgba(10, 16, 26, 0.4)); border: 1px solid rgba(197, 168, 123, 0.18); border-radius: 6px; }
.detail__title-row { display: flex; align-items: center; gap: 8px; }
.detail__dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.detail__title { color: var(--hud-accent); font-weight: 600; font-size: 14px; letter-spacing: 1px; }
.detail__status-tag { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 999px; border: 1px solid; background: rgba(255, 255, 255, 0.04); }

/* Tab 切换 */
.detail__tabs { display: flex; gap: 4px; padding: 2px; background: rgba(0,0,0,0.25); border-radius: 6px; }
.dt-tab { flex: 1; padding: 6px 8px; background: transparent; border: none; color: var(--hud-text-dim); cursor: pointer; font-size: 10px; border-radius: 4px; transition: all 0.2s; letter-spacing: 0.5px; }
.dt-tab.active { background: rgba(0, 229, 255, 0.12); color: #00E5FF; }

.detail__tab-content { padding: 0; }

/* 3D 模型预览 */
.detail__model-preview { margin-bottom: 8px; }
.model-silhouette { height: 80px; background-size: cover; background-position: center; border-radius: 6px; position: relative; border: 1px solid rgba(107,142,173,0.2); display: flex; align-items: center; justify-content: center; }
.model-view-tabs { position: absolute; top: 4px; right: 4px; display: flex; gap: 2px; }
.mv-tab { padding: 2px 6px; font-size: 8px; background: rgba(0,0,0,0.6); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 3px; cursor: pointer; }
.mv-tab.active { background: rgba(0,229,255,0.2); border-color: #00E5FF; color: #00E5FF; }
.model-hint { font-size: 10px; color: var(--hud-text-faint); background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 4px; }

/* 基本信息 stats */
.detail__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.detail__stat { padding: 8px 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(107, 142, 173, 0.14); border-radius: 4px; display: flex; flex-direction: column; gap: 3px; transition: all 0.2s ease; }
.detail__stat:hover { border-color: rgba(197, 168, 123, 0.25); background: rgba(197, 168, 123, 0.04); }
.detail__stat--full { grid-column: span 2; }
.detail__stat-label { font-size: 9px; color: var(--hud-text-faint); letter-spacing: 0.5px; }
.detail__stat-value { font-size: 12px; color: var(--hud-text); font-family: var(--hud-mono); font-weight: 500; }
.mono { font-family: var(--hud-mono); }
.detail__battery { display: flex; align-items: center; gap: 8px; }
.battery-bar { flex: 1; height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.battery-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.battery-fill.high { background: linear-gradient(90deg, #22C55E, #4ADE80); }
.battery-fill.mid { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
.battery-fill.low { background: linear-gradient(90deg, #EF4444, #F87171); }
.danger-txt { color: #EF4444; }

/* 挂载组件 Tab */
.attach-tabs { display: flex; gap: 4px; padding: 4px; background: rgba(0,0,0,0.2); border-radius: 6px; margin-bottom: 8px; }
.at-tab { flex: 1; padding: 4px 6px; background: transparent; border: none; color: var(--hud-text-dim); cursor: pointer; font-size: 10px; border-radius: 4px; transition: all 0.2s; }
.at-tab.active { background: rgba(197, 168, 123, 0.15); color: var(--hud-accent); }

.attach-list { display: flex; flex-direction: column; gap: 6px; }
.attach-item { padding: 8px 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(107,142,173,0.14); border-radius: 6px; }
.attach-item--warn { border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.04); }
.ai-header { display: flex; align-items: center; gap: 6px; }
.ai-name { font-size: 11px; color: var(--hud-text); flex: 1; }
.ai-model { font-size: 9px; color: var(--hud-text-faint); font-family: var(--hud-mono); }
.ai-health-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.ai-health-dot.safe { background: #22C55E; box-shadow: 0 0 4px #22C55E; }
.ai-health-dot.mid { background: #F59E0B; box-shadow: 0 0 4px #F59E0B; }
.ai-health-dot.low { background: #EF4444; box-shadow: 0 0 4px #EF4444; }
.ai-bar-bg { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; margin: 6px 0; overflow: hidden; }
.ai-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
.ai-bar-fill.safe { background: linear-gradient(90deg, #22C55E, #34D399); }
.ai-bar-fill.mid { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
.ai-bar-fill.low { background: linear-gradient(90deg, #EF4444, #F87171); }
.ai-footer { display: flex; justify-content: space-between; font-size: 9px; }
.ai-health { color: var(--hud-text-dim); }
.ai-status { font-weight: 500; }
.safe-txt { color: #22C55E; }
.warn-txt { color: #F59E0B; }

/* 维保信息 */
.maintenance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.maint-item { padding: 8px 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(107,142,173,0.14); border-radius: 4px; display: flex; flex-direction: column; gap: 3px; }
.maint-item--full { grid-column: span 2; }
.maint-item--warn { border-color: rgba(245,158,11,0.25); }
.maint-label { font-size: 9px; color: var(--hud-text-faint); }
.maint-value { font-size: 13px; color: var(--hud-text); font-family: var(--hud-mono); }
.maint-value em { font-size: 9px; color: var(--hud-text-dim); font-style: normal; font-weight: 400; }
.maint-value .dim { color: var(--hud-text-faint); }

/* 关联任务和告警 */
.detail__section { margin-top: 4px; font-size: 11px; }
.detail__empty { padding: 10px; text-align: center; color: var(--hud-text-faint); font-size: 10px; background: rgba(255,255,255,0.02); border-radius: 4px; border: 1px dashed rgba(107, 142, 173, 0.18); }
.detail__task { padding: 8px 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(107, 142, 173, 0.12); border-radius: 4px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; gap: 8px; transition: all 0.2s ease; }
.detail__task:hover { border-color: rgba(197, 168, 123, 0.2); }
.dt-info { flex: 1; display: flex; align-items: center; gap: 8px; }
.dt-name { font-size: 11px; color: var(--hud-text); min-width: 70px; }
.dt-progress { flex: 1; height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.dt-progress-bar { height: 100%; background: linear-gradient(90deg, var(--hud-accent-smog), var(--hud-accent)); border-radius: 2px; transition: width 0.3s; }
.dt-val { font-family: var(--hud-mono); font-size: 10px; color: var(--hud-accent); min-width: 30px; text-align: right; }
.detail__task-actions { display: flex; gap: 4px; flex-shrink: 0; }
.mini-btn { padding: 3px 8px; background: transparent; border: 1px solid var(--hud-border); color: var(--hud-text-dim); cursor: pointer; border-radius: 3px; font-size: 9px; letter-spacing: 0.5px; transition: all 0.2s ease; }
.mini-btn:hover { transform: translateY(-1px); }
.mini-btn--warn { color: var(--hud-warn); border-color: rgba(245, 158, 11, 0.35); }
.mini-btn--warn:hover { background: rgba(245, 158, 11, 0.12); }
.mini-btn--danger { color: var(--hud-danger); border-color: rgba(239, 68, 68, 0.35); }
.mini-btn--danger:hover { background: rgba(239, 68, 68, 0.12); }

.detail__alert { padding: 8px 10px; background: rgba(255,255,255,0.02); border-radius: 4px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; gap: 8px; border: 1px solid rgba(107, 142, 173, 0.1); }
.detail__alert.is-critical { border-left: 3px solid var(--hud-danger); background: rgba(239, 68, 68, 0.05); }
.detail__alert.is-warning { border-left: 3px solid var(--hud-warn); background: rgba(245, 158, 11, 0.05); }
.detail__alert.is-info { border-left: 3px solid var(--hud-info); background: rgba(59, 130, 246, 0.05); }
.da-title { font-size: 11px; color: var(--hud-text); }

/* 操作按钮 */
.detail__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.action-btn { padding: 8px 6px; background: rgba(255,255,255,0.04); color: var(--hud-text); border: 1px solid rgba(107, 142, 173, 0.2); border-radius: 4px; cursor: pointer; font-size: 11px; letter-spacing: 0.5px; transition: all 0.2s ease; }
.action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); }
.action-btn--accent { border-color: rgba(197,168,123,0.4); color: var(--hud-accent); background: rgba(197,168,123,0.08); }
.action-btn--accent:hover { background: rgba(197,168,123,0.18); }
.action-btn--danger { border-color: rgba(239,68,68,0.4); color: var(--hud-danger); background: rgba(239,68,68,0.06); }
.action-btn--danger:hover { background: rgba(239,68,68,0.16); }
.action-btn--warn { border-color: rgba(245,158,11,0.4); color: var(--hud-warn); background: rgba(245,158,11,0.06); }
.action-btn--warn:hover { background: rgba(245,158,11,0.16); }
.action-btn--info { border-color: rgba(59,130,246,0.4); color: #60A5FA; background: rgba(59,130,246,0.06); }
.action-btn--info:hover { background: rgba(59,130,246,0.16); }
</style>
