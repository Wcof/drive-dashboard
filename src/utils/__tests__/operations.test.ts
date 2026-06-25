import { describe, it, expect, beforeEach } from "vitest"
import {
  alertSubAction, preemptTask, terminateTask, triggerWorkTicket, acquireControl,
  ALERT_SUB_ACTION_LABEL, type AlertSubAction,
} from "@/utils/operations"
import { setMockDataService } from "@/composables/useMockDataService"
import { createMockDataService } from "@/mock/mockDataService"
import { storage, STORAGE_KEYS } from "@/utils/storage"
import { InspectionTaskInstanceStatus } from "@/types/inspection"
import { WorkTicketStatus } from "@/types/work-ticket"
import { RobotStatus } from "@/types/robot"

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  localStorage.clear()
  setMockDataService(createMockDataService())
})

describe("alertSubAction 告警5子操作（ADR#151）", () => {
  it("5 子操作标签齐全", () => {
    expect(Object.keys(ALERT_SUB_ACTION_LABEL)).toHaveLength(5)
    expect(ALERT_SUB_ACTION_LABEL.confirm).toBe("确认")
    expect(ALERT_SUB_ACTION_LABEL.false_alarm).toBe("误判")
    expect(ALERT_SUB_ACTION_LABEL.to_hazard).toBe("转隐患")
    expect(ALERT_SUB_ACTION_LABEL.to_rectify).toBe("转整改")
    expect(ALERT_SUB_ACTION_LABEL.push_third_party).toBe("推送第三方")
  })
  it("每个子操作写审计日志含子操作标签", async () => {
    const actions: AlertSubAction[] = ["confirm", "false_alarm", "to_hazard", "to_rectify", "push_third_party"]
    for (const a of actions) {
      alertSubAction(a, "alert-001", "op", "备注")
    }
    await flush()
    const audit = storage.get<{ reason: string }[]>(STORAGE_KEYS.AUDIT_LOG)!
    expect(audit.filter((x) => x.reason.includes("确认")).length).toBeGreaterThanOrEqual(1)
    expect(audit.filter((x) => x.reason.includes("误判")).length).toBeGreaterThanOrEqual(1)
    expect(audit.filter((x) => x.reason.includes("转隐患")).length).toBeGreaterThanOrEqual(1)
    expect(audit.filter((x) => x.reason.includes("转整改")).length).toBeGreaterThanOrEqual(1)
    expect(audit.filter((x) => x.reason.includes("推送第三方")).length).toBeGreaterThanOrEqual(1)
  })
})

describe("preemptTask 抢占授权（ADR#153）", () => {
  it("任务状态置 PAUSED 且写 preempt 审计", async () => {
    preemptTask("task-daily-north", "op", "抢占原因")
    await flush()
    const tasks = storage.get<{ id: string; status: string }[]>(STORAGE_KEYS.TASKS)!
    expect(tasks.find((t) => t.id === "task-daily-north")!.status).toBe(InspectionTaskInstanceStatus.PAUSED)
    const audit = storage.get<{ action: string }[]>(STORAGE_KEYS.AUDIT_LOG)!
    expect(audit.some((x) => x.action === "preempt")).toBe(true)
  })
})

describe("terminateTask 终止任务（ADR#153）", () => {
  it("任务状态置 TERMINATED 且写 terminate 审计", async () => {
    terminateTask("task-daily-north", "op", "终止原因")
    await flush()
    const tasks = storage.get<{ id: string; status: string }[]>(STORAGE_KEYS.TASKS)!
    expect(tasks.find((t) => t.id === "task-daily-north")!.status).toBe(InspectionTaskInstanceStatus.TERMINATED)
    const audit = storage.get<{ action: string }[]>(STORAGE_KEYS.AUDIT_LOG)!
    expect(audit.some((x) => x.action === "terminate")).toBe(true)
  })
})

describe("triggerWorkTicket 作业票触发（ADR#70/120）", () => {
  it("新增作业票 ACTIVE 态且写 work_ticket_trigger 审计", async () => {
    const before = (storage.get<unknown[]>(STORAGE_KEYS.WORK_TICKETS) ?? []).length
    triggerWorkTicket("robot-north-1", {
      ticketNo: "WT-TEST", title: "测试作业票", description: "", areaName: "北区",
      guardZone: [{ longitude: 121, latitude: 31 }], applicant: "李",
      startTime: "2026-06-24T18:00:00.000Z", endTime: "2026-06-24T20:00:00.000Z",
    }, "op")
    await flush()
    const after = (storage.get<{ status: string }[]>(STORAGE_KEYS.WORK_TICKETS) ?? [])
    expect(after.length).toBe(before + 1)
    expect(after[after.length - 1].status).toBe(WorkTicketStatus.ACTIVE)
    const audit = storage.get<{ action: string }[]>(STORAGE_KEYS.AUDIT_LOG)!
    expect(audit.some((x) => x.action === "work_ticket_trigger")).toBe(true)
  })
})

describe("acquireControl 电子控制权+远控（ADR#152）", () => {
  it("机器人置 PAUSED 且写 calibrate 审计", async () => {
    acquireControl("robot-north-1", "op")
    await flush()
    const robots = storage.get<{ id: string; status: string }[]>(STORAGE_KEYS.ROBOTS)!
    expect(robots.find((r) => r.id === "robot-north-1")!.status).toBe(RobotStatus.PAUSED)
    const audit = storage.get<{ reason: string }[]>(STORAGE_KEYS.AUDIT_LOG)!
    expect(audit.some((x) => x.reason.includes("电子控制权"))).toBe(true)
  })
})
