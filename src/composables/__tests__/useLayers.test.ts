import { describe, it, expect, beforeEach } from "vitest"
import { useLayers, LAYER_DEFAULTS, type LayerKey } from "@/composables/useLayers"
import { storage, STORAGE_KEYS } from "@/utils/storage"

beforeEach(() => localStorage.clear())

describe("useLayers 图层优先级与默认显隐（ADR#105-121）", () => {
  it("P0 图层默认显示", () => {
    const p0 = (Object.keys(LAYER_DEFAULTS) as LayerKey[]).filter((k) => LAYER_DEFAULTS[k].priority === "P0")
    expect(p0.every((k) => LAYER_DEFAULTS[k].visible)).toBe(true)
    expect(p0).toContain("baseRaster")
    expect(p0).toContain("buildings3d")
    expect(p0).toContain("robotPosition")
    expect(p0).toContain("alertAnchors")
  })

  it("P2 图层默认隐藏", () => {
    const p2 = (Object.keys(LAYER_DEFAULTS) as LayerKey[]).filter((k) => LAYER_DEFAULTS[k].priority === "P2")
    expect(p2.every((k) => !LAYER_DEFAULTS[k].visible)).toBe(true)
    expect(p2).toContain("navPoints")
    expect(p2).toContain("coverageHeatmap")
    expect(p2).toContain("patrolAnchors")
  })

  it("toggle 切换显隐并持久化", async () => {
    const { visibility, toggle } = useLayers()
    const before = visibility.navPoints
    toggle("navPoints")
    expect(visibility.navPoints).toBe(!before)
    // reactive watch 异步写 localStorage，等微任务
    await new Promise((r) => setTimeout(r, 0))
    expect(storage.get<Record<string, boolean>>(STORAGE_KEYS.LAYER_VISIBILITY)?.navPoints).toBe(!before)
  })

  it("p2Layers 列出所有 P2 图层", () => {
    const { p2Layers } = useLayers()
    expect(p2Layers).toHaveLength(4)
    expect(p2Layers).toContain("coverageHeatmap")
  })
})
