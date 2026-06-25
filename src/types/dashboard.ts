// 大屏扩展数据契约 —— 复刻参考页面 safety-dashboard 的 mock 数据结构
// 这些类型独立于 bot 契约，专为大屏指挥中心可视化服务

import type { Coordinate } from "./common"

// 环境监测指标（O2/CH4/CO/H2S/TVOC/Noise）
export interface EnvMetric {
  icon: string
  label: string
  value: string
  history: string[] // 历史值（最近 N 天）
}

// 监控点（环境监测子点位）
export interface MonitorPoint {
  id: string
  name: string
  progress: string
  metrics: Record<string, EnvMetric>
}

// 巡检点（大屏扩展版，含监控点 + 状态 + 进度）
export interface InspectionPointExt {
  id: string
  name: string
  status: "running" | "pending" | "completed" | "warn" | "danger"
  progress: string
  monitorPoints: MonitorPoint[]
}

// 任务层级（任务 → 巡检点 → 监控点 → 指标）
export interface TaskHierarchy {
  inspectionPoints: InspectionPointExt[]
}

// 任务时间轴节点
export interface TimelineNode {
  time: string
  name: string
  res: string
  status: "safe" | "warn" | "danger" | "active" | "future"
  pos: string // CSS left %
  coords: [number, number]
  alertId?: string
  pop?: boolean
}

export interface TaskTimeline {
  title: string
  nodes: TimelineNode[]
}

// 大屏任务（扩展版，含时间轴/路径/目标/证据影像）
export interface TaskExt {
  bot: string
  bgImg: string
  taskName: string
  state: "running" | "completed" | "pending" | "paused" | "failed"
  type: string
  region: string
  stage: string
  cov: string
  inspected: number
  anomaly: number
  highRisk: number
  review: number
  prog: string
  eta: string
  bar: string
  targetCoords: [number, number]
  robotCoords: [number, number]
  path: [number, number][]
  futurePath: [number, number][]
  targetLine: [number, number][]
  aimSafe: boolean
  targetLabel: string
  eviResult: string
  eviClass: string
  timeline: TaskTimeline
}

// 充电站
export type DockStatus = "charging" | "safe" | "warn" | "danger"

export interface Dock {
  id: string
  name: string
  status: DockStatus
  bot: string
  lastRobot: string
  voltage: string
  totalCharges: number
  fullNotLeave: number
  queueCount: number
  facadeImg: string
  coords: [number, number]
}

// AP 设备
export type ApStatus = "safe" | "warn" | "danger"

export interface ApDevice {
  id: string
  name: string
  area: string
  status: ApStatus
  signal: string
  channel: string
  band: string
  users: number
  uptime: string
  coords: [number, number]
}

// 告警扩展字段（参考页面 alerts 元素含对比/证据影像）
export interface AlertExt {
  id: string
  bgImg: string
  time: string // HH:MM
  level: "danger" | "warn" | "safe"
  state: string // 未确认/待复核/已发单处置/现场已查无异常
  device: string
  loc: string
  defect: string
  taskId: string
  coords: [number, number]
  aimSafe: boolean
  targetLabel: string
  eviResult: string
  eviClass: string
  lastTime: string
  lastResult: string
  comp: string // 对比差异
}

// 机器人扩展字段（里程/类型）
export interface RobotExt {
  id: string
  status: "safe" | "warn" | "danger" | "charging"
  label: string
  task: string
  battery: number
  coords: [number, number]
  taskId: string | null
  robotType: string
}

// 影像预览模态入参
export interface EvidenceModalData {
  image: string
  device: string
  meta: string
  title: string
  thumbs: { img: string; label: string }[]
}

// 充电站 popup 入参
export interface DockQueueStats {
  charging: number
  parked: number
  fullNotLeave: number
  queue: number
}

// 环境指标弹窗入参
export interface EnvMetricHistoryRecord {
  time: string
  value: string
}

// 地图显示控制开关组
export interface MapUiVisibility {
  labels: boolean
  robots: boolean
  points: boolean
  pointAreas: { A: boolean; B: boolean; C: boolean }
  docks: boolean
  pointStatus: boolean
  route: boolean
}

// 搜索定位类型
export type SearchTargetType = "all" | "robot" | "point" | "ap" | "dock"

// 设施设备分类卡
export interface FacilitySummaryCard {
  label: string
  total: number
  online: number
  offline: number
  tone: "safe" | "warn" | "info"
}

// 充电站概览卡
export interface DockOverviewMetric {
  value: number
  label: string
  tone: "base" | "active" | "safe" | "warn"
}

// 设施点位（地图设施锚点）
export interface FacilityPoint {
  lng: number
  lat: number
  name: string
  type: "gate" | "office" | "plant" | "tank" | "equip" | "water" | "fire" | "charge"
}

// 环境概览 KPI
export interface EnvSummaryCard {
  icon: string
  label: string
  value: string
  status: "safe" | "warn" | "danger"
}

// 机器人总览卡
export interface RobotSummaryCard {
  id: string
  label: string
  bizStatus: string
  battery: number
  mileageKm: number
  task: string
  status: string
}

// 巡检总览卡
export interface PlanSummaryCard {
  label: string
  value: number | string
  tone: "base" | "active" | "safe" | "warn" | "danger"
}

// 安全风险细分
export interface RiskBreakdownItem {
  category: "infrared" | "device" | "gas" | "safeBehavior"
  label: string
  value: number
}

// Coordinate 兼容（避免类型循环引用）
export type { Coordinate }
