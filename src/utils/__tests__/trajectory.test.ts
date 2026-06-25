import { describe, it, expect } from "vitest"
import { buildRealtimeTrajectory, appendTrajectoryHistory, type TrajectoryPoint } from "@/utils/trajectory"

describe("buildRealtimeTrajectory 实时渐变线（ADR#183）", () => {
  it("过滤最近30分钟外的点", () => {
    const now = 1_000_000
    const pts: TrajectoryPoint[] = [
      { longitude: 0, latitude: 0, timestamp: now - 31 * 60_000 }, // 31min 前，丢弃
      { longitude: 1, latitude: 1, timestamp: now - 10 * 60_000 }, // 10min 前，保留
      { longitude: 2, latitude: 2, timestamp: now }, // 当前，保留
    ]
    const r = buildRealtimeTrajectory(pts, now)
    expect(r.realtime.geometry.coordinates).toHaveLength(2)
  })

  it("渐变 opacity 旧端0→新端1", () => {
    const now = 1_000_000
    const pts: TrajectoryPoint[] = [
      { longitude: 0, latitude: 0, timestamp: now - 60_000 },
      { longitude: 1, latitude: 1, timestamp: now - 30_000 },
      { longitude: 2, latitude: 2, timestamp: now },
    ]
    const r = buildRealtimeTrajectory(pts, now)
    expect(r.realtime.properties.opacity[0]).toBe(0)
    expect(r.realtime.properties.opacity[2]).toBe(1)
  })

  it("单点时 opacity=[1]", () => {
    const r = buildRealtimeTrajectory([{ longitude: 0, latitude: 0, timestamp: 0 }], 0)
    expect(r.realtime.properties.opacity).toEqual([1])
  })
})

describe("appendTrajectoryHistory 历史累积（ADR#183）", () => {
  it("并入新点", () => {
    const history: TrajectoryPoint[] = [{ longitude: 0, latitude: 0, timestamp: 0 }]
    const next = appendTrajectoryHistory(history, [{ longitude: 1, latitude: 1, timestamp: 1 }])
    expect(next).toHaveLength(2)
  })
  it("超容量丢弃最旧（cap=2）", () => {
    const history: TrajectoryPoint[] = [
      { longitude: 0, latitude: 0, timestamp: 0 },
      { longitude: 1, latitude: 1, timestamp: 1 },
    ]
    const next = appendTrajectoryHistory(history, [{ longitude: 2, latitude: 2, timestamp: 2 }], 2)
    expect(next).toHaveLength(2)
    expect(next[0].timestamp).toBe(1) // 最旧被丢弃
  })
})
