// 任务覆盖热力 —— ADR#184 巡检点覆盖率（已覆盖绿/未覆盖红），不做路段级
// 纯函数：给巡检点列表 + 已覆盖标记，算覆盖率 GeoJSON

import type { InspectionPoint } from "@/types/inspection"

export interface CoverageResult {
  ratio: number // 0-1
  features: GeoJSON.FeatureCollection<
    GeoJSON.Point,
    { covered: boolean; name: string }
  >
}

export function computeCoverage(points: InspectionPoint[]): CoverageResult {
  if (points.length === 0) return { ratio: 0, features: { type: "FeatureCollection", features: [] } }
  const covered = points.filter((p) => p.covered)
  const ratio = covered.length / points.length
  const features: GeoJSON.FeatureCollection<
    GeoJSON.Point,
    { covered: boolean; name: string }
  > = {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature" as const,
      properties: { covered: !!p.covered, name: p.name },
      geometry: {
        type: "Point" as const,
        coordinates: [p.location.longitude, p.location.latitude],
      },
    })),
  }
  return { ratio, features }
}
