import { describe, it, expect, beforeEach } from "vitest"
import { useAlerts } from "@/composables/useAlerts"
import { useAuditLog, addAuditLog } from "@/composables/useAuditLog"
import { setMockDataService } from "@/composables/useMockDataService"
import { createMockDataService } from "@/mock/mockDataService"
import { storage, STORAGE_KEYS } from "@/utils/storage"
import { AlertStatus } from "@/types/alert"

beforeEach(() => {
  localStorage.clear()
  setMockDataService(createMockDataService())
})

const flush = () => new Promise((r) => setTimeout(r, 0))

describe("useAlerts.ackAlert 操作联动审计（ADR#36/72/166）", () => {
  it("ACK 后告警状态变 ACKED 且写审计日志", async () => {
    const { alerts, ackAlert, ackedAlerts } = useAlerts()
    const target = alerts.value.find((a) => a.status === AlertStatus.ACTIVE)!
    ackAlert(target.id, "operator-zhang", "现场已确认")
    await flush()
    expect(ackedAlerts.value.some((a) => a.id === target.id)).toBe(true)
    const audit = storage.get<{ action: string; targetId: string; targetType: string }[]>(STORAGE_KEYS.AUDIT_LOG)!
    expect(audit.some((x) => x.action === "ack_alert" && x.targetId === target.id && x.targetType === "alert")).toBe(true)
  })
})

describe("addAuditLog 写入审计（ADR#72）", () => {
  it("追加一条审计日志并持久化", async () => {
    addAuditLog({ action: "takeover", operator: "li", targetId: "robot-south-1", targetType: "robot", reason: "电机过热" })
    await flush()
    const audit = storage.get<{ action: string; operator: string }[]>(STORAGE_KEYS.AUDIT_LOG)!
    expect(audit.some((x) => x.action === "takeover" && x.operator === "li")).toBe(true)
  })
})

describe("useAuditLog 倒序展示", () => {
  it("auditLog 倒序（最新在前）", () => {
    const { auditLog } = useAuditLog()
    const list = auditLog.value
    if (list.length >= 2) {
      expect(new Date(list[0].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(list[1].createdAt).getTime())
    }
  })
})
