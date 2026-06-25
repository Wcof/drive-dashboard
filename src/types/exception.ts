// 异常契约（对齐 bot src/types/exception.ts 子集）

import { ExceptionStrategy } from "./robot"

export enum ExceptionType {
  INSPECTION_POINT_FAILURE = "inspection_point_failure",
  ROBOT_FAILURE = "robot_failure",
  LOW_BATTERY = "low_battery",
  SIGNAL_LOST = "signal_lost",
  TASK_TIMEOUT = "task_timeout",
  OBSTACLE_DETECTED = "obstacle_detected",
}

export interface TaskExceptionStrategy {
  inspectionPointFailure: ExceptionStrategy
  robotFailure: ExceptionStrategy
  lowBattery: ExceptionStrategy
  signalLost: ExceptionStrategy
  timeout: ExceptionStrategy
  maxRetryCount: number
  retryInterval: number
}

export interface ExceptionLog {
  id: string
  taskId: string
  type: ExceptionType
  timestamp: string // ISO
  inspectionPointId?: string
  robotId?: string // 大屏补充：异常关联机器人
  description: string
  strategyApplied: ExceptionStrategy
  resolved: boolean
  resolvedAt?: string
  resolutionNote?: string
}
