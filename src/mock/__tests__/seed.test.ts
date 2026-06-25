import { describe, it, expect, beforeEach } from "vitest"
import { seedIfEmpty, seedRobots, seedAlerts, seedWorkTickets, seedMaps } from "@/mock/seed"
import { storage, STORAGE_KEYS } from "@/utils/storage"
import { RobotStatus } from "@/types/robot"
import { AlertSeverity, AlertStatus } from "@/types/alert"

describe("seedIfEmpty", () => {
  beforeEach(() => localStorage.clear())

  it("空 localStorage 灌入全部 seed（ADR#42 全状态覆盖）", () => {
    seedIfEmpty()
    expect(storage.get(STORAGE_KEYS.ROBOTS)).toHaveLength(5)
    expect(storage.get(STORAGE_KEYS.ALERTS)).toHaveLength(5)
    expect(storage.get(STORAGE_KEYS.WORK_TICKETS)).toHaveLength(1)
    expect(storage.get(STORAGE_KEYS.INSPECTION_MAPS)).toHaveLength(1)
    expect(storage.get(STORAGE_KEYS.SCHEMA_VERSION)).toBe(1)
  })

  it("非空 localStorage 不重复灌入", () => {
    seedIfEmpty()
    storage.set(STORAGE_KEYS.ROBOTS, [{ ...seedRobots[0], id: "custom" }])
    seedIfEmpty()
    expect(storage.get<unknown[]>(STORAGE_KEYS.ROBOTS)).toHaveLength(1)
  })
})

describe("seed 5 机器人全状态覆盖（ADR#42）", () => {
  it("覆盖 巡检中/待命/低电返充/故障待接管/充电中 五态", () => {
    const statuses = seedRobots.map((r) => r.status)
    expect(statuses).toContain(RobotStatus.PATROLLING)
    expect(statuses).toContain(RobotStatus.ONLINE) // 待命
    expect(statuses).toContain(RobotStatus.RETURNING) // 低电返充
    expect(statuses).toContain(RobotStatus.ERROR) // 故障待接管
    expect(statuses).toContain(RobotStatus.CHARGING)
    expect(seedRobots).toHaveLength(5)
  })

  it("角色式命名（ADR#42）", () => {
    expect(seedRobots.every((r) => /区.+号$/.test(r.name))).toBe(true)
  })

  it("返充机器人电量低于 low 阈值", () => {
    const returning = seedRobots.find((r) => r.status === RobotStatus.RETURNING)!
    expect(returning.batteryLevel).toBeLessThan(returning.batteryThreshold.low)
  })
})

describe("seed 5 告警覆盖三级（ADR#36/42）", () => {
  it("覆盖 紧急/警告/信息 三级", () => {
    const severities = seedAlerts.map((a) => a.severity)
    expect(severities).toContain(AlertSeverity.CRITICAL)
    expect(severities).toContain(AlertSeverity.WARNING)
    expect(severities).toContain(AlertSeverity.INFO)
    expect(seedAlerts).toHaveLength(5)
  })

  it("含 ACTIVE 与 ACKED 两态（验证 ACK 变灰机制数据基础）", () => {
    expect(seedAlerts.some((a) => a.status === AlertStatus.ACTIVE)).toBe(true)
    expect(seedAlerts.some((a) => a.status === AlertStatus.ACKED)).toBe(true)
  })
})

describe("seed 1 作业票（ADR#42/120）", () => {
  it("有 1 作业票且监护区为多边形", () => {
    expect(seedWorkTickets).toHaveLength(1)
    expect(seedWorkTickets[0].guardZone.length).toBeGreaterThanOrEqual(3)
  })
})

describe("seed buildings GeoJSON（ADR#133/134）", () => {
  it("地图含 buildings FeatureCollection，每个 Polygon 带 height", () => {
    const buildings = seedMaps[0].buildings!
    expect(buildings.type).toBe("FeatureCollection")
    expect(buildings.features.length).toBeGreaterThanOrEqual(3)
    expect(buildings.features.every((f: GeoJSON.Feature<GeoJSON.Polygon, { height: number }>) => f.geometry.type === "Polygon")).toBe(true)
    expect(buildings.features.every((f: GeoJSON.Feature<GeoJSON.Polygon, { height: number }>) => typeof f.properties.height === "number")).toBe(true)
  })
})
