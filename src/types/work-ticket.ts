// 作业票契约（ADR#120/194 作业票监护区）

export enum WorkTicketStatus {
  PENDING = "pending",
  ACTIVE = "active",
  GUARDING = "guarding",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface WorkTicket {
  id: string
  ticketNo: string
  title: string
  description: string
  areaName: string
  // 监护区域多边形（地图高亮）
  guardZone: { longitude: number; latitude: number }[]
  robotId?: string
  status: WorkTicketStatus
  applicant: string
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
}
