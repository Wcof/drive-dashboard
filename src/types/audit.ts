// 审计日志契约（对齐 bot src/types/audit.ts）

export interface AuditLogEntry {
  id: string
  action: "preempt" | "terminate" | "takeover" | "calibrate" | "ack_alert" | "dispatch" | "work_ticket_trigger" | "voice_on" | "voice_off" | "remote_control_enter" | "remote_control_exit"
  operator: string
  targetId: string
  targetType: "task" | "robot" | "alert" | "work_ticket"
  beforeValue?: unknown
  afterValue?: unknown
  reason?: string
  createdAt: string // ISO
}
