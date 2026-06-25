// seed 数据 —— ADR#36/42 全状态覆盖
// 5 机器人（巡检中/待命/低电返充/故障待接管/充电中各1）+ 5 告警三级 + 1 作业票
// 角色式命名；首次启动 localStorage 空 则灌入

import type { Robot } from "@/types/robot"
import type { Alert } from "@/types/alert"
import type { WorkTicket } from "@/types/work-ticket"
import type { InspectionMap } from "@/types/inspection"
import type { InspectionPoint } from "@/types/inspection"
import type { InspectionTask } from "@/types/inspection"
import type { RoadSegment } from "@/types/road-network"
import type { NavigationPoint } from "@/types/road-network"
import type { AuditLogEntry } from "@/types/audit"
import type { ExceptionLog } from "@/types/exception"
import { RobotStatus } from "@/types/robot"
import { ExceptionStrategy } from "@/types/robot"
import { AlertSeverity, AlertStatus } from "@/types/alert"
import { InspectionTaskType, InspectionTaskInstanceStatus, InspectionPointType } from "@/types/inspection"
import { ExceptionType } from "@/types/exception"
import { WorkTicketStatus } from "@/types/work-ticket"
import type { BuildingsCollection } from "@/types/buildings"
import { storage, STORAGE_KEYS, SCHEMA_VERSION } from "@/utils/storage"

// 厂区中心点（mock 经纬度，华东某化工厂）
export const FACILITY_CENTER = { longitude: 121.4737, latitude: 31.2304 }

const now = "2026-06-24T18:00:00.000Z"

// 5 机器人全状态覆盖（ADR#42）
export const seedRobots: Robot[] = [
  {
    id: "robot-north-1",
    name: "北区巡检1号",
    serialNumber: "RB-N-001",
    model: "X100",
    status: RobotStatus.PATROLLING,
    batteryLevel: 78,
    batteryThreshold: { low: 20, critical: 10 },
    position: { longitude: 121.4740, latitude: 31.2310, yaw: 45 },
    currentTaskId: "task-daily-north",
    signalStrength: 95,
    lastOnlineTime: now,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "robot-east-1",
    name: "东区待命1号",
    serialNumber: "RB-E-001",
    model: "X100",
    status: RobotStatus.ONLINE,
    batteryLevel: 92,
    batteryThreshold: { low: 20, critical: 10 },
    position: { longitude: 121.4750, latitude: 31.2300, yaw: 0 },
    signalStrength: 88,
    lastOnlineTime: now,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "robot-west-1",
    name: "西区返充1号",
    serialNumber: "RB-W-001",
    model: "X200",
    status: RobotStatus.RETURNING,
    batteryLevel: 15,
    batteryThreshold: { low: 20, critical: 10 },
    position: { longitude: 121.4730, latitude: 31.2298, yaw: 270 },
    currentTaskId: "task-daily-west",
    signalStrength: 72,
    lastOnlineTime: now,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "robot-south-1",
    name: "南区故障1号",
    serialNumber: "RB-S-001",
    model: "X200",
    status: RobotStatus.ERROR,
    batteryLevel: 55,
    batteryThreshold: { low: 20, critical: 10 },
    position: { longitude: 121.4742, latitude: 31.2295, yaw: 180 },
    currentTaskId: "task-daily-south",
    signalStrength: 30,
    lastOnlineTime: now,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "robot-center-1",
    name: "中区充电1号",
    serialNumber: "RB-C-001",
    model: "X100",
    status: RobotStatus.CHARGING,
    batteryLevel: 40,
    batteryThreshold: { low: 20, critical: 10 },
    position: { longitude: 121.4737, latitude: 31.2304, yaw: 0 },
    signalStrength: 100,
    lastOnlineTime: now,
    createdAt: now,
    updatedAt: now,
  },
]

// 5 告警覆盖三级（紧急2/警告2/信息1）（ADR#42）
export const seedAlerts: Alert[] = [
  {
    id: "alert-001",
    robotId: "robot-south-1",
    taskId: "task-daily-south",
    severity: AlertSeverity.CRITICAL,
    status: AlertStatus.ACTIVE,
    type: ExceptionType.ROBOT_FAILURE,
    title: "南区故障1号驱动异常",
    description: "底盘电机过热，需人工接管",
    timestamp: now,
  },
  {
    id: "alert-002",
    robotId: "robot-west-1",
    severity: AlertSeverity.CRITICAL,
    status: AlertStatus.ACTIVE,
    type: ExceptionType.LOW_BATTERY,
    title: "西区返充1号电量危急",
    description: "电量 15%，已触发返充",
    timestamp: now,
  },
  {
    id: "alert-003",
    robotId: "robot-north-1",
    taskId: "task-daily-north",
    inspectionPointId: "point-n-3",
    severity: AlertSeverity.WARNING,
    status: AlertStatus.ACTIVE,
    type: ExceptionType.OBSTACLE_DETECTED,
    title: "北区巡检1号遇障碍物",
    description: "路径临时阻塞，已减速绕行",
    timestamp: now,
  },
  {
    id: "alert-004",
    robotId: "robot-north-1",
    taskId: "task-daily-north",
    severity: AlertSeverity.WARNING,
    status: AlertStatus.ACKED,
    type: ExceptionType.TASK_TIMEOUT,
    title: "北区巡检任务超时预警",
    description: "任务执行时长超出预期 12%",
    timestamp: now,
    ackedBy: "operator-zhang",
    ackedAt: now,
  },
  {
    id: "alert-005",
    robotId: "robot-east-1",
    severity: AlertSeverity.INFO,
    status: AlertStatus.ACTIVE,
    type: ExceptionType.SIGNAL_LOST,
    title: "东区待命1号信号波动",
    description: "通信信号短暂抖动，已自动恢复",
    timestamp: now,
  },
]

// 1 作业票（ADR#42/120）
export const seedWorkTickets: WorkTicket[] = [
  {
    id: "ticket-001",
    ticketNo: "WT-2026-0624-001",
    title: "北区管廊阀门检修作业票",
    description: "北区 N3 阀门更换密封件，需机器人监护",
    areaName: "北区",
    guardZone: [
      { longitude: 121.4742, latitude: 31.2315 },
      { longitude: 121.4748, latitude: 31.2315 },
      { longitude: 121.4748, latitude: 31.2312 },
      { longitude: 121.4742, latitude: 31.2312 },
    ],
    robotId: "robot-north-1",
    status: WorkTicketStatus.GUARDING,
    applicant: "李工程师",
    startTime: "2026-06-24T14:00:00.000Z",
    endTime: "2026-06-24T20:00:00.000Z",
    createdAt: now,
    updatedAt: now,
  },
]

function makeCylinder(centerLng: number, centerLat: number, radiusDeg: number, height: number, name: string): any {
  const coordinates: [number, number][] = []
  const steps = 12
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2
    const lng = Number((centerLng + radiusDeg * Math.cos(angle) * 1.17).toFixed(6))
    const lat = Number((centerLat + radiusDeg * Math.sin(angle)).toFixed(6))
    coordinates.push([lng, lat])
  }
  coordinates.push(coordinates[0])
  return {
    type: "Feature",
    properties: { height, name, color: "#132238" },
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  }
}

const tankFarm = [
  makeCylinder(121.4733, 31.2301, 0.00008, 22, "储罐C-1"),
  makeCylinder(121.4735, 31.2301, 0.00008, 22, "储罐C-2"),
  makeCylinder(121.4733, 31.2303, 0.00008, 22, "储罐C-3"),
  makeCylinder(121.4735, 31.2303, 0.00008, 22, "储罐C-4"),
]

// 1 地图 + 5 建筑物 Polygon+height（ADR#133/134）
const buildings: BuildingsCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { height: 18, name: "主装置区A", color: "#2a3a5a" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [121.4738, 31.2308], [121.4742, 31.2308],
          [121.4742, 31.2312], [121.4738, 31.2312],
          [121.4738, 31.2308],
        ]],
      },
    },
    {
      type: "Feature",
      properties: { height: 12, name: "管廊B", color: "#2a3a5a" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [121.4744, 31.2306], [121.4747, 31.2306],
          [121.4747, 31.2309], [121.4744, 31.2309],
          [121.4744, 31.2306],
        ]],
      },
    },
    ...tankFarm,
    {
      type: "Feature",
      properties: { height: 8, name: "配电室D", color: "#2a3a5a" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [121.4752, 31.2298], [121.4755, 31.2298],
          [121.4755, 31.2301], [121.4752, 31.2301],
          [121.4752, 31.2298],
        ]],
      },
    },
    {
      type: "Feature",
      properties: { height: 15, name: "中控楼E", color: "#2a3a5a" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [121.4736, 31.2296], [121.4739, 31.2296],
          [121.4739, 31.2299], [121.4736, 31.2299],
          [121.4736, 31.2296],
        ]],
      },
    },
  ],
}

export const seedMaps: InspectionMap[] = [
  {
    id: "map-facility-main",
    name: "厂区主地图",
    description: "华东某化工厂全区地图",
    imageUrl: "/maps/facility.png",
    settings: { scale: 0.5, origin: { x: 0, y: 0 }, rotation: 0 },
    dimensions: { width: 800, height: 600 },
    geographicCoordinates: FACILITY_CENTER,
    regions: [
      { id: "region-n", name: "北区", color: "#1a4a6a", x: 100, y: 50, width: 300, height: 200, code: "N", zoneType: "normal" },
      { id: "region-e", name: "东区", color: "#1a6a4a", x: 450, y: 150, width: 250, height: 200, code: "E", zoneType: "normal" },
      { id: "region-w", name: "西区", color: "#6a4a1a", x: 50, y: 250, width: 200, height: 200, code: "W", zoneType: "normal" },
      { id: "region-s", name: "南区", color: "#6a1a4a", x: 300, y: 350, width: 300, height: 200, code: "S", zoneType: "normal" },
      { id: "region-forbid", name: "禁行区X", color: "#6a1a1a", x: 200, y: 100, width: 80, height: 80, code: "X", zoneType: "forbidden" },
    ],
    buildings,
    createdAt: now,
    updatedAt: now,
  },
]

// 巡检点（mock，覆盖北区/东区若干）
export const seedInspectionPoints: InspectionPoint[] = [
  { id: "point-n-1", name: "北区阀门N1", code: "PN1", pointType: InspectionPointType.FIXED, description: "北区主阀门", mapId: "map-facility-main", location: { longitude: 121.4740, latitude: 31.2312 }, sequence: 1, stayDurationSec: 30, isCritical: true, areaId: "region-n", areaName: "北区", covered: true, createdAt: now, updatedAt: now },
  { id: "point-n-2", name: "北区管廊N2", code: "PN2", pointType: InspectionPointType.FIXED, description: "北区管廊接点", mapId: "map-facility-main", location: { longitude: 121.4744, latitude: 31.2314 }, sequence: 2, stayDurationSec: 30, isCritical: false, areaId: "region-n", areaName: "北区", covered: true, createdAt: now, updatedAt: now },
  { id: "point-n-3", name: "北区仪表N3", code: "PN3", pointType: InspectionPointType.AREA, description: "北区温度仪表", mapId: "map-facility-main", location: { longitude: 121.4746, latitude: 31.2310 }, sequence: 3, stayDurationSec: 20, isCritical: true, areaId: "region-n", areaName: "北区", covered: false, createdAt: now, updatedAt: now },
  { id: "point-e-1", name: "东区配电E1", code: "PE1", pointType: InspectionPointType.FIXED, description: "东区配电室", mapId: "map-facility-main", location: { longitude: 121.4753, latitude: 31.2299 }, sequence: 1, stayDurationSec: 30, isCritical: true, areaId: "region-e", areaName: "东区", covered: false, createdAt: now, updatedAt: now },
  { id: "point-w-1", name: "西区储罐W1", code: "PW1", pointType: InspectionPointType.FIXED, description: "西区储罐区", mapId: "map-facility-main", location: { longitude: 121.4734, latitude: 31.2302 }, sequence: 1, stayDurationSec: 40, isCritical: true, areaId: "region-w", areaName: "西区", covered: true, createdAt: now, updatedAt: now },
]

// 路网（mock 简化）
export const seedRoadSegments: RoadSegment[] = [
  { id: "road-n-main", name: "北区主干", code: "RN1", mapId: "map-facility-main", area: "北区", segmentType: "trunk", status: "active", nodeIds: ["node-n-1", "node-n-2", "node-n-3"], length: 200, bidirectional: true, speedLimit: 5, createdAt: now, updatedAt: now },
  { id: "road-e-main", name: "东区主干", code: "RE1", mapId: "map-facility-main", area: "东区", segmentType: "trunk", status: "active", nodeIds: ["node-e-1"], length: 150, bidirectional: true, speedLimit: 5, createdAt: now, updatedAt: now },
  { id: "road-w-main", name: "西区主干", code: "RW1", mapId: "map-facility-main", area: "西区", segmentType: "branch", status: "active", nodeIds: ["node-w-1"], length: 180, bidirectional: true, speedLimit: 4, createdAt: now, updatedAt: now },
]

// 导航点（ADR#118 P2 默认隐）
export const seedNavPoints: NavigationPoint[] = [
  { id: "nav-charge-1", name: "充电桩1", code: "CH1", mapId: "map-facility-main", area: "中区", navType: "charging", position: { x: 400, y: 300 }, nodeId: "node-c-1", createdAt: now, updatedAt: now },
  { id: "nav-park-1", name: "停车点1", code: "PK1", mapId: "map-facility-main", area: "东区", navType: "parking", position: { x: 500, y: 200 }, nodeId: "node-e-1", createdAt: now, updatedAt: now },
]

// 巡检任务（3 个，对应巡检中/返充/故障机器人）
export const seedTasks: InspectionTask[] = [
  { id: "task-daily-north", name: "北区日常巡检", code: "TN", robotId: "robot-north-1", routeId: "route-n", type: InspectionTaskType.PATROL, status: InspectionTaskInstanceStatus.RUNNING, inspectionPointIds: ["point-n-1", "point-n-2", "point-n-3"], currentInspectionPointIndex: 1, progress: 45, businessScene: "daily_inspection", priorityLevel: "normal", schedule: { startTime: "2026-06-24T17:00:00.000Z", endTime: "2026-06-24T19:00:00.000Z" }, createdAt: now, updatedAt: now },
  { id: "task-daily-west", name: "西区日常巡检", code: "TW", robotId: "robot-west-1", routeId: "route-w", type: InspectionTaskType.PATROL, status: InspectionTaskInstanceStatus.PAUSED, inspectionPointIds: ["point-w-1"], currentInspectionPointIndex: 0, progress: 30, businessScene: "daily_inspection", priorityLevel: "normal", createdAt: now, updatedAt: now },
  { id: "task-daily-south", name: "南区日常巡检", code: "TS", robotId: "robot-south-1", routeId: "route-s", type: InspectionTaskType.PATROL, status: InspectionTaskInstanceStatus.FAILED, inspectionPointIds: [], currentInspectionPointIndex: 0, progress: 60, businessScene: "daily_inspection", priorityLevel: "normal", exceptionCount: 1, createdAt: now, updatedAt: now },
]

// 审计日志（mock 若干）
export const seedAuditLog: AuditLogEntry[] = [
  { id: "audit-001", action: "ack_alert", operator: "operator-zhang", targetId: "alert-004", targetType: "alert", reason: "已现场确认", createdAt: now },
  { id: "audit-002", action: "dispatch", operator: "operator-li", targetId: "task-daily-north", targetType: "task", reason: "常规派发", createdAt: now },
]

// 异常日志（对齐 bot exception_logs）
export const seedExceptionLogs: ExceptionLog[] = [
  { id: "exc-001", taskId: "task-daily-south", type: ExceptionType.ROBOT_FAILURE, timestamp: now, robotId: "robot-south-1", description: "底盘电机过热", strategyApplied: ExceptionStrategy.NOTIFY, resolved: false },
]

// 灌入函数：localStorage 空 则灌入全部 seed
export function seedIfEmpty(): void {
  if (storage.get(STORAGE_KEYS.SCHEMA_VERSION) === null) {
    storage.set(STORAGE_KEYS.ROBOTS, seedRobots)
    storage.set(STORAGE_KEYS.ALERTS, seedAlerts)
    storage.set(STORAGE_KEYS.WORK_TICKETS, seedWorkTickets)
    storage.set(STORAGE_KEYS.INSPECTION_MAPS, seedMaps)
    storage.set(STORAGE_KEYS.INSPECTION_POINTS, seedInspectionPoints)
    storage.set(STORAGE_KEYS.TASKS, seedTasks)
    storage.set(STORAGE_KEYS.ROAD_SEGMENTS, seedRoadSegments)
    storage.set(STORAGE_KEYS.NAV_POINTS, seedNavPoints)
    storage.set(STORAGE_KEYS.AUDIT_LOG, seedAuditLog)
    storage.set(STORAGE_KEYS.EXCEPTION_LOGS, seedExceptionLogs)
    storage.set(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
  }
}
