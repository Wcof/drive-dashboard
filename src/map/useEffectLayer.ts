// P2 deck.gl 数字孪生增强 —— 电影级轨迹动画 / 风险热力 / 区域扫描
// 整改计划第六节：TripsLayer / PathLayer / ScatterplotLayer
// 通过 MapboxOverlay 把 deck.gl 图层叠加到 Mapbox GL，与原生图层共存

import { MapboxOverlay } from "@deck.gl/mapbox"
import { ScatterplotLayer, PathLayer } from "@deck.gl/layers"

// 巡检轨迹（用于 PathLayer 流光 + ScatterplotLayer 端点）
const TRIPS: { path: [number, number][]; color: [number, number, number]; name: string }[] = [
  {
    name: "北区巡检路线",
    color: [0, 245, 255],
    path: [
      [121.4738, 31.2312], [121.4745, 31.2312], [121.4745, 31.2305],
      [121.4738, 31.2305], [121.4738, 31.2312],
    ],
  },
  {
    name: "东区巡检路线",
    color: [245, 158, 11],
    path: [
      [121.4750, 31.2303], [121.4758, 31.2303], [121.4758, 31.2296],
      [121.4750, 31.2296], [121.4750, 31.2303],
    ],
  },
  {
    name: "西区巡检路线",
    color: [239, 68, 68],
    path: [
      [121.4728, 31.2301], [121.4735, 31.2301], [121.4735, 31.2294],
      [121.4728, 31.2294], [121.4728, 31.2301],
    ],
  },
]

// 风险热力点位（ScatterplotLayer 发光散点）
const RISK_POINTS: { position: [number, number]; color: [number, number, number]; radius: number }[] = [
  { position: [121.4768, 31.2295], color: [239, 68, 68], radius: 60 },
  { position: [121.4730, 31.2301], color: [245, 158, 11], radius: 45 },
  { position: [121.4760, 31.2301], color: [245, 158, 11], radius: 40 },
  { position: [121.4748, 31.2298], color: [245, 158, 11], radius: 35 },
  { position: [121.4745, 31.2308], color: [16, 185, 129], radius: 30 },
]

let overlay: MapboxOverlay | null = null
let phase = 0
let animId: number | null = null

function buildLayers() {
  // 流动相位：沿 path 截取一段做"光头"动画
  phase = (phase + 0.002) % 1

  return [
    // 风险热力发光散点（AI 态势感知热力层）
    new ScatterplotLayer({
      id: "deck-risk-points",
      data: RISK_POINTS,
      getPosition: (d: any) => d.position,
      getRadius: (d: any) => d.radius,
      radiusUnits: "meters",
      radiusMinPixels: 8,
      radiusMaxPixels: 40,
      getFillColor: (d: any) => [d.color[0], d.color[1], d.color[2], 60],
      stroked: true,
      getLineColor: (d: any) => [d.color[0], d.color[1], d.color[2], 220],
      getLineWidth: 2,
      lineWidthUnits: "pixels",
      parameters: { depthTest: false },
      pickable: false,
    }),
    // 巡检轨迹流光路径（电影级发光带）
    new PathLayer({
      id: "deck-patrol-path",
      data: TRIPS,
      getPath: (d: any) => d.path,
      getColor: (d: any) => [d.color[0], d.color[1], d.color[2], 180],
      getWidth: 18,
      widthUnits: "pixels",
      widthMinPixels: 6,
      widthMaxPixels: 22,
      jointRounded: true,
      capRounded: true,
      parameters: { depthTest: false },
      pickable: false,
    }),
    // 轨迹光头（沿 path 流动的高亮端点）
    new ScatterplotLayer({
      id: "deck-path-head",
      data: TRIPS.map((t) => {
        const idx = Math.floor(phase * t.path.length)
        return { position: t.path[Math.min(idx, t.path.length - 1)], color: t.color }
      }),
      getPosition: (d: any) => d.position,
      getRadius: 25,
      radiusUnits: "pixels",
      getFillColor: (d: any) => [d.color[0], d.color[1], d.color[2], 220],
      stroked: true,
      getLineColor: [255, 255, 255, 200],
      getLineWidth: 2,
      lineWidthUnits: "pixels",
      parameters: { depthTest: false },
      pickable: false,
    }),
  ]
}

export function useDeckOverlay() {
  // deck.gl @deck.gl/mapbox 类型针对 mapbox-gl v2，v3 引擎类型不兼容（深度递归），运行时 OK，用 any 绕过 tsc
  function attach(m: any): void {
    if (overlay) return
    overlay = new MapboxOverlay({ interleaved: true, layers: buildLayers() })
    m.addControl(overlay)

    // 流光动画循环
    function tick() {
      if (!overlay) return
      overlay.setProps({ layers: buildLayers() })
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
  }

  function detach(): void {
    if (animId) { cancelAnimationFrame(animId); animId = null }
    overlay = null
  }

  return { attach, detach }
}
