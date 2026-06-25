// 告警契约（大屏扩展 —— bot 的 ExceptionLog 在大屏侧升格为分级告警）

import type { ExceptionType } from "./exception"

export enum AlertSeverity {
  CRITICAL = "critical", // 紧急红
  WARNING = "warning",   // 警告黄
  INFO = "info",         // 信息蓝
}

export enum AlertStatus {
  ACTIVE = "active",     // 持续闪烁
  ACKED = "acked",       // ACK 后变灰
  RESOLVED = "resolved",
}

export interface Alert {
  id: string
  robotId: string
  taskId?: string
  inspectionPointId?: string
  severity: AlertSeverity
  status: AlertStatus
  type: ExceptionType
  title: string
  description: string
  timestamp: string // ISO
  ackedBy?: string
  ackedAt?: string
  resolvedAt?: string
}

// 边巡边检锚点（ADR#39，原漫游异常锚点）—— 与常规告警形状颜色错开
export interface PatrolAnomalyAnchor {
  id: string
  robotId: string
  longitude: number
  latitude: number
  title: string
  description: string
  timestamp: string
  dismissed: boolean
}
