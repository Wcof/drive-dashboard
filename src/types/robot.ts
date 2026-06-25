// 机器人契约（对齐 bot src/types/robot.ts 子集，大屏只取指挥所需字段）

export enum RobotStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  CHARGING = "charging",
  PATROLLING = "patrolling",
  ERROR = "error",
  PAUSED = "paused",
  RETURNING = "returning",
}

export enum ExceptionStrategy {
  SKIP = "skip",
  RETRY = "retry",
  RETURN_TO_BASE = "return_to_base",
  WAIT_AND_RESUME = "wait_and_resume",
  ABORT = "abort",
  NOTIFY = "notify",
}

// 大屏 mock 机器人位置（地理坐标 + 朝向，用于地图渲染与轨迹）
export interface RobotPosition {
  longitude: number
  latitude: number
  yaw: number // 0-360 度，用于视野锥 FOV 计算
}

export interface Robot {
  id: string
  name: string // 角色式命名，如「北区巡检1号」
  serialNumber: string
  model: string
  status: RobotStatus
  batteryLevel: number // 0-100
  batteryThreshold: { low: number; critical: number }
  position: RobotPosition
  currentTaskId?: string
  signalStrength: number // 0-100，mock 用
  lastOnlineTime: string // ISO
  createdAt: string
  updatedAt: string
}
