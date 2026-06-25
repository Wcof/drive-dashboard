import { describe, it, expect } from "vitest"
import { computeFovCone } from "@/utils/fovGeometry"

describe("computeFovCone 视野锥几何（ADR#117）", () => {
  it("返回 4 点闭合多边形（机器人位置+左右边缘+回起点）", () => {
    const r = computeFovCone({ longitude: 121.0, latitude: 31.0, yaw: 0, fovDeg: 60, rangeMeter: 50 })
    expect(r.coordinates).toHaveLength(4)
    expect(r.coordinates[0]).toEqual([121.0, 31.0])
    expect(r.coordinates[3]).toEqual([121.0, 31.0])
  })

  it("yaw=0 朝东，两侧点经度都大于起点经度", () => {
    const r = computeFovCone({ longitude: 121.0, latitude: 31.0, yaw: 90, fovDeg: 60, rangeMeter: 50 })
    expect(r.coordinates[1][1]).toBeGreaterThan(31.0) // 朝北 yaw=90 → lat 增大
    expect(r.coordinates[2][1]).toBeGreaterThan(31.0)
  })

  it("fov 越大两侧点张角越大", () => {
    const narrow = computeFovCone({ longitude: 0, latitude: 0, yaw: 0, fovDeg: 10, rangeMeter: 100 })
    const wide = computeFovCone({ longitude: 0, latitude: 0, yaw: 0, fovDeg: 170, rangeMeter: 100 })
    const narrowSpread = Math.abs(narrow.coordinates[1][1] - narrow.coordinates[2][1])
    const wideSpread = Math.abs(wide.coordinates[1][1] - wide.coordinates[2][1])
    expect(wideSpread).toBeGreaterThan(narrowSpread)
  })
})
