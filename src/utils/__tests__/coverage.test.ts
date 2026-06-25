import { describe, it, expect } from "vitest"
import { computeCoverage } from "@/utils/coverage"
import type { InspectionPoint } from "@/types/inspection"

const mk = (covered: boolean): InspectionPoint => ({
  id: "p", name: "p", code: "c", pointType: "fixed" as never,
  description: "", mapId: "m", location: { longitude: 0, latitude: 0 },
  sequence: 0, stayDurationSec: 0, isCritical: false, covered, createdAt: "", updatedAt: "",
})

describe("computeCoverage 巡检点覆盖率（ADR#184）", () => {
  it("空列表 ratio=0", () => {
    const r = computeCoverage([])
    expect(r.ratio).toBe(0)
    expect(r.features.features).toHaveLength(0)
  })
  it("全覆盖 ratio=1", () => {
    const r = computeCoverage([mk(true), mk(true)])
    expect(r.ratio).toBe(1)
  })
  it("半覆盖 ratio=0.5 且每个点带 covered 属性", () => {
    const r = computeCoverage([mk(true), mk(false)])
    expect(r.ratio).toBe(0.5)
    expect(r.features.features[0].properties.covered).toBe(true)
    expect(r.features.features[1].properties.covered).toBe(false)
  })
})
