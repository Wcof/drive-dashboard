// P0 色系规范 —— IOC 数字孪生 sci-fi dark 配色
// 对照整改计划第三节色系表：背景#050A14 道路#1E4DFF 水体#061222 建筑#1A2A3A 绿地#0B2A1F
// 通过 setPaintProperty 改写 dark-v11 各语义图层颜色，注入霓虹蓝能量感

import type { Map as MbMap } from "mapbox-gl"

// 已知可能不存在的图层名做安全 setter
function safeSetPaint(m: MbMap, layer: string, prop: string, value: unknown): void {
  try {
    if (m.getLayer(layer)) (m as any).setPaintProperty(layer, prop, value)
  } catch {
    /* 图层不存在或属性不适用，忽略 */
  }
}

function safeSetLayout(m: MbMap, layer: string, prop: string, value: unknown): void {
  try {
    if (m.getLayer(layer)) (m as any).setLayoutProperty(layer, prop, value)
  } catch {
    /* 忽略 */
  }
}

export function applySciFiColors(m: MbMap): void {
  // 背景底色
  safeSetPaint(m, "background", "background-color", "#050A14")

  // 道路 —— 发光蓝
  const roadLayers = [
    "road", "road-secondary", "road-primary", "road-trunk", "road-motorway",
    "road-street", "road-minor", "road-service",
    "road-secondary-case", "road-primary-case", "road-trunk-case", "road-motorway-case",
  ]
  for (const l of roadLayers) {
    safeSetPaint(m, l, "line-color", "#1E4DFF")
    safeSetPaint(m, l, "line-opacity", 0.55)
    safeSetPaint(m, l, "line-blur", 1.2)
  }

  // 水体
  const waterLayers = ["water", "water-shadow", "waterway", "waterway-other"]
  for (const l of waterLayers) {
    safeSetPaint(m, l, "fill-color", "#061222")
    safeSetPaint(m, l, "fill-opacity", 0.9)
  }

  // 绿地
  const landLayers = ["landcover", "wood", "grass", "pitch", "park", "landuse", "landcover-shadow"]
  for (const l of landLayers) {
    safeSetPaint(m, l, "fill-color", "#0B2A1F")
    safeSetPaint(m, l, "fill-opacity", 0.85)
  }

  // 建筑（dark-v11 平面建筑基底色，3D 由 MapStage 单独叠加）
  const buildingLayers = ["building", "building-top"]
  for (const l of buildingLayers) {
    safeSetPaint(m, l, "fill-color", "#1A2A3A")
    safeSetPaint(m, l, "fill-opacity", 0.7)
  }

  // 文字标签提亮，避免在深底上消失
  const labelLayers = [
    "place-city", "place-town", "place-suburb", "place-neighbourhood",
    "place-other", "poi-label", "road-label", "road-label-secondary",
    "road-label-primary", "water-label", "settlement-subdivision-label",
  ]
  for (const l of labelLayers) {
    safeSetPaint(m, l, "text-color", "#7FB2FF")
    safeSetPaint(m, l, "text-halo-color", "#050A14")
    safeSetPaint(m, l, "text-halo-width", 1.2)
  }

  // 隐藏行政边界，避免视觉噪音
  for (const l of ["admin-0-boundary", "admin-1-boundary", "admin-0-boundary-disputed"]) {
    safeSetLayout(m, l, "visibility", "none")
  }
}
