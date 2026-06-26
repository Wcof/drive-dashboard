<script setup lang="ts">
// App 根布局 —— 数字孪生指挥大屏
// 顶部标题栏 | 地图全屏（80%）+ 左右浮动面板（20%）| 底部任务流转
// 整合 useDashboard 驱动所有弹窗/popup/时间轴/任务筛选/自动漫游

import { ref, computed, onUnmounted, onMounted, watch } from "vue"
import { createMockDataService } from "@/mock/mockDataService"
import { setMockDataService } from "@/composables/useMockDataService"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { useLockState, pendingAutoLock } from "@/composables/useLockState"
import { useMapbox } from "@/composables/useMapbox"
import { useDashboard } from "@/composables/useDashboard"
import TopBar from "@/components/TopBar.vue"
import MapStage from "@/components/MapStage.vue"
import Sidebar from "@/components/Sidebar.vue"
import GlobalOverview from "@/components/GlobalOverview.vue"
import RobotList from "@/components/RobotList.vue"
import FocusPanel from "@/components/FocusPanel.vue"
import LayerToggle from "@/components/LayerToggle.vue"
import ConfirmModal from "@/components/ConfirmModal.vue"
import AlertActionModal from "@/components/AlertActionModal.vue"
import TakeoverModal from "@/components/TakeoverModal.vue"
import DispatchModal from "@/components/DispatchModal.vue"
import AuditLogModal from "@/components/AuditLogModal.vue"
import PreemptModal from "@/components/PreemptModal.vue"
import TerminateModal from "@/components/TerminateModal.vue"
import WorkTicketTriggerModal from "@/components/WorkTicketTriggerModal.vue"
import RemoteControlModal from "@/components/RemoteControlModal.vue"
import MapToolbar from "@/components/MapToolbar.vue"
import EvidenceModal from "@/components/EvidenceModal.vue"
import AlertDetailModal from "@/components/AlertDetailModal.vue"
import EnvMetricModal from "@/components/EnvMetricModal.vue"
import ControlModal from "@/components/ControlModal.vue"
import RobotPopup from "@/components/RobotPopup.vue"
import InspectionPointPopup from "@/components/InspectionPointPopup.vue"
import DockPopup from "@/components/DockPopup.vue"
import ApPopup from "@/components/ApPopup.vue"

const service = createMockDataService()
setMockDataService(service)
onUnmounted(() => service.stop())

const { isFocused, selectedRobot } = useSelectedRobot()
const { unlock, lock, resetLockTimer } = useLockState()
const dash = useDashboard()

const showLayerToggle = ref(false)
const lockConfirm = ref(false)
const unlockConfirm = ref(false)
const autoLockConfirm = ref(false)
const takeoverTarget = ref<string | null>(null)
const dispatchTarget = ref<string | null>(null)
const ackAlertTarget = ref<string | null>(null)
const preemptTarget = ref<string | null>(null)
const terminateTarget = ref<string | null>(null)
const showWorkTicketTrigger = ref(false)
const showRemoteControl = ref(false)
const showAuditLog = ref(false)

function onRequestLock(): void { lockConfirm.value = true }
function onRequestUnlock(): void { unlockConfirm.value = true }
function onConfirmLock(): void { lock(); lockConfirm.value = false }
function onConfirmUnlock(): void { unlock(); unlockConfirm.value = false; resetLockTimer() }
function onAutoLockConfirm(): void { autoLockConfirm.value = true; lock() }

watch(pendingAutoLock, (v) => { if (v) autoLockConfirm.value = true })

function onTakeover(robotId: string): void { takeoverTarget.value = robotId }
function onDispatch(robotId: string): void { dispatchTarget.value = robotId }
function onAckAlert(alertId: string): void { ackAlertTarget.value = alertId }
function onPreempt(taskId: string): void { preemptTarget.value = taskId }
function onTerminate(taskId: string): void { terminateTarget.value = taskId }
function onWorkTicketTrigger(): void { showWorkTicketTrigger.value = true }
function onRemoteControl(): void { showRemoteControl.value = true }

const { map } = useMapbox()

// === 时间轴数据驱动 ===
const currentTask = computed(() => dash.currentTask.value)
const timelineNodes = computed(() => currentTask.value?.timeline.nodes ?? [])

// === 任务筛选 ===
const taskFilterTabs = [
  { key: "all", label: "全部" },
  { key: "running", label: "执行中" },
  { key: "completed", label: "已完成" },
  { key: "pending", label: "待执行" },
] as const
const filteredTaskPool = computed(() => {
  const f = dash.state.taskFilter
  if (f === "all") return dash.taskPool.value
  return dash.taskPool.value.filter((t) => t.state === f)
})

// === 右面板统计 ===
const facilityTotal = computed(() => 12 + 28 + 16 + dash.apDevices.value.length)
const dockChargingCount = computed(() => dash.docks.value.filter(d => d.status === 'charging').length)
const dockFullCount = computed(() => dash.docks.value.filter(d => d.status === 'safe').length)
const dockQueueCount = computed(() => dash.docks.value.filter(d => d.status === 'warn').length)

// 信息播报（复刻参考页面 broadcast-panel）
const broadcastMsgs = computed(() => {
  const msgs: { type: string; text: string }[] = [
    { type: 'normal', text: 'robot-north-1 完成E区动力站房特巡，结果正常' },
    { type: 'normal', text: 'robot-east-1 正在执行B区例行安防巡检' },
    { type: 'alert', text: '2#高压冷凝机组压力异常，已自动派单' },
    { type: 'normal', text: 'A区-主干道充电站 robot-center-1 充电完成，待离站' },
    { type: 'normal', text: 'robot-west-1 电量低于20%，正在返航C区基站' },
  ]
  return msgs
})

// === 自动漫游（8s 轮播） ===
let autoplayTimer: ReturnType<typeof setInterval> | null = null
const autoplayItems = computed(() => {
  const items: { type: string; id: string }[] = []
  dash.robotsExt.value.forEach((r) => items.push({ type: "robot", id: r.id }))
  dash.alertsExt.value.forEach((a) => items.push({ type: "alert", id: a.id }))
  dash.docks.value.forEach((d) => items.push({ type: "dock", id: d.id }))
  return items
})

function tickAutoplay(): void {
  if (!dash.state.autoplayEnabled) return
  const items = autoplayItems.value
  if (items.length === 0) return
  dash.state.autoplayIndex = (dash.state.autoplayIndex + 1) % items.length
  const item = items[dash.state.autoplayIndex]
  dash.setFocus(item.type as any, item.id)
}

onMounted(() => {
  autoplayTimer = setInterval(tickAutoplay, 8000)
})
onUnmounted(() => {
  if (autoplayTimer) clearInterval(autoplayTimer)
})

// 点击时间轴节点跳转
function onTimelineNodeClick(node: { status: string; alertId?: string; coords: [number, number] }): void {
  dash.state.autoplayEnabled = false
  if (node.alertId) {
    dash.setFocus("alert", node.alertId)
  }
  if (map.value) {
    map.value.easeTo({ center: node.coords, zoom: 17, duration: 800 })
  }
}

// 点击任务池项切换任务
function onTaskPoolClick(task: { tk: string; bot: string }): void {
  dash.withTaskSelection(task.tk, task.bot)
  dash.setFocus("robot", task.bot)
}

// popup 关闭 —— 同时暂停自动轮播，避免 8s 后 tickAutoplay 通过 setFocus 又把同类型 popup 重新打开
function closeRobotPopup(): void { dash.showRobotPopup.value = false; dash.state.autoplayEnabled = false }
function closeInspectionPointPopup(): void { dash.showInspectionPointPopup.value = false; dash.state.autoplayEnabled = false }
function closeDockPopup(): void { dash.showDockPopup.value = false; dash.state.autoplayEnabled = false }
function closeApPopup(): void { dash.showApPopup.value = false; dash.state.autoplayEnabled = false }
</script>

<template>
  <div class="app-root" @click="resetLockTimer">
    <TopBar
      @toggle-layers="showLayerToggle = !showLayerToggle"
      @request-lock="onRequestLock"
      @request-unlock="onRequestUnlock"
      @auto-lock-confirm="onAutoLockConfirm"
    />

    <main class="app-main">
      <!-- 左侧浮动面板：运营态势 L1 -->
      <aside v-if="!isFocused" class="panel left-panel">
        <GlobalOverview />
        <RobotList />
        <!-- 任务池筛选（复刻参考页面 task-filter-tabs） -->
        <div class="task-filter-section">
          <div class="section-title">任务池</div>
          <div class="task-filter-tabs">
            <button v-for="t in taskFilterTabs" :key="t.key" class="tf-tab" :class="{ active: dash.state.taskFilter === t.key }" @click="dash.setTaskFilter(t.key as any)">{{ t.label }}</button>
          </div>
          <div class="task-pool-list">
            <button v-for="task in filteredTaskPool" :key="task.tk" class="tp-item" @click="onTaskPoolClick(task)">
              <span class="tp-name">{{ task.name }}</span>
              <span class="tp-bot">{{ task.bot }}</span>
              <span class="tp-prog">{{ task.prog }}</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- 中央数字孪生地图 -->
      <div class="app-center">
        <MapStage v-if="!isFocused" />
        <FocusPanel v-else :key="selectedRobot?.id" />
        <!-- 全息光栅扫描遮罩 -->
        <div v-if="!isFocused" class="holo-scan"></div>
        <!-- 地图暗角 -->
        <div v-if="!isFocused" class="map-vignette"></div>
        <!-- 地图工具栏（复刻参考页面 display-control + 搜索 + 视角重置 + 调度/驾驶舱） -->
        <MapToolbar v-if="!isFocused" />
        <LayerToggle v-if="showLayerToggle && !isFocused" />
        <!-- 设施图例 -->
        <div v-if="!isFocused" class="map-legend">
          <div class="legend-title">设施图例</div>
          <div class="legend-row"><span class="lg-dot" style="background:#C5A87B"></span>充电站</div>
          <div class="legend-row"><span class="lg-dot" style="background:#EF4444"></span>消防站</div>
          <div class="legend-row"><span class="lg-dot" style="background:#F59E0B"></span>储罐区</div>
          <div class="legend-row"><span class="lg-dot" style="background:#6B8EAD"></span>生产车间</div>
          <div class="legend-row"><span class="lg-dot" style="background:#3B82F6"></span>办公楼</div>
        </div>

        <!-- 地图 Popup 层 -->
        <div v-if="dash.showRobotPopup.value && dash.currentRobotExt.value" class="map-popup-anchor" :style="{ left: '35%', top: '8%' }">
          <RobotPopup @close="closeRobotPopup" />
        </div>
        <div v-if="dash.showInspectionPointPopup.value && dash.currentInspectionPoint.value" class="map-popup-anchor" :style="{ left: '45%', top: '8%' }">
          <InspectionPointPopup :point-id="dash.state.currentInspectionPointId ?? ''" @close="closeInspectionPointPopup" />
        </div>
        <div v-if="dash.showDockPopup.value && dash.currentDock.value" class="map-popup-anchor" :style="{ left: '25%', top: '8%' }">
          <DockPopup :dock-id="dash.state.currentDockId ?? ''" @close="closeDockPopup" />
        </div>
        <div v-if="dash.showApPopup.value && dash.currentAp.value" class="map-popup-anchor" :style="{ left: '55%', top: '8%' }">
          <ApPopup :ap-id="dash.state.currentApId ?? ''" @close="closeApPopup" />
        </div>

        <!-- 底部任务流转时间轴 L4（数据驱动） —— absolute 定位在 app-center 底部 -->
        <div v-if="!isFocused" class="bottom-timeline">
          <div class="tl-header">
            <span class="tl-title">{{ currentTask?.timeline.title ?? '巡检任务执行流' }}</span>
            <div class="tl-controls">
              <button class="tl-auto-btn" :class="{ active: dash.state.autoplayEnabled }" @click="dash.state.autoplayEnabled = !dash.state.autoplayEnabled">
                {{ dash.state.autoplayEnabled ? '⏸ 暂停轮播' : '▶ 自动轮播' }}
              </button>
              <span class="tl-sub">{{ dash.state.topContext }}</span>
            </div>
          </div>
          <div class="tl-track">
            <div class="f-line"></div>
            <div class="f-flow"></div>
            <div v-for="node in timelineNodes" :key="node.name" class="f-node" :class="node.status" :style="{ left: node.pos }" @click="onTimelineNodeClick(node)">
              <div class="f-point"></div>
              <div class="f-info">
                <span class="time">{{ node.time }}</span>
                <span class="name">{{ node.name }}</span>
                <span v-if="node.res" class="res">{{ node.res }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧浮动面板：风险告警 L1 -->
      <aside class="panel right-panel">
        <!-- 安全风险（复刻参考页面 operation-status：盾牌 + 4类分项） -->
        <section class="risk-section card">
          <div class="card-header">
            <h3 class="section-title">安全风险</h3>
            <span class="rs-tag">重点关注</span>
          </div>
          <div class="risk-shield">
            <svg class="risk-shield__icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-3z"></path>
            </svg>
            <div class="risk-shield__center">
              <div class="risk-shield__num">{{ dash.alertsExt.value.length }}</div>
              <div class="risk-shield__label">当前告警总数</div>
            </div>
          </div>
          <div class="risk-breakdown">
            <div class="risk-row"><span class="risk-dot" style="background:#EF4444"></span><span>巡检点</span><span class="risk-val">{{ dash.alertsExt.value.filter(a => a.level === 'danger').length }}</span></div>
            <div class="risk-row"><span class="risk-dot" style="background:#F59E0B"></span><span>设施设备</span><span class="risk-val">{{ dash.alertsExt.value.filter(a => a.level === 'warn').length }}</span></div>
            <div class="risk-row"><span class="risk-dot" style="background:#6B8EAD"></span><span>气体异常</span><span class="risk-val">3</span></div>
            <div class="risk-row"><span class="risk-dot" style="background:#22C55E"></span><span>安全行为</span><span class="risk-val">1</span></div>
          </div>
        </section>

        <!-- 设备运行状态（复刻参考页面 device-status：环形图） -->
        <section class="device-status card">
          <div class="card-header">
            <h3 class="section-title">设备运行状态</h3>
          </div>
          <div class="device-ring">
            <svg viewBox="0 0 36 36" class="device-ring__svg">
              <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="ring-ok" stroke-dasharray="91.7, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="ring-warn" stroke-dasharray="4.2, 100" stroke-dashoffset="-91.7" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="ring-off" stroke-dasharray="4.2, 100" stroke-dashoffset="-95.9" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div class="device-ring__center">
              <div class="device-ring__num">48</div>
              <div class="device-ring__label">设备总数</div>
            </div>
          </div>
          <div class="device-legend">
            <div class="dl-item"><span class="dl-dot" style="background:#10B981"></span><span>正常</span><span class="dl-val">44台</span><span class="dl-pct">91.7%</span></div>
            <div class="dl-item"><span class="dl-dot" style="background:#F59E0B"></span><span>告警</span><span class="dl-val">2台</span><span class="dl-pct">4.2%</span></div>
            <div class="dl-item"><span class="dl-dot" style="background:#64748B"></span><span>离线</span><span class="dl-val">2台</span><span class="dl-pct">4.2%</span></div>
          </div>
        </section>

        <!-- 能耗监测（复刻参考页面 energy-monitor：4项 + 同比 + 折线图） -->
        <section class="energy-section card">
          <div class="card-header">
            <h3 class="section-title">能耗监测</h3>
            <span class="rs-tag">今日</span>
          </div>
          <div class="energy-grid">
            <div class="energy-item">
              <div class="energy-label">今日用电</div>
              <div class="energy-val">398<em>kWh</em></div>
              <div class="energy-trend down">同比 ↓8.2%</div>
            </div>
            <div class="energy-item">
              <div class="energy-label">今日用水</div>
              <div class="energy-val">12.5<em>吨</em></div>
              <div class="energy-trend down">同比 ↓5.1%</div>
            </div>
            <div class="energy-item">
              <div class="energy-label">今日燃气</div>
              <div class="energy-val">55<em>m³</em></div>
              <div class="energy-trend up">同比 ↑3.3%</div>
            </div>
            <div class="energy-item">
              <div class="energy-label">环境能耗</div>
              <div class="energy-val">1.2<em>tce</em></div>
              <div class="energy-trend down">同比 ↓6.7%</div>
            </div>
          </div>
          <div class="energy-chart">
            <svg viewBox="0 0 100 32" preserveAspectRatio="none" class="energy-chart__svg">
              <defs>
                <linearGradient id="energyArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.35"></stop>
                  <stop offset="100%" stop-color="#00E5FF" stop-opacity="0"></stop>
                </linearGradient>
              </defs>
              <path class="energy-area" d="M0,24 L8,20 L16,22 L24,14 L32,16 L40,10 L48,12 L56,8 L64,11 L72,6 L80,9 L88,5 L100,7 L100,32 L0,32 Z" fill="url(#energyArea)"></path>
              <path class="energy-line" d="M0,24 L8,20 L16,22 L24,14 L32,16 L40,10 L48,12 L56,8 L64,11 L72,6 L80,9 L88,5 L100,7" fill="none" stroke="#00E5FF" stroke-width="0.6" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </div>
        </section>

        <!-- 信息播报（复刻参考页面 broadcast-panel） -->
        <section class="broadcast-section card">
          <div class="card-header">
            <h3 class="section-title">信息播报</h3>
          </div>
          <div class="broadcast-list">
            <div v-for="(msg, i) in broadcastMsgs" :key="i" class="broadcast-row" :class="{ alert: msg.type === 'alert' }">{{ msg.text }}</div>
          </div>
        </section>

        <!-- 设施设备概览（复刻参考页面 env-summary） -->
        <section class="facility-section card">
          <div class="card-header">
            <h3 class="section-title">设施设备概览</h3>
            <span class="rs-tag">设施设备总数: <strong>{{ facilityTotal }}</strong></span>
          </div>
          <div class="summary-grid two-columns">
            <div class="summary-item"><span class="s-label">温度计</span><span class="s-val">12</span><span class="s-meta">异常 0</span></div>
            <div class="summary-item"><span class="s-label">直流阀</span><span class="s-val">28</span><span class="s-meta">异常 0</span></div>
            <div class="summary-item"><span class="s-label">交流柜</span><span class="s-val">16</span><span class="s-meta">异常 0</span></div>
            <div class="summary-item"><span class="s-label">AP设备</span><span class="s-val">{{ dash.apDevices.value.length }}</span><span class="s-meta">异常 0</span></div>
          </div>
        </section>

        <!-- 充电站概览（复刻参考页面 dock-status） -->
        <section class="dock-section card">
          <div class="card-header">
            <h3 class="section-title">充电站概览</h3>
          </div>
          <div class="summary-grid two-columns">
            <div class="summary-item"><span class="s-label">充电站数量</span><span class="s-val">{{ dash.docks.value.length }}</span></div>
            <div class="summary-item"><span class="s-label">当前充电台数</span><span class="s-val">{{ dockChargingCount }}</span></div>
            <div class="summary-item"><span class="s-label">已充满未离站</span><span class="s-val">{{ dockFullCount }}</span></div>
            <div class="summary-item"><span class="s-label">排队台数</span><span class="s-val">{{ dockQueueCount }}</span></div>
          </div>
        </section>

        <Sidebar
          @takeover="onTakeover"
          @dispatch="onDispatch"
          @ack-alert="onAckAlert"
          @preempt="onPreempt"
          @terminate="onTerminate"
          @work-ticket-trigger="onWorkTicketTrigger"
          @remote-control="onRemoteControl"
        />
        <!-- 告警列表（复刻参考页面 alerts 面板） -->
        <div v-if="dash.alertsExt.value.length" class="alert-ext-section">
          <div class="section-title">实时告警</div>
          <div class="alert-ext-list">
            <button v-for="a in dash.alertsExt.value" :key="a.id" class="ae-item" :class="a.level" @click="dash.setFocus('alert', a.id); dash.openAlertDetailModal()">
              <span class="ae-time">{{ a.time }}</span>
              <span class="ae-level" :class="a.level">{{ a.level === 'danger' ? '严重' : '警告' }}</span>
              <span class="ae-device">{{ a.device }}</span>
              <span class="ae-state">{{ a.state }}</span>
            </button>
          </div>
        </div>
      </aside>
    </main>

    <button class="app-root__audit-btn" @click="showAuditLog = true">审计日志</button>

    <!-- 弹窗层（原有） -->
    <ConfirmModal v-if="lockConfirm" title="锁定指挥大屏" message="锁定后将进入只读态势，确认锁定？" confirm-text="锁定" @confirm="onConfirmLock" @cancel="lockConfirm = false" />
    <ConfirmModal v-if="unlockConfirm" title="解锁指挥大屏" message="解锁后可执行操作，确认解锁？" confirm-text="解锁" @confirm="onConfirmUnlock" @cancel="unlockConfirm = false" />
    <ConfirmModal v-if="autoLockConfirm" title="即将自动锁定" message="15 分钟无操作，已自动锁定。是否立即解锁继续操作？" confirm-text="立即解锁" @confirm="onConfirmUnlock" @cancel="autoLockConfirm = false" />
    <AlertActionModal v-if="ackAlertTarget" :alert-id="ackAlertTarget" @close="ackAlertTarget = null" />
    <TakeoverModal v-if="takeoverTarget" :robot-id="takeoverTarget" @close="takeoverTarget = null" />
    <DispatchModal v-if="dispatchTarget" :robot-id="dispatchTarget" @close="dispatchTarget = null" />
    <PreemptModal v-if="preemptTarget" :task-id="preemptTarget" @close="preemptTarget = null" />
    <TerminateModal v-if="terminateTarget" :task-id="terminateTarget" @close="terminateTarget = null" />
    <WorkTicketTriggerModal v-if="showWorkTicketTrigger" @close="showWorkTicketTrigger = false" />
    <RemoteControlModal v-if="showRemoteControl" @close="showRemoteControl = false" />
    <AuditLogModal v-if="showAuditLog" @close="showAuditLog = false" />

    <!-- 弹窗层（新增：复刻参考页面） -->
    <EvidenceModal />
    <AlertDetailModal v-if="dash.showAlertDetailModal.value" />
    <EnvMetricModal v-if="dash.showEnvMetricModal.value" />
    <ControlModal v-if="dash.showControlModal.value" />
  </div>
</template>

<style scoped>
.app-root { flex: 1; display: flex; flex-direction: column; position: relative; background: #030610; overflow: hidden; }

.app-main { flex: 1; display: flex; overflow: hidden; position: relative; gap: 0.16rem; padding: 0 0.16rem 0.14rem; }
.app-center { flex: 1; position: relative; min-width: 0; }
.app-center :deep(.map-stage) { position: absolute; inset: 0; }

/* 全息光栅扫描 */
.holo-scan {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 229, 255, 0.04) 50%, transparent 100%);
  background-size: 100% 200%;
  animation: holoScan 8s linear infinite;
  mix-blend-mode: screen;
}
@keyframes holoScan { 0% { background-position: 0 -100%; } 100% { background-position: 0 100%; } }

/* 地图暗角 */
.map-vignette {
  position: absolute; inset: 0; z-index: 2; pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(3,6,16,0) 0%, rgba(3,6,16,0.4) 70%, rgba(3,6,16,0.8) 100%);
}

/* 地图 Popup 锚点 —— 弹窗在锚点下方，避免顶部超出 */
.map-popup-anchor { position: absolute; z-index: 25; pointer-events: auto; transform: translate(-50%, 0); max-height: 88%; }

/* 设施图例 */
.map-legend {
  position: absolute; left: 0.2rem; bottom: 1rem; z-index: 12;
  background: rgba(8, 14, 26, 0.78); border: 1px solid rgba(107, 142, 173, 0.22);
  border-radius: 0.06rem; padding: 0.1rem 0.12rem; backdrop-filter: blur(0.1rem);
  display: flex; flex-direction: column; gap: 0.05rem; pointer-events: none;
}
.legend-title { font-size: 0.11rem; color: var(--hud-accent); letter-spacing: 1px; margin-bottom: 0.04rem; }
.legend-row { display: flex; align-items: center; gap: 0.06rem; font-size: 0.11rem; color: var(--hud-text-dim); }
.lg-dot { width: 0.08rem; height: 0.08rem; border-radius: 50%; box-shadow: 0 0 0.06rem currentColor; }

/* 浮动面板通用 —— flex 布局，三栏并排，地图在中间不被遮挡 */
.panel {
  display: flex; flex-direction: column; gap: 0.12rem;
  pointer-events: auto; position: relative;
  z-index: 20;
  overflow-y: auto; overflow-x: hidden;
  padding: 0.14rem;
  border: 1px solid rgba(197, 168, 123, 0.08);
  background: rgba(8, 14, 26, 0.45);
  backdrop-filter: blur(0.16rem);
  box-shadow: 0 0.1rem 0.3rem rgba(0, 0, 0, 0.6), 0 0 0.2rem rgba(0, 229, 255, 0.05);
  border-radius: 0.08rem;
  flex-shrink: 0;
}

.left-panel { width: 4.2rem; }
.right-panel { width: 4.6rem; }

/* 任务筛选 */
.task-filter-section { margin-top: 0.08rem; }
.task-filter-tabs { display: flex; gap: 0.04rem; margin-bottom: 0.06rem; }
.tf-tab { padding: 0.03rem 0.08rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.22); color: var(--hud-text-dim); border-radius: 0.03rem; cursor: pointer; font-size: 0.1rem; }
.tf-tab.active { color: var(--hud-accent); border-color: var(--hud-accent); background: rgba(197,168,123,0.12); }
.task-pool-list { display: flex; flex-direction: column; gap: 0.04rem; }
.tp-item { display: flex; align-items: center; gap: 0.06rem; padding: 0.05rem 0.08rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(107,142,173,0.18); border-radius: 0.03rem; cursor: pointer; color: var(--hud-text); font-size: 0.1rem; text-align: left; }
.tp-item:hover { border-color: rgba(197,168,123,0.4); }
.tp-name { flex: 1; }
.tp-bot { color: var(--hud-text-dim); font-size: 0.09rem; }
.tp-prog { color: var(--hud-accent); font-family: var(--hud-mono); font-size: 0.09rem; }

/* 告警列表 */
.alert-ext-section { margin-top: 0.08rem; }

/* 右面板新区块通用 */
.card { background: rgba(8,14,26,0.45); border: 1px solid rgba(0,229,255,0.12); border-radius: 0.06rem; backdrop-filter: blur(0.12rem); display: flex; flex-direction: column; padding: 0.1rem 0.12rem; gap: 0.06rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.rs-tag { font-size: 0.09rem; color: var(--hud-text-dim); }
.rs-tag strong { color: var(--hud-accent); font-family: var(--hud-mono); }
.summary-grid { display: grid; gap: 0.06rem; }
.summary-grid.two-columns { grid-template-columns: repeat(2, 1fr); }
.summary-grid.four-columns { grid-template-columns: repeat(4, 1fr); }
.summary-item { background: rgba(8,14,26,0.6); border: 1px solid rgba(0,229,255,0.1); border-radius: 0.04rem; padding: 0.06rem 0.04rem; display: flex; flex-direction: column; gap: 0.02rem; align-items: center; text-align: center; }
.s-label { font-size: 0.09rem; color: var(--hud-text-dim); }
.s-val { font-size: 0.14rem; font-family: var(--hud-mono); color: #00E5FF; font-weight: bold; }
.s-meta { font-size: 0.08rem; color: var(--hud-text-faint); }

/* 安全风险 —— 盾牌视觉 */
.risk-section .risk-shield {
  position: relative; display: flex; align-items: center; justify-content: center;
  height: 1.2rem; margin: 0.04rem 0;
}
.risk-shield__icon {
  position: absolute; width: 1rem; height: 1rem; color: rgba(0, 229, 255, 0.12);
  filter: drop-shadow(0 0 0.12rem rgba(0, 229, 255, 0.2));
}
.risk-shield__center { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.02rem; z-index: 1; }
.risk-shield__num { font-size: 0.34rem; font-family: var(--hud-mono); color: #EF4444; font-weight: bold; line-height: 1; text-shadow: 0 0 0.12rem rgba(239, 68, 68, 0.4); }
.risk-shield__label { font-size: 0.1rem; color: var(--hud-text-dim); letter-spacing: 1px; }
.risk-breakdown { display: flex; flex-direction: column; gap: 0.04rem; }
.risk-row { display: flex; align-items: center; gap: 0.08rem; font-size: 0.1rem; color: var(--hud-text-dim); padding: 0.03rem 0.06rem; background: rgba(0,0,0,0.15); border-radius: 0.03rem; }
.risk-dot { width: 0.06rem; height: 0.06rem; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 0.06rem currentColor; }
.risk-val { margin-left: auto; font-family: var(--hud-mono); color: var(--hud-text); font-weight: bold; }

/* 设备运行状态 —— 环形图 */
.device-status .device-ring { position: relative; width: 1.4rem; height: 1.4rem; margin: 0.04rem auto; }
.device-ring__svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: rgba(255, 255, 255, 0.05); stroke-width: 3.2; }
.ring-ok { fill: none; stroke: #10B981; stroke-width: 3.2; stroke-linecap: round; }
.ring-warn { fill: none; stroke: #F59E0B; stroke-width: 3.2; stroke-linecap: round; }
.ring-off { fill: none; stroke: #64748B; stroke-width: 3.2; stroke-linecap: round; }
.device-ring__center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.02rem; }
.device-ring__num { font-size: 0.24rem; font-family: var(--hud-mono); color: #00E5FF; font-weight: bold; }
.device-ring__label { font-size: 0.09rem; color: var(--hud-text-dim); }
.device-legend { display: flex; flex-direction: column; gap: 0.04rem; }
.dl-item { display: flex; align-items: center; gap: 0.08rem; font-size: 0.1rem; color: var(--hud-text-dim); padding: 0.03rem 0.06rem; background: rgba(0,0,0,0.15); border-radius: 0.03rem; }
.dl-dot { width: 0.06rem; height: 0.06rem; border-radius: 50%; }
.dl-val { margin-left: auto; color: var(--hud-text); font-family: var(--hud-mono); }
.dl-pct { color: var(--hud-text-faint); font-family: var(--hud-mono); font-size: 0.09rem; min-width: 0.4rem; text-align: right; }

/* 能耗监测 */
.energy-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.06rem; }
.energy-item { padding: 0.08rem; background: rgba(8, 14, 26, 0.6); border: 1px solid rgba(0, 229, 255, 0.1); border-radius: 0.04rem; display: flex; flex-direction: column; gap: 0.02rem; }
.energy-label { font-size: 0.09rem; color: var(--hud-text-dim); }
.energy-val { font-size: 0.16rem; font-family: var(--hud-mono); color: #00E5FF; font-weight: bold; }
.energy-val em { font-style: normal; font-size: 0.09rem; color: var(--hud-text-dim); margin-left: 0.02rem; font-weight: 400; }
.energy-trend { font-size: 0.08rem; font-family: var(--hud-mono); }
.energy-trend.down { color: #10B981; }
.energy-trend.up { color: #EF4444; }
.energy-chart { margin-top: 0.06rem; height: 0.7rem; background: rgba(0,0,0,0.2); border-radius: 0.04rem; padding: 0.06rem; }
.energy-chart__svg { width: 100%; height: 100%; }

/* 信息播报 */
.broadcast-section .broadcast-list { display: flex; flex-direction: column; gap: 0.04rem; }
.broadcast-row { font-size: 0.09rem; color: var(--hud-text-dim); padding: 0.04rem 0.06rem; background: rgba(0,0,0,0.15); border-radius: 0.02rem; border-left: 2px solid rgba(107,142,173,0.3); }
.broadcast-row.alert { color: #EF4444; border-left-color: #EF4444; }
.alert-ext-list { display: flex; flex-direction: column; gap: 0.04rem; }
.ae-item { display: flex; align-items: center; gap: 0.06rem; padding: 0.05rem 0.08rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(107,142,173,0.18); border-radius: 0.03rem; cursor: pointer; font-size: 0.1rem; text-align: left; border-left: 3px solid; }
.ae-item.danger { border-left-color: #EF4444; }
.ae-item.warn { border-left-color: #F59E0B; }
.ae-item.safe { border-left-color: #22C55E; }
.ae-item:hover { background: rgba(197,168,123,0.06); }
.ae-time { font-family: var(--hud-mono); color: var(--hud-text); min-width: 0.4rem; }
.ae-level { padding: 0.01rem 0.04rem; border-radius: 0.02rem; font-size: 0.09rem; }
.ae-level.danger { background: rgba(239,68,68,0.18); color: #EF4444; }
.ae-level.warn { background: rgba(245,158,11,0.18); color: #F59E0B; }
.ae-level.safe { background: rgba(34,197,94,0.18); color: #22C55E; }
.ae-device { flex: 1; color: var(--hud-text-dim); }
.ae-state { color: var(--hud-text-dim); font-size: 0.09rem; }

/* 底部任务流转 —— absolute 定位在 app-center 底部，不超出视口 */
.bottom-timeline {
  position: absolute; bottom: 0.14rem; left: 50%; transform: translateX(-50%);
  width: 92%; max-width: 11rem;
  background: rgba(8, 14, 26, 0.88);
  border: 1px solid rgba(0, 229, 255, 0.22);
  border-radius: 0.08rem; padding: 0.14rem 0.28rem;
  display: flex; flex-direction: column; gap: 0.12rem;
  backdrop-filter: blur(0.14rem); pointer-events: auto; z-index: 20;
  box-shadow: 0 -0.08rem 0.24rem rgba(0, 0, 0, 0.5), 0 0 0.2rem rgba(0, 229, 255, 0.06);
}
.tl-header { display: flex; justify-content: space-between; align-items: center; }
.tl-title { color: #00E5FF; font-size: 0.13rem; letter-spacing: 0.02rem; font-weight: 500; }
.tl-controls { display: flex; align-items: center; gap: 0.1rem; }
.tl-auto-btn { padding: 0.03rem 0.1rem; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 0.03rem; cursor: pointer; font-size: 0.1rem; }
.tl-auto-btn.active { color: #00E5FF; border-color: #00E5FF; background: rgba(0,229,255,0.12); }
.tl-sub { font-size: 0.11rem; color: var(--hud-text-faint); font-family: var(--hud-mono); letter-spacing: 1px; }

.tl-track { position: relative; height: 0.52rem; margin: 0 0.4rem; }
.f-line { position: absolute; top: 0.12rem; width: 100%; height: 0.02rem; background: rgba(0, 229, 255, 0.15); }
.f-flow { position: absolute; top: 0.12rem; width: 100%; height: 0.02rem; background: linear-gradient(90deg, transparent, #00E5FF, transparent); background-size: 30% 100%; animation: flowMove 3s linear infinite; }
@keyframes flowMove { 0% { background-position: -30% 0; } 100% { background-position: 130% 0; } }
.f-node { position: absolute; top: 0.08rem; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; width: 1rem; cursor: pointer; }
.f-point { width: 0.1rem; height: 0.1rem; border-radius: 50%; background: var(--hud-text-dim); border: 0.02rem solid #030610; z-index: 2; position: relative; }
.f-info { margin-top: 0.08rem; display: flex; flex-direction: column; align-items: center; gap: 0.03rem; text-align: center; }
.f-info .time { font-family: var(--hud-mono); font-size: 0.1rem; color: var(--hud-text-faint); }
.f-info .name { font-size: 0.11rem; color: var(--hud-text); font-weight: 500; letter-spacing: 0.5px; }
.f-info .res { font-size: 0.09rem; color: var(--hud-text-dim); }

.f-node.safe .f-point { background: var(--hud-ok); box-shadow: 0 0 0.08rem var(--hud-ok); }
.f-node.warn .f-point { background: var(--hud-warn); box-shadow: 0 0 0.08rem var(--hud-warn); }
.f-node.danger .f-point { background: var(--hud-danger); box-shadow: 0 0 0.08rem var(--hud-danger); }
.f-node.active .f-point { background: #030610; border-color: #00E5FF; width: 0.14rem; height: 0.14rem; top: -0.02rem; box-shadow: 0 0 0.12rem rgba(0, 229, 255, 0.6); }
.f-node.active::before { content: ""; position: absolute; top: -0.07rem; width: 0.24rem; height: 0.24rem; border: 1px dashed #00E5FF; border-radius: 50%; animation: spin 4s linear infinite; }
.f-node.future .f-point { background: transparent; border-color: var(--hud-text-faint); }

@keyframes spin { 100% { transform: rotate(360deg); } }

/* 审计日志入口 */
.app-root__audit-btn {
  position: absolute; left: 0.16rem; bottom: 1.5rem;
  background: rgba(8, 14, 26, 0.78); border: 1px solid var(--hud-border);
  color: var(--hud-text-dim); padding: 0.05rem 0.14rem; font-size: 0.11rem; cursor: pointer;
  border-radius: 999px; z-index: 6; letter-spacing: 1px;
  backdrop-filter: blur(0.08rem); transition: all 0.2s ease;
}
.app-root__audit-btn:hover { border-color: rgba(0, 229, 255, 0.5); color: #00E5FF; box-shadow: 0 0 0.1rem rgba(0, 229, 255, 0.15); }
</style>
