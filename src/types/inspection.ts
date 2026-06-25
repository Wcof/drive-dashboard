// 地图/巡检契约子集（对齐 bot src/types/inspection.ts 挑大屏所需）

import type { Coordinate } from "./common"

export enum InspectionTaskType {
  POINT = "point",
  PATROL = "patrol",
}

export enum InspectionTaskInstanceStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  PAUSED = "paused",
  PROCESSING = "processing",
  CANCELLED = "cancelled",
  TERMINATED = "terminated",
  FAILED = "failed",
}

export enum InspectionPointType {
  FIXED = "fixed",
  AREA = "area",
}

export type InspectionPointBizType =
  | "inspection"
  | "charging"
  | "parking"
  | "maintenance"
  | "standby"

export interface MapPosition {
  x: number
  y: number
  yaw?: number
}

export interface MapSettings {
  scale: number
  origin: { x: number; y: number }
  rotation: number
}

// 区域分区（ADR#114 P1 区域分区图层）
export interface MapRegion {
  id: string
  name: string
  color: string
  x: number
  y: number
  width: number
  height: number
  polygonPoints?: string
  code?: string
  zoneType?: "normal" | "forbidden"
}

// 巡检地图 —— 扩展 buildings? 字段（ADR#110/136）
import type { BuildingsCollection } from "./buildings"

export interface InspectionMap {
  id: string
  name: string
  description: string
  imageUrl?: string // raster 底图源
  settings?: MapSettings
  dimensions?: { width: number; height: number }
  geographicCoordinates?: { latitude: number; longitude: number }
  regions?: MapRegion[]
  buildings?: BuildingsCollection // 大屏扩展字段，bot 不主动维护
  createdAt: string
  updatedAt: string
}

export interface InspectionPoint {
  id: string
  name: string
  code: string
  pointType: InspectionPointType
  pointBizType?: InspectionPointBizType
  description: string
  mapId: string
  location: Coordinate
  mapPosition?: MapPosition
  sequence: number
  stayDurationSec: number
  isCritical: boolean
  areaId?: string
  areaName?: string
  // 大屏 mock：覆盖率标记（ADR#38 任务覆盖热力）
  covered?: boolean
  createdAt: string
  updatedAt: string
}

export interface InspectionPath {
  id: string
  name: string
  taskId: string
  inspectionPointIds: string[]
  totalDistance: number
  estimatedDuration: number
  createdAt: string
  updatedAt: string
}

export interface InspectionTask {
  id: string
  planId?: string
  name: string
  code: string
  robotId: string
  routeId?: string
  type: InspectionTaskType
  status: InspectionTaskInstanceStatus
  inspectionPointIds: string[]
  currentInspectionPointIndex: number
  progress: number // 0-100
  businessScene?: string
  priorityLevel?: "normal" | "high" | "emergency"
  schedule?: { startTime: string; endTime: string }
  exceptionCount?: number
  createdAt: string
  updatedAt: string
}
