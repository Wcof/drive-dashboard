<script setup lang="ts">
// App 根布局 —— 数字孪生指挥大屏（增强版）
// 顶部标题栏 | 地图全屏（80%）+ 左右浮动面板（20%）| 底部任务流转
// 整合 useDashboard 驱动所有弹窗/popup/时间轴/任务筛选/自动漫游
// 闭环：看证据 → 远控复核 → 下单处置

import { ref, computed, onUnmounted, onMounted, watch } from "vue"
import { createMockDataService } from "@/mock/mockDataService"
import { setMockDataService } from "@/composables/useMockDataService"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { useLockState, pendingAutoLock } from "@/composables/useLockState"
import { useMapbox } from "@/composables/useMapbox"
import { useDashboard } from "@/composables/useDashboard"
import { teardownScale } from "@/composables/useScale"
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
import InspectionExpiryPanel from "@/components/InspectionExpiryPanel.vue"
import ScaleContainer from "@/components/ScaleContainer.vue"
import InspectionExpiryDetailModal from "@/components/InspectionExpiryDetailModal.vue"

const service = createMockDataService()
setMockDataService(service)
onUnmounted(() => service.stop())

const { isFocused, selectedRobot } = useSelectedRobot()
const { unlock, lock, resetLockTimer, isLocked } = useLockState()
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
const inspectionExpiryTarget = ref<string | null>(null)
const lockToast = ref<string | null>(null)
// S20: 任务执行反馈
const taskFeedbackTarget = ref<string | null>(null)
const taskFeedbackText = ref("")
const taskFeedbackEntries = ref<Record<string, { text: string; time: string }[]>>({})

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
function onInspectionExpiryDetail(itemId: string): void { inspectionExpiryTarget.value = itemId }

// S20: 任务执行反馈
function submitTaskFeedback(): void {
  if (!taskFeedbackTarget.value || !taskFeedbackText.value.trim()) return
  if (!taskFeedbackEntries.value[taskFeedbackTarget.value]) {
    taskFeedbackEntries.value[taskFeedbackTarget.value] = []
  }
  taskFeedbackEntries.value[taskFeedbackTarget.value].push({
    text: taskFeedbackText.value.trim(),
    time: new Date().toLocaleTimeString("zh-CN", { hour12: false })
  })
  taskFeedbackText.value = ""
  taskFeedbackTarget.value = null
}

// 锁定态点击反馈 toast（3s 自动消失）
let lockToastTimer: ReturnType<typeof setTimeout> | null = null
function notifyLocked(msg: string = '🔒 锁定态：仅查看态势，解锁后可操作'): void {
  lockToast.value = msg
  if (lockToastTimer) clearTimeout(lockToastTimer)
  lockToastTimer = setTimeout(() => { lockToast.value = null }, 3000)
}

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

// 告警锚点点击 —— 看证据 → 远控复核 → 下单处置 的闭环入口
function onAlertAnchorClick(alertId: string): void {
  dash.setFocus('alert', alertId)
  dash.state.autoplayEnabled = false
  // 锁定态只聚焦不弹窗，并 toast 提示
  if (!isLocked.value) {
    dash.openAlertDetailModal()
  } else {
    notifyLocked('🔒 锁定态：已聚焦告警位置，解锁后可查看详情并处置')
  }
}

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
  // === 全局键盘快捷键（演示便利性） ===
  // Esc：关闭当前最上层弹窗/popup；Space：暂停/继续自动轮播
  window.addEventListener('keydown', onGlobalKeydown)
})
onUnmounted(() => {
  if (autoplayTimer) clearInterval(autoplayTimer)
  window.removeEventListener('keydown', onGlobalKeydown)
  teardownScale()
})

function onGlobalKeydown(e: KeyboardEvent): void {
  // 输入框内不拦截
  const t = e.target as HTMLElement
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
  if (e.key === 'Escape') {
    // 按优先级关闭最上层弹窗/popup
    if (taskFeedbackTarget.value) { taskFeedbackTarget.value = null; return }
    if (ackAlertTarget.value) { ackAlertTarget.value = null; return }
    if (takeoverTarget.value) { takeoverTarget.value = null; return }
    if (dispatchTarget.value) { dispatchTarget.value = null; return }
    if (preemptTarget.value) { preemptTarget.value = null; return }
    if (terminateTarget.value) { terminateTarget.value = null; return }
    if (showWorkTicketTrigger.value) { showWorkTicketTrigger.value = false; return }
    if (showRemoteControl.value) { showRemoteControl.value = false; return }
    if (showAuditLog.value) { showAuditLog.value = false; return }
    if (inspectionExpiryTarget.value) { inspectionExpiryTarget.value = null; return }
    if (dash.showAlertDetailModal.value) { dash.closeAlertDetailModal(); return }
    if (dash.showEnvMetricModal.value) { dash.closeEnvMetricModal(); return }
    if (dash.showControlModal.value) { dash.closeControlModal(); return }
    if (dash.showEvidenceModal.value) { dash.closeEvidenceModal(); return }
    if (dash.showRobotPopup.value) { closeRobotPopup(); return }
    if (dash.showInspectionPointPopup.value) { closeInspectionPointPopup(); return }
    if (dash.showDockPopup.value) { closeDockPopup(); return }
    if (dash.showApPopup.value) { closeApPopup(); return }
    if (lockConfirm.value) { lockConfirm.value = false; return }
    if (unlockConfirm.value) { unlockConfirm.value = false; return }
    if (autoLockConfirm.value) { autoLockConfirm.value = false; return }
  } else if (e.key === ' ' || e.code === 'Space') {
    // 避免按钮获焦时 Space 同时触发 onGlobalKeydown 与按钮 @click，导致双重 toggle
    // preventDefault 阻止按钮默认 click，stopPropagation 阻止冒泡，blur 移除焦点
    e.preventDefault()
    e.stopPropagation()
    if (t && t.tagName === 'BUTTON') t.blur()
    dash.state.autoplayEnabled = !dash.state.autoplayEnabled
  }
}

// 点击时间轴节点跳转（增强：danger/warn 节点自动打开告警详情）
function onTimelineNodeClick(node: { status: string; alertId?: string; coords: [number, number]; name?: string }): void {
  dash.state.autoplayEnabled = false
  if (node.alertId) {
    dash.setFocus("alert", node.alertId)
    // danger/warn 节点自动打开告警详情弹窗（锁定态只聚焦 + toast）
    if ((node.status === "danger" || node.status === "warn") && !isLocked.value) {
      dash.openAlertDetailModal()
    } else if ((node.status === "danger" || node.status === "warn") && isLocked.value) {
      notifyLocked('🔒 锁定态：已聚焦告警节点，解锁后可查看详情')
    }
  } else if (node.status === "danger" || node.status === "warn") {
    // 无 alertId 的异常节点：仅地图聚焦 + 视觉提示
    dash.setFocus("node", node.name ?? "")
  }
  if (map.value) {
    map.value.easeTo({ center: node.coords, zoom: 17, duration: 800 })
  }
}

// 点击任务池项切换任务（增强：打开对应机器人弹窗；锁定态 toast）
function onTaskPoolClick(task: { tk: string; bot: string }): void {
  dash.state.autoplayEnabled = false
  if (isLocked.value) {
    dash.setFocus("robot", task.bot)
    notifyLocked('🔒 锁定态：已聚焦机器人位置，解锁后可查看详情')
    return
  }
  // S20: 任务执行反馈入口 —— 先设置反馈弹窗，避免后续 setFocus 状态切换干扰
  taskFeedbackTarget.value = task.tk
  dash.setFocus("robot", task.bot)
  dash.withTaskSelection(task.tk, task.bot)
}

// popup 关闭 —— 同时暂停自动轮播
function closeRobotPopup(): void { dash.showRobotPopup.value = false; dash.state.autoplayEnabled = false }
function closeInspectionPointPopup(): void { dash.showInspectionPointPopup.value = false; dash.state.autoplayEnabled = false }
function closeDockPopup(): void { dash.showDockPopup.value = false; dash.state.autoplayEnabled = false }
function closeApPopup(): void { dash.showApPopup.value = false; dash.state.autoplayEnabled = false }

// === 任务池自动翻页（无滑轮，每页 4 条，5s 翻页） ===
const TASK_POOL_PAGE_SIZE = 4
const TASK_POOL_ITEM_H = 42 // 设计稿 px
const taskPoolPageHeight = TASK_POOL_ITEM_H * TASK_POOL_PAGE_SIZE
const taskPoolPages = computed(() => Math.max(1, Math.ceil(filteredTaskPool.value.length / TASK_POOL_PAGE_SIZE)))
const taskPoolPage = ref(0)
let taskPoolPageTimer: ReturnType<typeof setInterval> | null = null
watch(taskPoolPages, () => { taskPoolPage.value = 0 })
onMounted(() => {
  taskPoolPageTimer = setInterval(() => {
    if (taskPoolPages.value <= 1) return
    taskPoolPage.value = (taskPoolPage.value + 1) % taskPoolPages.value
  }, 5000)
})
onUnmounted(() => { if (taskPoolPageTimer) clearInterval(taskPoolPageTimer) })

// === 告警锚点自动翻页（每页 5 条，4s 翻页） ===
const ALERT_PAGE_SIZE = 5
const ALERT_ITEM_H = 36
const alertPageHeight = ALERT_ITEM_H * ALERT_PAGE_SIZE
const alertPages = computed(() => Math.max(1, Math.ceil(dash.alertsExt.value.length / ALERT_PAGE_SIZE)))
const alertPage = ref(0)
let alertPageTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  alertPageTimer = setInterval(() => {
    if (alertPages.value <= 1) return
    alertPage.value = (alertPage.value + 1) % alertPages.value
  }, 4000)
})
onUnmounted(() => { if (alertPageTimer) clearInterval(alertPageTimer) })
</script>

<template>
  <!-- 分层适配：地图层全屏铺满视口（不进入 scale），UI 层套 ScaleContainer 锁定 1920×1080 -->
  <div class="app-root" @click="resetLockTimer">

    <!-- ===== 地图层：Mapbox/deck.gl Canvas 全屏铺满视口，无 scale 偏移 ===== -->
    <div class="map-layer">
      <MapStage v-if="!isFocused" />
      <FocusPanel v-else :key="selectedRobot?.id" />
    </div>

    <!-- ===== UI 层：HUD 面板/TopBar/Sidebar/时间轴/弹窗，transform: scale 锁定设计稿 ===== -->
    <ScaleContainer>
      <div class="hud-stage">
        <TopBar
          @toggle-layers="showLayerToggle = !showLayerToggle"
          @request-lock="onRequestLock"
          @request-unlock="onRequestUnlock"
          @auto-lock-confirm="onAutoLockConfirm"
          @show-audit-log="showAuditLog = true"
        />

        <main class="app-main">
          <!-- 左侧浮动面板：运营态势 L1（聚焦态隐藏，由 FocusPanel 占中央） -->
          <aside v-if="!isFocused" class="panel left-panel">
            <GlobalOverview />
            <RobotList />
            <!-- 任务池筛选 -->
            <div class="task-filter-section">
              <div class="section-title">任务池</div>
              <div class="task-filter-tabs">
                <button v-for="t in taskFilterTabs" :key="t.key" class="tf-tab" :class="{ active: dash.state.taskFilter === t.key }" @click="dash.setTaskFilter(t.key as any)">{{ t.label }}</button>
              </div>
              <!-- 任务池自动轮播：超出可见高度的项自动翻页，无需滑轮 -->
              <div class="task-pool-viewport">
                <div class="task-pool-track" :style="{ transform: `translateY(${-taskPoolPage * taskPoolPageHeight}px)` }">
                  <button v-for="task in filteredTaskPool" :key="task.tk" class="tp-item" :class="[`tp-${task.state}`, { 'tp-item--locked': isLocked }]" :title="isLocked ? '锁定态仅聚焦位置' : '点击查看任务详情'" @click="onTaskPoolClick(task)">
                    <span class="tp-name">{{ task.name }}</span>
                    <span class="tp-bot">{{ task.bot }}</span>
                    <div class="tp-prog-bar">
                      <div class="tp-prog-fill" :class="`tp-prog-${task.state}`" :style="{ width: task.prog }"></div>
                    </div>
                    <span class="tp-prog">{{ task.prog }}</span>
                  </button>
                </div>
              </div>
              <!-- 翻页指示器（自动轮播时显示进度） -->
              <div v-if="taskPoolPages > 1" class="tp-pagination">
                <span v-for="i in taskPoolPages" :key="i" class="tp-dot" :class="{ active: taskPoolPage === i - 1 }"></span>
              </div>
            </div>
            <InspectionExpiryPanel @show-detail="onInspectionExpiryDetail" />
          </aside>

          <!-- 中央：UI 遮罩层（全息光栅/暗角/工具栏/图例/popup/时间轴），地图在底层 -->
          <div class="app-center">
            <!-- 全息光栅扫描遮罩 -->
            <div v-if="!isFocused" class="holo-scan"></div>
            <!-- 地图暗角 -->
            <div v-if="!isFocused" class="map-vignette"></div>
            <!-- 地图工具栏 -->
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
            <div v-if="dash.showRobotPopup.value && dash.currentRobotExt.value" class="map-popup-anchor" :style="{ left: '30%', top: '14%' }">
              <RobotPopup @close="closeRobotPopup" />
            </div>
            <div v-if="dash.showInspectionPointPopup.value && dash.currentInspectionPoint.value" class="map-popup-anchor" :style="{ left: '70%', top: '14%' }">
              <InspectionPointPopup :point-id="dash.state.currentInspectionPointId ?? ''" @close="closeInspectionPointPopup" />
            </div>
            <div v-if="dash.showDockPopup.value && dash.currentDock.value" class="map-popup-anchor" :style="{ left: '30%', top: '52%' }">
              <DockPopup :dock-id="dash.state.currentDockId ?? ''" @close="closeDockPopup" />
            </div>
            <div v-if="dash.showApPopup.value && dash.currentAp.value" class="map-popup-anchor" :style="{ left: '70%', top: '52%' }">
              <ApPopup :ap-id="dash.state.currentApId ?? ''" @close="closeApPopup" />
            </div>

            <!-- 底部任务流转时间轴 L4 -->
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
                <div v-for="node in timelineNodes" :key="node.name" class="f-node" :class="node.status" :style="{ left: node.pos }" @click="onTimelineNodeClick(node)" :title="node.status === 'danger' || node.status === 'warn' ? `点击查看告警详情 (${node.name})` : `跳转到${node.name}`">
                  <div class="f-point"></div>
                  <div class="f-info">
                    <span class="time">{{ node.time }}</span>
                    <span class="name">{{ node.name }}</span>
                    <span v-if="node.res" class="res" :class="{ 'res-danger': node.status === 'danger', 'res-warn': node.status === 'warn' }">{{ node.res }}</span>
                  </div>
                  <span v-if="node.status === 'danger'" class="node-alert-badge">⚠</span>
                </div>
                <div class="tl-progress-indicator" :style="{ left: currentTask?.bar ?? '0%' }"></div>
              </div>
              <div class="tl-footer">
                <span class="tl-task-state">{{ currentTask?.state === 'running' ? '● 执行中' : currentTask?.state }}</span>
                <span class="tl-task-progress">已完成 {{ currentTask?.inspected ?? 0 }}/{{ (currentTask?.inspected ?? 0) + (currentTask?.anomaly ?? 0) + (currentTask?.review ?? 0) || 0 }} 项 | 预计剩余 {{ currentTask?.eta ?? '--' }}</span>
              </div>
            </div>
          </div>

          <!-- 右侧浮动面板：风险告警 L1 -->
          <aside class="panel right-panel">
            <Sidebar
              @takeover="onTakeover"
              @dispatch="onDispatch"
              @ack-alert="onAckAlert"
              @preempt="onPreempt"
              @terminate="onTerminate"
              @work-ticket-trigger="onWorkTicketTrigger"
              @remote-control="onRemoteControl"
            />
            <!-- 大屏扩展告警锚点列表（自动轮播翻页，无滑轮） -->
            <div v-if="dash.alertsExt.value.length" class="alert-ext-section">
              <div class="section-title">实时告警锚点</div>
              <div class="alert-ext-viewport">
                <div class="alert-ext-track" :style="{ transform: `translateY(${-alertPage * alertPageHeight}px)` }">
                  <button v-for="a in dash.alertsExt.value" :key="a.id" class="ae-item" :class="[a.level, { 'ae-item--locked': isLocked }]" :title="isLocked ? '锁定态仅聚焦告警位置' : '点击查看告警详情并处置'" @click="onAlertAnchorClick(a.id)">
                    <span class="ae-time">{{ a.time }}</span>
                    <span class="ae-level" :class="a.level">{{ a.level === 'danger' ? '严重' : a.level === 'warn' ? '警告' : '正常' }}</span>
                    <span class="ae-device">{{ a.device }}</span>
                    <span class="ae-state">{{ a.state }}</span>
                  </button>
                </div>
              </div>
              <div v-if="alertPages > 1" class="ae-pagination">
                <span v-for="i in alertPages" :key="i" class="ae-dot" :class="{ active: alertPage === i - 1 }"></span>
              </div>
            </div>
          </aside>
        </main>

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
        <InspectionExpiryDetailModal v-if="inspectionExpiryTarget" :item-id="inspectionExpiryTarget" @close="inspectionExpiryTarget = null" />

        <!-- 锁定态点击反馈 toast -->
        <div v-if="lockToast" class="lock-toast">{{ lockToast }}</div>

        <!-- 全局快捷键提示（演示便利性） -->
        <div class="kbd-hint">
          <span class="kbd-key">Esc</span><span class="kbd-desc">关闭弹窗</span>
          <span class="kbd-key">Space</span><span class="kbd-desc">{{ dash.state.autoplayEnabled ? '暂停' : '继续' }}轮播</span>
        </div>

        <!-- S20: 任务执行反馈弹窗 -->
        <div v-if="taskFeedbackTarget" class="feedback-mask" @click.self="taskFeedbackTarget = null">
          <div class="feedback-modal">
            <div class="fb-title">📋 任务执行反馈</div>
            <div class="fb-task-name">{{ dash.taskPool.value.find(t => t.tk === taskFeedbackTarget)?.name ?? taskFeedbackTarget }}</div>
            
            <!-- 已有反馈记录 -->
            <div v-if="taskFeedbackEntries[taskFeedbackTarget]?.length" class="fb-history">
              <div v-for="(entry, i) in taskFeedbackEntries[taskFeedbackTarget]" :key="i" class="fb-entry">
                <span class="fb-entry-time">{{ entry.time }}</span>
                <span class="fb-entry-text">{{ entry.text }}</span>
              </div>
            </div>

            <div class="fb-input-row">
              <textarea v-model="taskFeedbackText" class="fb-input" rows="2" placeholder="填写执行反馈（如：巡检完成，设备运行正常；或：发现异常已上报）…" />
            </div>
            <div class="fb-actions">
              <button class="btn" @click="taskFeedbackTarget = null">关闭</button>
              <button class="btn btn--confirm" :disabled="!taskFeedbackText.trim()" @click="submitTaskFeedback">提交反馈</button>
            </div>
          </div>
        </div>

        <!-- 弹窗层（新增：复刻参考页面） -->
        <EvidenceModal />
        <AlertDetailModal v-if="dash.showAlertDetailModal.value" />
        <EnvMetricModal v-if="dash.showEnvMetricModal.value" />
        <ControlModal v-if="dash.showControlModal.value" />
      </div>
    </ScaleContainer>
  </div>
</template>

<style scoped>
/* 分层适配根布局：地图层 absolute 全屏，UI 层在 ScaleContainer 内锁定 1920×1080 */
.app-root { position: fixed; inset: 0; background: #030610; overflow: hidden; }

/* ===== 地图层：全屏铺满视口，不参与 scale，Mapbox/deck.gl 鼠标坐标无偏移 ===== */
.map-layer { position: absolute; inset: 0; z-index: 1; }
.map-layer :deep(.map-stage) { position: absolute; inset: 0; }
.map-layer :deep(.focus-panel) { position: absolute; inset: 0; }

/* ===== UI 层：在 ScaleContainer 内，固定 1920×1080 设计稿尺寸 ===== */
.hud-stage {
  width: 1920px; height: 1080px;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}

.app-main { flex: 1; display: flex; overflow: hidden; position: relative; gap: 16px; padding: 0 16px 14px; }
.app-center { flex: 1; position: relative; min-width: 0; pointer-events: none; }
/* UI 遮罩层内交互元素恢复 pointer-events */
.app-center > * { pointer-events: auto; }

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

/* 地图 Popup 锚点 */
.map-popup-anchor { position: absolute; z-index: 25; pointer-events: auto; transform: translate(-50%, 0); max-height: 88%; }

/* 设施图例 */
.map-legend {
  position: absolute; left: 20px; bottom: 100px; z-index: 12;
  background: rgba(8, 14, 26, 0.78); border: 1px solid rgba(107, 142, 173, 0.22);
  border-radius: 6px; padding: 10px 12px; backdrop-filter: blur(10px);
  display: flex; flex-direction: column; gap: 5px; pointer-events: none;
}
.legend-title { font-size: 11px; color: var(--hud-accent); letter-spacing: 1px; margin-bottom: 4px; }
.legend-row { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--hud-text-dim); }
.lg-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 6px currentColor; }

/* 浮动面板通用 —— flex 布局，无 overflow 滚动，内容自适应设计稿高度 */
.panel {
  display: flex; flex-direction: column; gap: 12px;
  pointer-events: auto; position: relative; z-index: 20;
  padding: 14px;
  border: 1px solid rgba(197, 168, 123, 0.08);
  background: rgba(8, 14, 26, 0.45);
  backdrop-filter: blur(16px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 229, 255, 0.05);
  border-radius: 8px;
  flex-shrink: 0;
  overflow: hidden;
}

.left-panel { width: 420px; }
.right-panel { width: 460px; }

/* 任务筛选 */
.task-filter-section { margin-top: 8px; }
.task-filter-tabs { display: flex; gap: 4px; margin-bottom: 6px; }
.tf-tab { padding: 3px 8px; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.22); color: var(--hud-text-dim); border-radius: 3px; cursor: pointer; font-size: 10px; }
.tf-tab.active { color: var(--hud-accent); border-color: var(--hud-accent); background: rgba(197,168,123,0.12); }

/* 任务池视口 —— 固定高度，自动翻页，无滑轮 */
.task-pool-viewport { height: 168px; overflow: hidden; position: relative; }
.task-pool-track { display: flex; flex-direction: column; gap: 4px; transition: transform 0.5s ease; }
.tp-pagination { display: flex; justify-content: center; gap: 4px; margin-top: 6px; }
.tp-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(107,142,173,0.3); transition: all 0.3s; }
.tp-dot.active { background: var(--hud-accent); width: 12px; border-radius: 3px; }

.tp-item { display: flex; align-items: center; gap: 6px; padding: 5px 8px; background: rgba(0,0,0,0.25); border: 1px solid rgba(107,142,173,0.18); border-radius: 3px; cursor: pointer; color: var(--hud-text); font-size: 10px; text-align: left; height: 38px; }
.tp-item:hover { border-color: rgba(197,168,123,0.4); }
.tp-item--locked { cursor: default; }
.tp-item--locked:hover { border-color: rgba(107,142,173,0.18); background: rgba(0,0,0,0.25); }
.tp-item.tp-running { border-left: 3px solid #00E5FF; }
.tp-item.tp-completed { border-left: 3px solid #22C55E; }
.tp-item.tp-pending { border-left: 3px solid #64748B; }
.tp-name { flex: 1; }
.tp-bot { color: var(--hud-text-dim); font-size: 9px; min-width: 60px; }
.tp-prog { color: var(--hud-accent); font-family: var(--hud-mono); font-size: 9px; min-width: 32px; text-align: right; }
.tp-prog-bar { width: 50px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; flex-shrink: 0; }
.tp-prog-fill { height: 100%; border-radius: 2px; transition: width 0.4s ease; }
.tp-prog-fill.tp-prog-running { background: linear-gradient(90deg, #00E5FF, #3B82F6); }
.tp-prog-fill.tp-prog-completed { background: linear-gradient(90deg, #22C55E, #10B981); }
.tp-prog-fill.tp-prog-pending { background: linear-gradient(90deg, #64748B, #94A3B8); }

/* 告警锚点列表 —— 自动翻页视口 */
.alert-ext-section { margin-top: 8px; }
.alert-ext-viewport { height: 180px; overflow: hidden; position: relative; }
.alert-ext-track { display: flex; flex-direction: column; gap: 4px; transition: transform 0.5s ease; }
.ae-pagination { display: flex; justify-content: center; gap: 4px; margin-top: 6px; }
.ae-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(107,142,173,0.3); transition: all 0.3s; }
.ae-dot.active { background: #EF4444; width: 12px; border-radius: 3px; }
.ae-item { display: flex; align-items: center; gap: 6px; padding: 5px 8px; background: rgba(0,0,0,0.25); border: 1px solid rgba(107,142,173,0.18); border-radius: 3px; cursor: pointer; font-size: 10px; text-align: left; border-left: 3px solid; height: 32px; }
.ae-item.danger { border-left-color: #EF4444; }
.ae-item.warn { border-left-color: #F59E0B; }
.ae-item.safe { border-left-color: #22C55E; }
.ae-item:hover { background: rgba(197,168,123,0.06); }
.ae-item--locked { cursor: default; }
.ae-item--locked:hover { background: rgba(0,0,0,0.25); }
.ae-time { font-family: var(--hud-mono); color: var(--hud-text); min-width: 40px; }
.ae-level { padding: 1px 4px; border-radius: 2px; font-size: 9px; }
.ae-level.danger { background: rgba(239,68,68,0.18); color: #EF4444; }
.ae-level.warn { background: rgba(245,158,11,0.18); color: #F59E0B; }
.ae-level.safe { background: rgba(34,197,94,0.18); color: #22C55E; }
.ae-device { flex: 1; color: var(--hud-text-dim); }
.ae-state { color: var(--hud-text-dim); font-size: 9px; }

/* 底部任务流转 —— absolute 定位在 app-center 底部，不超出视口 */
.bottom-timeline {
  position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
  width: 92%; max-width: 1100px;
  background: rgba(8, 14, 26, 0.88);
  border: 1px solid rgba(0, 229, 255, 0.22);
  border-radius: 8px; padding: 14px 28px;
  display: flex; flex-direction: column; gap: 12px;
  backdrop-filter: blur(14px); pointer-events: auto; z-index: 20;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 229, 255, 0.06);
}
.tl-header { display: flex; justify-content: space-between; align-items: center; }
.tl-title { color: #00E5FF; font-size: 13px; letter-spacing: 0.02rem; font-weight: 500; }
.tl-controls { display: flex; align-items: center; gap: 10px; }
.tl-auto-btn { padding: 3px 10px; background: rgba(10,16,26,0.7); border: 1px solid rgba(107,142,173,0.3); color: var(--hud-text-dim); border-radius: 3px; cursor: pointer; font-size: 10px; }
.tl-auto-btn.active { color: #00E5FF; border-color: #00E5FF; background: rgba(0,229,255,0.12); }
.tl-sub { font-size: 11px; color: var(--hud-text-faint); font-family: var(--hud-mono); letter-spacing: 1px; }

.tl-track { position: relative; height: 52px; margin: 0 40px; }
.f-line { position: absolute; top: 12px; width: 100%; height: 2px; background: rgba(0, 229, 255, 0.15); }
.f-flow { position: absolute; top: 12px; width: 100%; height: 2px; background: linear-gradient(90deg, transparent, #00E5FF, transparent); background-size: 30% 100%; animation: flowMove 3s linear infinite; }
@keyframes flowMove { 0% { background-position: -30% 0; } 100% { background-position: 130% 0; } }
.f-node { position: absolute; top: 8px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; width: 100px; cursor: pointer; }
.f-point { width: 10px; height: 10px; border-radius: 50%; background: var(--hud-text-dim); border: 2px solid #030610; z-index: 2; position: relative; }
.f-info { margin-top: 8px; display: flex; flex-direction: column; align-items: center; gap: 3px; text-align: center; }
.f-info .time { font-family: var(--hud-mono); font-size: 10px; color: var(--hud-text-faint); }
.f-info .name { font-size: 11px; color: var(--hud-text); font-weight: 500; letter-spacing: 0.5px; }
.f-info .res { font-size: 9px; color: var(--hud-text-dim); }
.f-info .res-danger { color: var(--hud-danger); font-weight: 600; }
.f-info .res-warn { color: var(--hud-warn); font-weight: 600; }

/* 时间轴异常标记 */
.node-alert-badge { position: absolute; top: -6px; right: -4px; font-size: 10px; z-index: 3; animation: pulseAlert 2s ease-in-out infinite; }
@keyframes pulseAlert { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }

.tl-progress-indicator { position: absolute; top: 12px; height: 2px; width: 6px; background: #00E5FF; border-radius: 1px; z-index: 3; transition: left 0.5s ease; box-shadow: 0 0 8px #00E5FF; }

.tl-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid rgba(107,142,173,0.12); font-size: 10px; }
.tl-task-state { color: #22C55E; font-weight: 500; }
.tl-task-progress { color: var(--hud-text-dim); }

.f-node.safe .f-point { background: var(--hud-ok); box-shadow: 0 0 8px var(--hud-ok); }
.f-node.warn .f-point { background: var(--hud-warn); box-shadow: 0 0 8px var(--hud-warn); }
.f-node.danger .f-point { background: var(--hud-danger); box-shadow: 0 0 8px var(--hud-danger); }
.f-node.active .f-point { background: #030610; border-color: #00E5FF; width: 14px; height: 14px; top: -2px; box-shadow: 0 0 12px rgba(0, 229, 255, 0.6); }
.f-node.active::before { content: ""; position: absolute; top: -7px; width: 24px; height: 24px; border: 1px dashed #00E5FF; border-radius: 50%; animation: spin 4s linear infinite; }
.f-node.future .f-point { background: transparent; border-color: var(--hud-text-faint); }

@keyframes spin { 100% { transform: rotate(360deg); } }

/* 锁定态点击反馈 toast */
.lock-toast {
  position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
  z-index: 100; padding: 10px 20px;
  background: rgba(245, 158, 11, 0.92); color: #fff;
  border: 1px solid rgba(245, 158, 11, 0.6); border-radius: 4px;
  font-size: 12px; letter-spacing: 0.5px;
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35);
  animation: toastIn 0.25s ease;
}
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* 全局快捷键提示角标（演示便利性） */
.kbd-hint {
  position: fixed; bottom: 12px; right: 16px; z-index: 50;
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; background: rgba(8, 14, 26, 0.6);
  border: 1px solid rgba(107, 142, 173, 0.18); border-radius: 4px;
  backdrop-filter: blur(8px); pointer-events: none;
}
.kbd-key { font-family: var(--hud-mono); font-size: 10px; color: #00E5FF; background: rgba(0, 229, 255, 0.1); border: 1px solid rgba(0, 229, 255, 0.25); border-radius: 3px; padding: 1px 5px; }
.kbd-desc { font-size: 10px; color: var(--hud-text-faint); letter-spacing: 0.5px; margin-right: 6px; }

/* S20: 任务执行反馈弹窗 —— px 单位，与 ScaleContainer 设计稿一致 */
.feedback-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.feedback-modal { width: 400px; background: rgba(10,16,26,0.95); border: 1px solid rgba(197,168,123,0.3); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
.fb-title { font-size: 14px; color: var(--hud-accent); letter-spacing: 1px; }
.fb-task-name { font-size: 11px; color: var(--hud-text-dim); }
.fb-history { max-height: 160px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.fb-entry { display: flex; gap: 8px; padding: 4px 6px; background: rgba(0,0,0,0.25); border-radius: 3px; font-size: 10px; }
.fb-entry-time { font-family: var(--hud-mono); color: var(--hud-text-faint); min-width: 60px; }
.fb-entry-text { color: var(--hud-text); }
.fb-input-row { display: flex; flex-direction: column; }
.fb-input { background: rgba(5,8,14,0.7); border: 1px solid rgba(107,142,173,0.18); color: var(--hud-text); padding: 6px 10px; border-radius: 4px; font-size: 11px; resize: none; font-family: inherit; }
.fb-input:focus { outline: none; border-color: rgba(197,168,123,0.5); }
.fb-actions { display: flex; gap: 8px; justify-content: flex-end; }
</style>
