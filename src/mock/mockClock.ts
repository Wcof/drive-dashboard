// mock 时钟节拍 —— ADR#192
// 机器人位置 200ms（5fps）/ 告警随机生成 30s 检查概率 / 电量衰减 30s 掉1% / 任务进度独立 1s
// 与位置更新解耦；所有节拍可独立启停，便于测试用 vi.useFakeTimers 控制

import { reactive, type UnwrapNestedRefs } from "vue"
import type { Robot } from "@/types/robot"
import type { Alert } from "@/types/alert"
import type { InspectionTask } from "@/types/inspection"
import { RobotStatus } from "@/types/robot"
import { AlertSeverity, AlertStatus } from "@/types/alert"
import { InspectionTaskInstanceStatus } from "@/types/inspection"
import { ExceptionType } from "@/types/exception"
import { storage, STORAGE_KEYS } from "@/utils/storage"

export const CLOCK = {
  POSITION_MS: 200,
  ALERT_MS: 30_000,
  BATTERY_MS: 30_000,
  PROGRESS_MS: 1_000,
} as const

export interface MockClockHandles {
  positionTimer: ReturnType<typeof setInterval> | null
  alertTimer: ReturnType<typeof setInterval> | null
  batteryTimer: ReturnType<typeof setInterval> | null
  progressTimer: ReturnType<typeof setInterval> | null
}

export interface MockClockOptions {
  alertProbability?: number // 每次告警检查的生成概率 0-1
}

// 机器人位置插值：按 yaw 方向小步移动（mock 轨迹）
function tickPosition(robots: Robot[]): Robot[] {
  return robots.map((r) => {
    if (r.status === RobotStatus.CHARGING || r.status === RobotStatus.OFFLINE) return r
    const step = 0.00005 // 约 5 米
    const yawRad = (r.position.yaw * Math.PI) / 180
    return {
      ...r,
      position: {
        longitude: r.position.longitude + Math.cos(yawRad) * step,
        latitude: r.position.latitude + Math.sin(yawRad) * step,
        yaw: r.position.yaw,
      },
      updatedAt: new Date().toISOString(),
    }
  })
}

// 电量衰减：30s 掉 1%（充电态则回升）
function tickBattery(robots: Robot[]): Robot[] {
  return robots.map((r) => {
    let battery = r.batteryLevel
    if (r.status === RobotStatus.CHARGING) {
      battery = Math.min(100, battery + 1)
    } else if (r.status !== RobotStatus.OFFLINE) {
      battery = Math.max(0, battery - 1)
    }
    return { ...r, batteryLevel: battery }
  })
}

// 任务进度：1s 推进 0.5%（仅 RUNNING 任务）
function tickProgress(tasks: InspectionTask[]): InspectionTask[] {
  return tasks.map((t) => {
    if (t.status !== InspectionTaskInstanceStatus.RUNNING) return t
    const progress = Math.min(100, t.progress + 0.5)
    return {
      ...t,
      progress,
      currentInspectionPointIndex: Math.min(
        t.inspectionPointIds.length - 1,
        Math.floor((progress / 100) * t.inspectionPointIds.length),
      ),
      updatedAt: new Date().toISOString(),
    }
  })
}

// 告警随机生成：30s 检查一次，按概率随机生成新告警
function tickAlerts(
  robots: Robot[],
  alerts: Alert[],
  probability: number,
): Alert[] {
  if (Math.random() > probability) return alerts
  const candidates = robots.filter((r) => r.status !== RobotStatus.OFFLINE)
  if (candidates.length === 0) return alerts
  const robot = candidates[Math.floor(Math.random() * candidates.length)]
  const severities = [AlertSeverity.CRITICAL, AlertSeverity.WARNING, AlertSeverity.INFO]
  const severity = severities[Math.floor(Math.random() * severities.length)]
  const types = [ExceptionType.OBSTACLE_DETECTED, ExceptionType.SIGNAL_LOST, ExceptionType.TASK_TIMEOUT]
  const type = types[Math.floor(Math.random() * types.length)]
  const newAlert: Alert = {
    id: `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    robotId: robot.id,
    severity,
    status: AlertStatus.ACTIVE,
    type,
    title: `${robot.name} 新告警`,
    description: `mock 随机生成 ${severity} 级告警`,
    timestamp: new Date().toISOString(),
  }
  return [...alerts, newAlert]
}

export interface MockClockState {
  robots: Robot[]
  alerts: Alert[]
  tasks: InspectionTask[]
}

// 启动 mock 时钟，返回停掉函数与时钟句柄
export function startMockClock(
  state: UnwrapNestedRefs<MockClockState>,
  options: MockClockOptions = {},
): { stop: () => void; handles: MockClockHandles } {
  const alertProbability = options.alertProbability ?? 0.15
  const handles: MockClockHandles = {
    positionTimer: null,
    alertTimer: null,
    batteryTimer: null,
    progressTimer: null,
  }

  handles.positionTimer = setInterval(() => {
    const next = tickPosition(state.robots)
    state.robots.splice(0, state.robots.length, ...next)
    storage.set(STORAGE_KEYS.ROBOTS, next)
  }, CLOCK.POSITION_MS)

  handles.batteryTimer = setInterval(() => {
    const next = tickBattery(state.robots)
    state.robots.splice(0, state.robots.length, ...next)
    storage.set(STORAGE_KEYS.ROBOTS, next)
  }, CLOCK.BATTERY_MS)

  handles.progressTimer = setInterval(() => {
    const next = tickProgress(state.tasks)
    state.tasks.splice(0, state.tasks.length, ...next)
    storage.set(STORAGE_KEYS.TASKS, next)
  }, CLOCK.PROGRESS_MS)

  handles.alertTimer = setInterval(() => {
    const next = tickAlerts(state.robots, state.alerts, alertProbability)
    state.alerts.splice(0, state.alerts.length, ...next)
    storage.set(STORAGE_KEYS.ALERTS, next)
  }, CLOCK.ALERT_MS)

  function stop(): void {
    if (handles.positionTimer) clearInterval(handles.positionTimer)
    if (handles.alertTimer) clearInterval(handles.alertTimer)
    if (handles.batteryTimer) clearInterval(handles.batteryTimer)
    if (handles.progressTimer) clearInterval(handles.progressTimer)
    handles.positionTimer = handles.alertTimer = handles.batteryTimer = handles.progressTimer = null
  }

  return { stop, handles }
}

// 导出纯函数便于单测（不依赖 setInterval）
export const tickFns = {
  position: tickPosition,
  battery: tickBattery,
  progress: tickProgress,
  alerts: tickAlerts,
}

// 默认 mock 时钟状态（reactive 容器）
export function createMockClockState(): UnwrapNestedRefs<MockClockState> {
  const robots = storage.get<Robot[]>(STORAGE_KEYS.ROBOTS) ?? []
  const alerts = storage.get<Alert[]>(STORAGE_KEYS.ALERTS) ?? []
  const tasks = storage.get<InspectionTask[]>(STORAGE_KEYS.TASKS) ?? []
  return reactive({ robots, alerts, tasks })
}
