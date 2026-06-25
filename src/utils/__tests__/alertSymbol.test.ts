import { describe, it, expect } from "vitest"
import { ALERT_COLORS, ALERT_SIZES, ACKED_COLOR, alertColor, alertSize, shouldFlash } from "@/utils/alertSymbol"
import { patrolAnchorStyle, PATROL_ANCHOR_COLOR, PATROL_ANCHOR_SHAPE } from "@/utils/patrolSymbol"
import { AlertSeverity, AlertStatus, type Alert } from "@/types/alert"

const mk = (severity: AlertSeverity, status: AlertStatus): Alert => ({
  id: "a", robotId: "r", severity, status, type: "low_battery" as never,
  title: "", description: "", timestamp: "",
})

describe("alertSymbol 告警锚点视觉规范（ADR#36）", () => {
  it("分级色：紧急红/警告黄/信息蓝", () => {
    expect(ALERT_COLORS[AlertSeverity.CRITICAL]).toBe("#ff3b5c")
    expect(ALERT_COLORS[AlertSeverity.WARNING]).toBe("#ffb020")
    expect(ALERT_COLORS[AlertSeverity.INFO]).toBe("#3b82f6")
  })
  it("分级大小：紧急大/警告中/信息小", () => {
    expect(ALERT_SIZES[AlertSeverity.CRITICAL]).toBeGreaterThan(ALERT_SIZES[AlertSeverity.WARNING])
    expect(ALERT_SIZES[AlertSeverity.WARNING]).toBeGreaterThan(ALERT_SIZES[AlertSeverity.INFO])
    expect(alertSize(mk(AlertSeverity.CRITICAL, AlertStatus.ACTIVE))).toBe(ALERT_SIZES[AlertSeverity.CRITICAL])
  })
  it("ACTIVE 用分级色，ACKED 变灰", () => {
    expect(alertColor(mk(AlertSeverity.CRITICAL, AlertStatus.ACTIVE))).toBe("#ff3b5c")
    expect(alertColor(mk(AlertSeverity.CRITICAL, AlertStatus.ACKED))).toBe(ACKED_COLOR)
  })
  it("ACTIVE 持续闪烁，ACKED 不闪", () => {
    expect(shouldFlash(mk(AlertSeverity.WARNING, AlertStatus.ACTIVE))).toBe(true)
    expect(shouldFlash(mk(AlertSeverity.WARNING, AlertStatus.ACKED))).toBe(false)
  })
})

describe("patrolSymbol 边巡边检锚点（ADR#39）", () => {
  it("三角形状 + 橙色，与告警圆形分级色错开", () => {
    const s = patrolAnchorStyle()
    expect(s.shape).toBe(PATROL_ANCHOR_SHAPE)
    expect(s.color).toBe(PATROL_ANCHOR_COLOR)
    expect(PATROL_ANCHOR_COLOR).not.toBe(ALERT_COLORS[AlertSeverity.CRITICAL])
    expect(PATROL_ANCHOR_COLOR).not.toBe(ALERT_COLORS[AlertSeverity.WARNING])
    expect(PATROL_ANCHOR_COLOR).not.toBe(ALERT_COLORS[AlertSeverity.INFO])
  })
  it("闪烁 + 虚线圈", () => {
    const s = patrolAnchorStyle()
    expect(s.flash).toBe(true)
    expect(s.dashedRing).toBe(true)
  })
})
