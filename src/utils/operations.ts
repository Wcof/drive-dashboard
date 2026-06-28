// 操作调度纯函数 —— 告警子操作 + 任务抢占/终止 + 作业票触发 + 远控切入
// 所有操作写审计日志；纯函数便于单测，弹窗调用

import { storage, STORAGE_KEYS } from "@/utils/storage"
import { addAuditLog } from "@/composables/useAuditLog"
import { getMockDataService } from "@/composables/useMockDataService"
import type { Robot } from "@/types/robot"
import type { InspectionTask } from "@/types/inspection"
import type { WorkTicket } from "@/types/work-ticket"
import { RobotStatus } from "@/types/robot"
import { InspectionTaskInstanceStatus } from "@/types/inspection"
import { WorkTicketStatus } from "@/types/work-ticket"

// ── 告警子操作（ADR#151 确认/误判/转隐患/转整改/推送第三方）──
export type AlertSubAction = "confirm" | "false_alarm" | "to_hazard" | "to_rectify" | "push_third_party"

export const ALERT_SUB_ACTION_LABEL: Record<AlertSubAction, string> = {
  confirm: "确认",
  false_alarm: "误判",
  to_hazard: "转隐患",
  to_rectify: "转整改",
  push_third_party: "推送第三方",
}

export interface AlertSubActionResult {
  auditAction: "ack_alert"
  reason: string
}

export function alertSubAction(action: AlertSubAction, alertId: string, operator: string, note: string): AlertSubActionResult {
  const reason = `${ALERT_SUB_ACTION_LABEL[action]}：${note}`
  addAuditLog({ action: "ack_alert", operator, targetId: alertId, targetType: "alert", reason })
  return { auditAction: "ack_alert", reason }
}

// ── 任务抢占授权（ADR#153）──
export function preemptTask(taskId: string, operator: string, reason: string): void {
  const tasks = storage.get<InspectionTask[]>(STORAGE_KEYS.TASKS) ?? []
  const idx = tasks.findIndex((t) => t.id === taskId)
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], status: InspectionTaskInstanceStatus.PAUSED, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.TASKS, tasks)
    const { state } = getMockDataService()
    const sIdx = state.tasks.findIndex((t) => t.id === taskId)
    if (sIdx !== -1) state.tasks[sIdx] = tasks[idx]
  }
  addAuditLog({ action: "preempt", operator, targetId: taskId, targetType: "task", reason })
}

// ── 终止任务（ADR#153）──
export function terminateTask(taskId: string, operator: string, reason: string): void {
  const tasks = storage.get<InspectionTask[]>(STORAGE_KEYS.TASKS) ?? []
  const idx = tasks.findIndex((t) => t.id === taskId)
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], status: InspectionTaskInstanceStatus.TERMINATED, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.TASKS, tasks)
    const { state } = getMockDataService()
    const sIdx = state.tasks.findIndex((t) => t.id === taskId)
    if (sIdx !== -1) state.tasks[sIdx] = tasks[idx]
  }
  addAuditLog({ action: "terminate", operator, targetId: taskId, targetType: "task", reason })
}

// ── 作业票触发（ADR#70/120/153）──
export function triggerWorkTicket(robotId: string, ticket: Omit<WorkTicket, "id" | "createdAt" | "updatedAt" | "status">, operator: string): WorkTicket {
  const now = new Date().toISOString()
  const newTicket: WorkTicket = {
    ...ticket,
    id: `ticket-${Date.now()}`,
    status: WorkTicketStatus.ACTIVE,
    robotId,
    createdAt: now,
    updatedAt: now,
  }
  const tickets = storage.get<WorkTicket[]>(STORAGE_KEYS.WORK_TICKETS) ?? []
  tickets.push(newTicket)
  storage.set(STORAGE_KEYS.WORK_TICKETS, tickets)
  const { state } = getMockDataService()
  state.workTickets.push(newTicket)
  addAuditLog({ action: "work_ticket_trigger", operator, targetId: newTicket.id, targetType: "work_ticket", reason: `触发作业票 ${newTicket.title}` })
  return newTicket
}

// ── 获取电子控制权 + 切入远控（ADR#152）──
export function acquireControl(robotId: string, operator: string): void {
  // mock：把机器人状态置为 PAUSED（表示被接管远控），写审计
  const robots = storage.get<Robot[]>(STORAGE_KEYS.ROBOTS) ?? []
  const idx = robots.findIndex((r) => r.id === robotId)
  if (idx !== -1) {
    robots[idx] = { ...robots[idx], status: RobotStatus.PAUSED, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.ROBOTS, robots)
    const { state } = getMockDataService()
    const sIdx = state.robots.findIndex((r) => r.id === robotId)
    if (sIdx !== -1) state.robots[sIdx] = robots[idx]
  }
  addAuditLog({ action: "calibrate", operator, targetId: robotId, targetType: "robot", reason: "获取电子控制权并切入远控" })
}

// ── 释放电子控制权（ADR#152 S15）──
export function releaseControl(robotId: string, operator: string): void {
  const robots = storage.get<Robot[]>(STORAGE_KEYS.ROBOTS) ?? []
  const idx = robots.findIndex((r) => r.id === robotId)
  if (idx !== -1) {
    robots[idx] = { ...robots[idx], status: RobotStatus.ONLINE, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.ROBOTS, robots)
    const { state } = getMockDataService()
    const sIdx = state.robots.findIndex((r) => r.id === robotId)
    if (sIdx !== -1) state.robots[sIdx] = robots[idx]
  }
  addAuditLog({ action: "calibrate", operator, targetId: robotId, targetType: "robot", reason: "释放电子控制权" })
}
