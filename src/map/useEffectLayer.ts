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

// 区域扫描扩散圆心（整改计划第六节"区域扫描扩散"）—— 多点位周期性扩散环
const SCAN_CENTERS: { position: [number, number]; color: [number, number, number] }[] = [
  { position: [121.4740, 31.2304], color: [0, 245, 255] },
  { position: [121.4755, 31.2300], color: [0, 229, 255] },
  { position: [121.4735, 31.2298], color: [124, 92, 255] },
]

// 设备状态传播点（整改计划第六节"设备状态传播效果"）—— 设备节点 + 脉冲传播
const DEVICE_NODES: { position: [number, number]; color: [number, number, number]; status: number }[] = [
  { position: [121.4768, 31.2295], color: [239, 68, 68], status: 0 },    // danger
  { position: [121.4745, 31.2308], color: [16, 185, 129], status: 1 },   // normal
  { position: [121.4760, 31.2315], color: [59, 130, 246], status: 1 },   // normal
  { position: [121.4730, 31.2301], color: [245, 158, 11], status: 2 },   // warn
  { position: [121.4765, 31.2305], color: [197, 168, 123], status: 1 },  // dock normal
]

// 任务流仿真（整改计划第二节 Digital Twin Layer "task flow simulation"）
// 机器人→任务目标的流光连线，模拟任务派发与执行流向
const TASK_FLOWS: { from: [number, number]; to: [number, number]; color: [number, number, number] }[] = [
  { from: [121.4738, 31.2312], to: [121.4745, 31.2308], color: [16, 185, 129] },   // 北区机器人→车间05
  { from: [121.4750, 31.2303], to: [121.4768, 31.2295], color: [245, 158, 11] },   // 东区机器人→设备区08
  { from: [121.4728, 31.2301], to: [121.4730, 31.2301], color: [239, 68, 68] },    // 西区机器人→储罐区07
  { from: [121.4765, 31.2305], to: [121.4742, 31.2310], color: [0, 245, 255] },    // 充电站A→巡检点01
]

// AI 异常预测点位（整改计划第二节 Digital Twin Layer "AI anomaly prediction"）
// 预测高风险区域，用脉动红环 + 中心警示标记表达 AI 预测的潜在异常
const AI_PREDICTIONS: { position: [number, number]; severity: number }[] = [
  { position: [121.4768, 31.2295], severity: 0.9 },   // 设备区08 高风险预测
  { position: [121.4730, 31.2301], severity: 0.6 },   // 储罐区07 中风险预测
  { position: [121.4748, 31.2298], severity: 0.45 },  // 巡检点03 中低风险预测
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
    // 区域扫描扩散（整改计划第六节"区域扫描扩散"）—— 周期性扩散环，半径随 phase 脉动
    new ScatterplotLayer({
      id: "deck-scan-spread",
      data: SCAN_CENTERS,
      getPosition: (d: any) => d.position,
      getRadius: () => 40 + Math.sin(phase * Math.PI * 2) * 35,
      radiusUnits: "meters",
      radiusMinPixels: 20,
      radiusMaxPixels: 120,
      getFillColor: (d: any) => [d.color[0], d.color[1], d.color[2], 18],
      stroked: true,
      getLineColor: (d: any) => [d.color[0], d.color[1], d.color[2], 160],
      getLineWidth: 1.5,
      lineWidthUnits: "pixels",
      parameters: { depthTest: false },
      pickable: false,
    }),
    // 设备状态传播效果（整改计划第六节"设备状态传播效果"）—— 设备节点 + 脉冲传播
    new ScatterplotLayer({
      id: "deck-device-pulse",
      data: DEVICE_NODES,
      getPosition: (d: any) => d.position,
      getRadius: (d: any) => d.status === 0 ? 50 + Math.sin(phase * Math.PI * 4) * 20 : 30,
      radiusUnits: "meters",
      radiusMinPixels: 8,
      radiusMaxPixels: 60,
      getFillColor: (d: any) => [d.color[0], d.color[1], d.color[2], d.status === 0 ? 50 : 30],
      stroked: true,
      getLineColor: (d: any) => [d.color[0], d.color[1], d.color[2], 220],
      getLineWidth: (d: any) => d.status === 0 ? 2.5 : 1,
      lineWidthUnits: "pixels",
      parameters: { depthTest: false },
      pickable: false,
    }),
    // 任务流仿真（整改计划第二节 Digital Twin Layer "task flow simulation"）
    // 机器人→任务目标流光连线，沿 phase 流动表达任务派发流向
    new PathLayer({
      id: "deck-task-flow",
      data: TASK_FLOWS.map((t) => ({ path: [t.from, t.to], color: t.color })),
      getPath: (d: any) => d.path,
      getColor: (d: any) => [d.color[0], d.color[1], d.color[2], 80 + Math.sin(phase * Math.PI * 2) * 60],
      getWidth: 4,
      widthUnits: "pixels",
      widthMinPixels: 2,
      widthMaxPixels: 8,
      jointRounded: true,
      capRounded: true,
      parameters: { depthTest: false },
      pickable: false,
    }),
    // 任务流光头（沿 from→to 流动的派发标记）
    new ScatterplotLayer({
      id: "deck-task-flow-head",
      data: TASK_FLOWS.map((t) => {
        const p = phase
        return {
          position: [t.from[0] + (t.to[0] - t.from[0]) * p, t.from[1] + (t.to[1] - t.from[1]) * p],
          color: t.color,
        }
      }),
      getPosition: (d: any) => d.position,
      getRadius: 12,
      radiusUnits: "pixels",
      getFillColor: (d: any) => [d.color[0], d.color[1], d.color[2], 240],
      stroked: true,
      getLineColor: [255, 255, 255, 220],
      getLineWidth: 1.5,
      lineWidthUnits: "pixels",
      parameters: { depthTest: false },
      pickable: false,
    }),
    // AI 异常预测（整改计划第二节 Digital Twin Layer "AI anomaly prediction"）
    // 预测高风险区域，脉动红环 + severity 决定半径/透明度
    new ScatterplotLayer({
      id: "deck-ai-prediction",
      data: AI_PREDICTIONS,
      getPosition: (d: any) => d.position,
      getRadius: (d: any) => 30 + d.severity * 40 + Math.sin(phase * Math.PI * 3) * 8,
      radiusUnits: "meters",
      radiusMinPixels: 15,
      radiusMaxPixels: 80,
      getFillColor: (d: any) => [239, 68, 68, 15 + d.severity * 25],
      stroked: true,
      getLineColor: (d: any) => [239, 68, 68, 120 + d.severity * 100],
      getLineWidth: (d: any) => 1 + d.severity * 2,
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
