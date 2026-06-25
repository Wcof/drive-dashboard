// 轨迹插值 —— ADR#183 双层轨迹：实时渐变线（最近30min）+ 历史热力
// 纯函数：给机器人位置序列，算渐变线 GeoJSON LineString + 历史累积

export interface TrajectoryPoint {
  longitude: number
  latitude: number
  timestamp: number // epoch ms
}

export interface TrajectoryResult {
  realtime: GeoJSON.Feature<GeoJSON.LineString, { opacity: number[] }>
}

const WINDOW_MS = 30 * 60 * 1000 // 最近 30 分钟

// 生成实时渐变线：旧端淡(opacity 0)→新端浓(opacity 1)，过滤最近30min
export function buildRealtimeTrajectory(
  points: TrajectoryPoint[],
  now: number = Date.now(),
): TrajectoryResult {
  const recent = points.filter((p) => now - p.timestamp <= WINDOW_MS)
  const coords = recent.map((p) => [p.longitude, p.latitude] as [number, number])
  const n = coords.length
  // 渐变 opacity：第 i 点 opacity = i/(n-1)，0 端最淡
  const opacity = n > 1 ? coords.map((_, i) => i / (n - 1)) : [1]
  return {
    realtime: {
      type: "Feature",
      properties: { opacity },
      geometry: { type: "LineString", coordinates: coords },
    },
  }
}

// 历史热力累积：把新轨迹点并入历史 localStorage 独立累积（大屏不与 bot 共享）
export function appendTrajectoryHistory(
  history: TrajectoryPoint[],
  newPoints: TrajectoryPoint[],
  cap = 10_000,
): TrajectoryPoint[] {
  const merged = [...history, ...newPoints]
  // 超容量丢弃最旧
  return merged.length > cap ? merged.slice(merged.length - cap) : merged
}
