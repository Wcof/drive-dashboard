import { describe, it, expect, beforeEach, vi } from "vitest"
import { tickFns, CLOCK } from "@/mock/mockClock"
import { RobotStatus } from "@/types/robot"
import { InspectionTaskInstanceStatus } from "@/types/inspection"
import { AlertStatus } from "@/types/alert"
import type { Robot } from "@/types/robot"
import type { InspectionTask } from "@/types/inspection"

const baseRobot: Robot = {
  id: "r1", name: "测试1号", serialNumber: "S1", model: "X",
  status: RobotStatus.PATROLLING, batteryLevel: 50,
  batteryThreshold: { low: 20, critical: 10 },
  position: { longitude: 121.0, latitude: 31.0, yaw: 0 },
  signalStrength: 90, lastOnlineTime: "", createdAt: "", updatedAt: "",
}

beforeEach(() => localStorage.clear())

describe("mockClock 节拍常量（ADR#192）", () => {
  it("位置 200ms / 告警 30s / 电量 30s / 任务进度 1s", () => {
    expect(CLOCK.POSITION_MS).toBe(200)
    expect(CLOCK.ALERT_MS).toBe(30_000)
    expect(CLOCK.BATTERY_MS).toBe(30_000)
    expect(CLOCK.PROGRESS_MS).toBe(1_000)
  })
})

describe("tickFns.position", () => {
  it("巡检中机器人按 yaw 移动位置", () => {
    const next = tickFns.position([baseRobot])
    expect(next[0].position.longitude).not.toBe(baseRobot.position.longitude)
  })
  it("充电中机器人位置不动", () => {
    const charging = { ...baseRobot, status: RobotStatus.CHARGING }
    const next = tickFns.position([charging])
    expect(next[0].position).toEqual(charging.position)
  })
})

describe("tickFns.battery", () => {
  it("巡检中机器人电量 -1", () => {
    const next = tickFns.battery([baseRobot])
    expect(next[0].batteryLevel).toBe(49)
  })
  it("充电中机器人电量 +1（上限100）", () => {
    const charging = { ...baseRobot, status: RobotStatus.CHARGING, batteryLevel: 99 }
    const next = tickFns.battery([charging])
    expect(next[0].batteryLevel).toBe(100)
    const next2 = tickFns.battery(next)
    expect(next2[0].batteryLevel).toBe(100)
  })
})

describe("tickFns.progress", () => {
  it("RUNNING 任务进度 +0.5", () => {
    const task: InspectionTask = {
      id: "t1", name: "T", code: "C", robotId: "r1",
      type: InspectionTaskInstanceStatus.RUNNING as never,
      status: InspectionTaskInstanceStatus.RUNNING,
      inspectionPointIds: ["p1", "p2"], currentInspectionPointIndex: 0,
      progress: 40, createdAt: "", updatedAt: "",
    }
    const next = tickFns.progress([task])
    expect(next[0].progress).toBe(40.5)
  })
  it("非 RUNNING 任务进度不动", () => {
    const task: InspectionTask = {
      id: "t1", name: "T", code: "C", robotId: "r1",
      type: "patrol" as never, status: InspectionTaskInstanceStatus.PAUSED,
      inspectionPointIds: ["p1"], currentInspectionPointIndex: 0,
      progress: 30, createdAt: "", updatedAt: "",
    }
    const next = tickFns.progress([task])
    expect(next[0].progress).toBe(30)
  })
})

describe("tickFns.alerts", () => {
  it("概率为 0 不生成告警", () => {
    const next = tickFns.alerts([baseRobot], [], 0)
    expect(next).toHaveLength(0)
  })
  it("概率为 1 一定生成新告警（ACTIVE 态）", () => {
    Math.random = vi.fn(() => 0) as never
    const next = tickFns.alerts([baseRobot], [], 1)
    expect(next).toHaveLength(1)
    expect(next[0].status).toBe(AlertStatus.ACTIVE)
  })
})
