// 大屏指挥中心状态中枢 —— 复刻参考页面 safety-dashboard/app.js 的 state + setFocus
// 统一管理：选中机器人/巡检点/告警/充电站、视图模式、任务筛选、显示控制、弹窗开关

import { reactive, ref, computed } from "vue"
import {
  seedRobotsExt,
  seedAlertsExt,
  seedDocks,
  seedApDevices,
  seedTasksExt,
  seedTaskHierarchy,
  seedTaskPool,
  seedFacilityPoints,
  seedFacilitySummary,
  seedEnvSummary,
  seedPlanSummary,
  seedRiskBreakdown,
  ROBOT_MILEAGE_KM,
} from "@/mock/seedDashboard"
import type {
  AlertExt,
  ApDevice,
  Dock,
  FacilityPoint,
  FacilitySummaryCard,
  EnvSummaryCard,
  PlanSummaryCard,
  RiskBreakdownItem,
  RobotExt,
  TaskExt,
  TaskHierarchy,
  EvidenceModalData,
  MapUiVisibility,
  SearchTargetType,
} from "@/types/dashboard"
import type { InspectionPointExt, MonitorPoint } from "@/types/dashboard"

type ViewMode = "global" | "focus"
type FocusType = "robot" | "inspectionPoint" | "alert" | "dock" | "ap" | "node" | "all"
type EvidenceMode = "normal" | "thermal" | "video"
type TaskFilter = "all" | "running" | "completed" | "pending"

interface DashboardState {
  currentRobotId: string
  currentTaskId: string
  viewMode: ViewMode
  currentAlertId: string | null
  currentDockId: string | null
  currentApId: string | null
  currentInspectionPointId: string | null
  currentMonitorPointId: string | null
  currentMetricKey: string | null
  currentControlRobotId: string | null
  currentEvidenceMode: EvidenceMode
  taskFilter: TaskFilter
  topContext: string
  autoplayEnabled: boolean
  autoplayIndex: number
  lastClick: { type: FocusType | null; id: string | null }
  lastAlertAction: { alertId: string; prevState: string; prevLevel: string } | null
}

const state = reactive<DashboardState>({
  currentRobotId: "robot-north-1",
  currentTaskId: "task-e-power",
  viewMode: "global",
  currentAlertId: null,
  currentDockId: null,
  currentApId: null,
  currentInspectionPointId: null,
  currentMonitorPointId: null,
  currentMetricKey: null,
  currentControlRobotId: null,
  currentEvidenceMode: "normal",
  taskFilter: "all",
  topContext: "当前视角: 全局场站总览",
  autoplayEnabled: true,
  autoplayIndex: 0,
  lastClick: { type: null, id: null },
  lastAlertAction: null,
})

// 弹窗显隐集中管理
const showRobotPopup = ref(false)
const showInspectionPointPopup = ref(false)
const showDockPopup = ref(false)
const showApPopup = ref(false)
const showTimeline = ref(false)
const showAlertPanel = ref(false)

const showEvidenceModal = ref(false)
const evidenceModalData = ref<EvidenceModalData | null>(null)

const showAlertDetailModal = ref(false)
const showEnvMetricModal = ref(false)
const showControlModal = ref(false)

const envMetricModalKey = ref<string>("O2")
const envMetricModalRange = ref<number>(7)
const envFocusPointIndex = ref<number>(0)

// 显示控制开关
const mapUi = reactive<MapUiVisibility>({
  labels: true,
  robots: true,
  points: true,
  pointAreas: { A: true, B: true, C: true },
  docks: true,
  pointStatus: true,
  route: true,
})

// 搜索定位
const searchType = ref<SearchTargetType>("all")
const searchInput = ref<string>("")

// 派生数据
const robotsExt = computed<RobotExt[]>(() => seedRobotsExt)
const alertsExt = computed<AlertExt[]>(() => seedAlertsExt)
const docks = computed<Dock[]>(() => seedDocks)
const apDevices = computed<ApDevice[]>(() => seedApDevices)
const tasksExt = computed<Record<string, TaskExt>>(() => seedTasksExt)
const taskHierarchy = computed<Record<string, TaskHierarchy>>(() => seedTaskHierarchy)
const taskPool = computed(() => seedTaskPool)
const facilityPoints = computed<FacilityPoint[]>(() => seedFacilityPoints)
const facilitySummary = computed<FacilitySummaryCard[]>(() => seedFacilitySummary)
const envSummary = computed<EnvSummaryCard[]>(() => seedEnvSummary)
const planSummary = computed<PlanSummaryCard[]>(() => seedPlanSummary)
const riskBreakdown = computed<RiskBreakdownItem[]>(() => seedRiskBreakdown)

const currentRobotExt = computed<RobotExt | null>(() => robotsExt.value.find((r) => r.id === state.currentRobotId) ?? null)
const currentTask = computed<TaskExt | null>(() => tasksExt.value[state.currentTaskId] ?? null)
const currentAlert = computed<AlertExt | null>(() => alertsExt.value.find((a) => a.id === state.currentAlertId) ?? null)
const currentDock = computed<Dock | null>(() => docks.value.find((d) => d.id === state.currentDockId) ?? null)
const currentAp = computed<ApDevice | null>(() => apDevices.value.find((a) => a.id === state.currentApId) ?? null)

const currentHierarchy = computed<TaskHierarchy | null>(() => taskHierarchy.value[state.currentTaskId] ?? null)
const currentInspectionPoint = computed<InspectionPointExt | null>(() => {
  const h = currentHierarchy.value
  if (!h) return null
  return h.inspectionPoints.find((p) => p.id === state.currentInspectionPointId) ?? h.inspectionPoints[0] ?? null
})
const currentMonitorPoint = computed<MonitorPoint | null>(() => {
  const p = currentInspectionPoint.value
  if (!p) return null
  return p.monitorPoints.find((m) => m.id === state.currentMonitorPointId) ?? p.monitorPoints[0] ?? null
})

const robotTotalMileage = computed(() => robotsExt.value.reduce((s, r) => s + (ROBOT_MILEAGE_KM[r.id] || 0), 0))
const totalAlerts = computed(() => alertsExt.value.length)

// 状态中枢方法
function closeAllPopups(): void {
  showRobotPopup.value = false
  showInspectionPointPopup.value = false
  showDockPopup.value = false
  showApPopup.value = false
}

function setFocus(type: FocusType, id: string, _opts: { instantPopup?: boolean; enterFocus?: boolean } = {}): void {
  void _opts
  state.autoplayEnabled = false
  closeAllPopups()

  // 重复点击退出 focus
  if (state.lastClick.type === type && state.lastClick.id === id && state.viewMode === "focus") {
    resetToGlobal()
    return
  }

  // 默认：地图标记点击只显示 popup，不切换视图（enterFocus=false）
  // 调度台/驾驶舱等显式导航才进入 focus 模式
  const enterFocus = _opts.enterFocus === true

  if (type === "robot") {
    state.lastClick = { type, id }
    state.currentRobotId = id
    state.currentAlertId = null
    state.currentDockId = null
    state.currentApId = null
    if (enterFocus) {
      state.viewMode = "focus"
      state.topContext = `巡检追踪: ${id}`
      showAlertPanel.value = false
      showTimeline.value = true
    } else {
      state.topContext = `选中: ${id}`
    }
    const bot = robotsExt.value.find((r) => r.id === id)
    if (bot?.taskId) {
      state.currentTaskId = bot.taskId
      ensureHierarchySelection()
    }
    showRobotPopup.value = true
  } else if (type === "inspectionPoint") {
    state.lastClick = { type, id }
    state.currentInspectionPointId = id
    state.currentMonitorPointId = null
    state.currentMetricKey = null
    ensureHierarchySelection()
    if (enterFocus) {
      state.viewMode = "focus"
      state.topContext = `巡检点详情: ${id}`
      showAlertPanel.value = false
      showTimeline.value = true
    } else {
      state.topContext = `选中: ${id}`
    }
    showInspectionPointPopup.value = true
  } else if (type === "alert") {
    state.lastClick = { type, id }
    state.currentAlertId = id
    state.currentDockId = null
    state.currentApId = null
    if (enterFocus) {
      state.viewMode = "focus"
      state.topContext = `异常聚焦处置: ${id}`
      showAlertPanel.value = true
      showTimeline.value = false
    } else {
      state.topContext = `告警: ${id}`
    }
    const alt = alertsExt.value.find((a) => a.id === id)
    if (alt?.taskId) {
      state.currentTaskId = alt.taskId
      state.currentRobotId = tasksExt.value[alt.taskId]?.bot ?? state.currentRobotId
    }
  } else if (type === "dock") {
    state.lastClick = { type, id }
    state.currentDockId = id
    state.currentAlertId = null
    state.currentApId = null
    if (enterFocus) {
      state.viewMode = "focus"
      state.topContext = `场站设施: ${id}`
      showAlertPanel.value = false
      showTimeline.value = false
    } else {
      state.topContext = `选中: ${id}`
    }
    showDockPopup.value = true
  } else if (type === "ap") {
    state.lastClick = { type, id }
    state.currentApId = id
    state.currentAlertId = null
    state.currentDockId = null
    if (enterFocus) {
      state.viewMode = "focus"
      state.topContext = `AP 设备: ${id}`
    } else {
      state.topContext = `选中: ${id}`
    }
    showApPopup.value = true
  } else if (type === "all" && id === "global") {
    resetToGlobal()
    return
  }
}

function resetToGlobal(): void {
  state.lastClick = { type: null, id: null }
  state.currentAlertId = null
  state.currentDockId = null
  state.currentApId = null
  state.viewMode = "global"
  state.topContext = "当前视角: 全局场站总览"
  closeAllPopups()
  showAlertPanel.value = false
  showTimeline.value = false
}

function ensureHierarchySelection(): void {
  const h = taskHierarchy.value[state.currentTaskId]
  if (!h || h.inspectionPoints.length === 0) {
    state.currentInspectionPointId = null
    state.currentMonitorPointId = null
    state.currentMetricKey = null
    return
  }
  if (!h.inspectionPoints.some((p) => p.id === state.currentInspectionPointId)) {
    state.currentInspectionPointId = h.inspectionPoints[0].id
  }
  const pt = h.inspectionPoints.find((p) => p.id === state.currentInspectionPointId)
  const mps = pt?.monitorPoints ?? []
  if (mps.length === 0) {
    state.currentMonitorPointId = null
    state.currentMetricKey = null
    return
  }
  if (!mps.some((m) => m.id === state.currentMonitorPointId)) {
    state.currentMonitorPointId = mps[0].id
  }
  const mp = mps.find((m) => m.id === state.currentMonitorPointId)
  const keys = Object.keys(mp?.metrics ?? {})
  if (keys.length === 0) {
    state.currentMetricKey = null
    return
  }
  if (!keys.includes(state.currentMetricKey ?? "")) state.currentMetricKey = keys[0]
}

function withTaskSelection(taskId: string, botId?: string): void {
  state.currentTaskId = taskId
  if (botId) state.currentRobotId = botId
  ensureHierarchySelection()
}

function setTaskFilter(f: TaskFilter): void {
  state.taskFilter = f
}

function setEvidenceMode(m: EvidenceMode): void {
  state.currentEvidenceMode = m
}

function openEvidenceModal(data: EvidenceModalData): void {
  evidenceModalData.value = data
  showEvidenceModal.value = true
}
function closeEvidenceModal(): void {
  showEvidenceModal.value = false
}

function openAlertDetailModal(): void {
  showAlertDetailModal.value = true
}
function closeAlertDetailModal(): void {
  showAlertDetailModal.value = false
}

function openEnvMetricModal(key: string): void {
  envMetricModalKey.value = key
  showEnvMetricModal.value = true
}
function closeEnvMetricModal(): void {
  showEnvMetricModal.value = false
}

function openControlModal(robotId?: string): void {
  state.currentControlRobotId = robotId ?? state.currentRobotId
  showControlModal.value = true
}
function closeControlModal(): void {
  showControlModal.value = false
}

// 告警处置
function confirmAlert(): void {
  if (!state.currentAlertId) return
  const alt = alertsExt.value.find((a) => a.id === state.currentAlertId)
  if (alt) {
    state.lastAlertAction = { alertId: alt.id, prevState: alt.state, prevLevel: alt.level }
    alt.state = "已发单处置"
    alt.level = "warn" as AlertExt["level"]
  }
}
function clearAlert(): void {
  if (!state.currentAlertId) return
  const alt = alertsExt.value.find((a) => a.id === state.currentAlertId)
  if (alt) {
    state.lastAlertAction = { alertId: alt.id, prevState: alt.state, prevLevel: alt.level }
    alt.state = "现场已查无异常"
    alt.level = "safe" as AlertExt["level"]
  }
}
function undoAlert(): void {
  const action = state.lastAlertAction
  if (!action) return
  const alt = alertsExt.value.find((a) => a.id === action.alertId)
  if (!alt) return
  alt.state = action.prevState
  alt.level = action.prevLevel as AlertExt["level"]
  state.currentAlertId = alt.id
  state.lastAlertAction = null
}

// 巡检点影像选择
function selectInspectionPoint(pointId: string): void {
  state.currentInspectionPointId = pointId
  state.currentMonitorPointId = null
  state.currentMetricKey = null
  ensureHierarchySelection()
}
function selectMetric(key: string): void {
  state.currentMetricKey = key
}

export function useDashboard() {
  return {
    // state
    state,
    mapUi,
    searchType,
    searchInput,
    envMetricModalKey,
    envMetricModalRange,
    envFocusPointIndex,
    // popup visibility
    showRobotPopup,
    showInspectionPointPopup,
    showDockPopup,
    showApPopup,
    showTimeline,
    showAlertPanel,
    showEvidenceModal,
    evidenceModalData,
    showAlertDetailModal,
    showEnvMetricModal,
    showControlModal,
    // data
    robotsExt,
    alertsExt,
    docks,
    apDevices,
    tasksExt,
    taskHierarchy,
    taskPool,
    facilityPoints,
    facilitySummary,
    envSummary,
    planSummary,
    riskBreakdown,
    currentRobotExt,
    currentTask,
    currentAlert,
    currentDock,
    currentAp,
    currentHierarchy,
    currentInspectionPoint,
    currentMonitorPoint,
    robotTotalMileage,
    totalAlerts,
    // actions
    setFocus,
    resetToGlobal,
    withTaskSelection,
    ensureHierarchySelection,
    setTaskFilter,
    setEvidenceMode,
    openEvidenceModal,
    closeEvidenceModal,
    openAlertDetailModal,
    closeAlertDetailModal,
    openEnvMetricModal,
    closeEnvMetricModal,
    openControlModal,
    closeControlModal,
    confirmAlert,
    clearAlert,
    undoAlert,
    selectInspectionPoint,
    selectMetric,
  }
}
