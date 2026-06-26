<script setup lang="ts">
// MapStage —— 数字孪生指挥大屏核心地图
// 3D 建筑发光 + 机器人扫描波纹 + 巡检轨迹流光 + 全息蓝光轮廓

import { ref, onMounted, onUnmounted, watch } from "vue"
import mapboxgl from "mapbox-gl"
import { useMapbox } from "@/composables/useMapbox"
import { useLayers } from "@/composables/useLayers"
import { getMockDataService } from "@/composables/useMockDataService"
import { useSelectedRobot } from "@/composables/useSelectedRobot"
import { useDashboard } from "@/composables/useDashboard"
import { computeFovCone } from "@/utils/fovGeometry"
import { alertColor, alertSize, shouldFlash } from "@/utils/alertSymbol"
import { AlertStatus } from "@/types/alert"
import { useAssetLayer } from "@/map/useAssetLayer"
import { useDeckOverlay } from "@/map/useEffectLayer"
// 整改计划第七节拆分：/map composables 已抽出（useMapStyle/use3DLayer/useRobotLayer/useAlarmLayer/useAssetLayer/useEffectLayer/useMapboxBase）
// MapStage 暂保留内联渲染逻辑以避免大范围重写引入回归，composable 作为可复用模块供后续渐进迁移

const containerRef = ref<HTMLDivElement | null>(null)
const { map, ready, init, destroy } = useMapbox()
const { visibility, isVisible } = useLayers()
const { state } = getMockDataService()
const { selectedRobot } = useSelectedRobot()
const dash = useDashboard()
const { assetsGeoJSON } = useAssetLayer()
const deck = useDeckOverlay()

// Track HTML Markers for robots / docks / ap / inspection points / alerts
const markersMap = new Map<string, mapboxgl.Marker>()
const dockMarkersMap = new Map<string, mapboxgl.Marker>()
const apMarkersMap = new Map<string, mapboxgl.Marker>()
const ipMarkersMap = new Map<string, mapboxgl.Marker>()
const alertMarkersMap = new Map<string, mapboxgl.Marker>()

// === GeoJSON 生成 ===
function alertsGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: state.alerts.map((a) => {
      const robot = state.robots.find((r) => r.id === a.robotId)
      return {
        type: "Feature" as const,
        properties: {
          id: a.id, severity: a.severity, status: a.status,
          color: alertColor(a), size: alertSize(a), flash: shouldFlash(a),
          title: a.title, robotName: robot?.name ?? "",
        },
        geometry: {
          type: "Point" as const,
          coordinates: robot ? [robot.position.longitude, robot.position.latitude] : [0, 0],
        },
      }
    }),
  }
}

function buildingsGeoJSON(): GeoJSON.FeatureCollection {
  const m = state.maps[0]
  return m?.buildings ?? { type: "FeatureCollection", features: [] }
}

// 园区区域多边形
function regionsGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "region-n", name: "北区", color: "#00E5FF" },
        geometry: {
          type: "Polygon",
          coordinates: [[[121.4728, 31.2305], [121.4752, 31.2305], [121.4752, 31.2322], [121.4728, 31.2322], [121.4728, 31.2305]]]
        }
      },
      {
        type: "Feature",
        properties: { id: "region-e", name: "东区", color: "#3B82F6" },
        geometry: {
          type: "Polygon",
          coordinates: [[[121.4745, 31.2290], [121.4768, 31.2290], [121.4768, 31.2305], [121.4745, 31.2305], [121.4745, 31.2290]]]
        }
      },
      {
        type: "Feature",
        properties: { id: "region-w", name: "西区", color: "#F59E0B" },
        geometry: {
          type: "Polygon",
          coordinates: [[[121.4712, 31.2292], [121.4735, 31.2292], [121.4735, 31.2305], [121.4712, 31.2305], [121.4712, 31.2292]]]
        }
      },
      {
        type: "Feature",
        properties: { id: "region-s", name: "南区", color: "#8B5CF6" },
        geometry: {
          type: "Polygon",
          coordinates: [[[121.4730, 31.2275], [121.4752, 31.2275], [121.4752, 31.2295], [121.4730, 31.2295], [121.4730, 31.2275]]]
        }
      },
      {
        type: "Feature",
        properties: { id: "region-forbid", name: "禁行区X", color: "#EF4444" },
        geometry: {
          type: "Polygon",
          coordinates: [[[121.4735, 31.2305], [121.4743, 31.2305], [121.4743, 31.2312], [121.4735, 31.2312], [121.4735, 31.2305]]]
        }
      }
    ]
  }
}

// 巡检轨迹：每机器人一条闭合路径（mock 巡检路线）
function patrolRoutesGeoJSON(): GeoJSON.FeatureCollection {
  const routes: GeoJSON.Feature[] = []
  const routeDefs = [
    { id: "robot-north-1", color: "#10B981", pts: [[121.4738, 31.2312], [121.4745, 31.2312], [121.4745, 31.2305], [121.4738, 31.2305], [121.4738, 31.2312]] },
    { id: "robot-east-1", color: "#F59E0B", pts: [[121.4750, 31.2303], [121.4758, 31.2303], [121.4758, 31.2296], [121.4750, 31.2296], [121.4750, 31.2303]] },
    { id: "robot-west-1", color: "#EF4444", pts: [[121.4728, 31.2301], [121.4735, 31.2301], [121.4735, 31.2294], [121.4728, 31.2294], [121.4728, 31.2301]] },
  ]
  for (const r of routeDefs) {
    routes.push({
      type: "Feature" as const,
      properties: { id: r.id, color: r.color },
      geometry: { type: "LineString" as const, coordinates: r.pts as [number, number][] },
    })
  }
  return { type: "FeatureCollection", features: routes }
}

function fovGeoJSON(): GeoJSON.FeatureCollection {
  if (!selectedRobot.value) return { type: "FeatureCollection", features: [] }
  const cone = computeFovCone({
    longitude: selectedRobot.value.position.longitude,
    latitude: selectedRobot.value.position.latitude,
    yaw: selectedRobot.value.position.yaw,
    fovDeg: 60, rangeMeter: 30,
  })
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature" as const, properties: {},
      geometry: { type: "Polygon" as const, coordinates: [cone.coordinates] },
    }],
  }
}

// P1 机器人动态光点 GeoJSON —— 整改计划第五节 robot pulse 升级方案
// 用 Mapbox circle layer 的 zoom 感知 circle-radius（6→14），配合 HTML marker 共存
function robotsGeoJSON(): GeoJSON.FeatureCollection {
  const statusColor: Record<string, string> = {
    patrolling: "#10B981", online: "#3B82F6", returning: "#F59E0B",
    charging: "#60A5FA", error: "#EF4444", paused: "#94A3B8", offline: "#475569",
  }
  return {
    type: "FeatureCollection",
    features: state.robots.map((r) => ({
      type: "Feature" as const,
      properties: {
        id: r.id, name: r.name, status: r.status,
        color: statusColor[r.status] ?? "#00F5FF",
        selected: selectedRobot.value?.id === r.id,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [r.position.longitude, r.position.latitude],
      },
    })),
  }
}

const SOURCE_IDS = {
  alerts: "dd-alerts", buildings: "dd-buildings",
  routes: "dd-routes", points: "dd-points", fov: "dd-fov",
  regions: "dd-regions", robots: "dd-robots",
} as const

function addSource(id: string, data: GeoJSON.GeoJSON): void {
  const m = map.value!
  const src = m.getSource(id)
  if (src && "setData" in src) {
    (src as mapboxgl.GeoJSONSource).setData(data)
  } else {
    const options: any = { type: "geojson", data }
    if (id === SOURCE_IDS.routes) {
      options.lineMetrics = true // Required for line gradients
    }
    m.addSource(id, options)
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case "patrolling": return "运行中"
    case "online": return "待命"
    case "returning": return "返充"
    case "error": return "故障"
    case "charging": return "充电中"
    case "paused": return "暂停"
    case "offline": return "离线"
    default: return status
  }
}

// Update HTML markers dynamically
function updateRobotMarkers() {
  const m = map.value
  if (!m) return
  state.robots.forEach((robot) => {
    let marker = markersMap.get(robot.id)
    const isSel = selectedRobot.value?.id === robot.id
    if (!marker) {
      const el = document.createElement("div")
      el.className = `robot-marker status-${robot.status} ${isSel ? 'selected' : ''}`
      el.innerHTML = `
        <div class="scan-wave"></div>
        <div class="scan-wave delay-1"></div>
        <div class="radar-ripple"></div>
        <div class="radar-ripple delay-1"></div>
        <div class="radar-ripple delay-2"></div>
        <div class="radar-sweep"></div>
        <div class="marker-core">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
            <circle cx="12" cy="5" r="2"></circle>
            <path d="M12 7v4"></path>
            <line x1="8" y1="16" x2="8" y2="16"></line>
            <line x1="16" y1="16" x2="16" y2="16"></line>
          </svg>
        </div>
        <div class="marker-label">
          <span class="label-name">${robot.name}</span>
          <span class="label-status">${getStatusText(robot.status)}</span>
        </div>
      `
      el.addEventListener("click", (e) => {
        e.stopPropagation()
        dash.setFocus("robot", robot.id)
      })
      marker = new mapboxgl.Marker({ element: el })
        .setLngLat([robot.position.longitude, robot.position.latitude])
        .addTo(m as any)
      markersMap.set(robot.id, marker)
    } else {
      marker.setLngLat([robot.position.longitude, robot.position.latitude])
      const el = marker.getElement()
      el.className = `robot-marker status-${robot.status} ${isSel ? 'selected' : ''}`
      const labelStatus = el.querySelector(".label-status")
      if (labelStatus) labelStatus.textContent = getStatusText(robot.status)
    }
  })

  // Remove stale markers
  for (const id of markersMap.keys()) {
    if (!state.robots.some(r => r.id === id)) {
      markersMap.get(id)?.remove()
      markersMap.delete(id)
    }
  }
}

// === 充电站/AP/巡检点/告警 HTML 标记 ===
function updateDockMarkers(): void {
  const m = map.value
  if (!m) return
  dash.docks.value.forEach((d) => {
    let marker = dockMarkersMap.get(d.id)
    if (!marker) {
      const el = document.createElement("div")
      el.className = "dock-marker"
      el.innerHTML = `<div class="dock-icon">⚡</div><div class="dock-label">${d.name}</div>`
      el.addEventListener("click", (e) => { e.stopPropagation(); dash.setFocus("dock", d.id) })
      marker = new mapboxgl.Marker({ element: el }).setLngLat(d.coords).addTo(m as any)
      dockMarkersMap.set(d.id, marker)
    }
  })
  for (const id of dockMarkersMap.keys()) {
    if (!dash.docks.value.some(d => d.id === id)) { dockMarkersMap.get(id)?.remove(); dockMarkersMap.delete(id) }
  }
}

function updateApMarkers(): void {
  const m = map.value
  if (!m) return
  dash.apDevices.value.forEach((a) => {
    let marker = apMarkersMap.get(a.id)
    if (!marker) {
      const el = document.createElement("div")
      el.className = `ap-marker status-${a.status}`
      el.innerHTML = `<div class="ap-icon">📡</div><div class="ap-label">${a.name}</div>`
      el.addEventListener("click", (e) => { e.stopPropagation(); dash.setFocus("ap", a.id) })
      marker = new mapboxgl.Marker({ element: el }).setLngLat(a.coords).addTo(m as any)
      apMarkersMap.set(a.id, marker)
    }
  })
  for (const id of apMarkersMap.keys()) {
    if (!dash.apDevices.value.some(a => a.id === id)) { apMarkersMap.get(id)?.remove(); apMarkersMap.delete(id) }
  }
}

function updateInspectionPointMarkers(): void {
  const m = map.value
  if (!m) return
  const hierarchy = dash.currentHierarchy.value
  if (!hierarchy) return
  hierarchy.inspectionPoints.forEach((ip) => {
    let marker = ipMarkersMap.get(ip.id)
    const coords = (window as any).__IP_COORDS?.[ip.id] as [number, number] | undefined
    if (!coords) return
    if (!marker) {
      const el = document.createElement("div")
      el.className = `ip-marker status-${ip.status}`
      el.innerHTML = `<div class="ip-dot"></div><div class="ip-label">${ip.name}</div>`
      el.addEventListener("click", (e) => { e.stopPropagation(); dash.setFocus("inspectionPoint", ip.id) })
      marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(m as any)
      ipMarkersMap.set(ip.id, marker)
    }
  })
}

function updateAlertMarkers(): void {
  const m = map.value
  if (!m) return
  dash.alertsExt.value.forEach((a) => {
    let marker = alertMarkersMap.get(a.id)
    if (!marker) {
      const el = document.createElement("div")
      el.className = `alert-marker level-${a.level}`
      el.innerHTML = `<div class="alert-dot"></div>`
      el.addEventListener("click", (e) => { e.stopPropagation(); dash.setFocus("alert", a.id); dash.openAlertDetailModal() })
      marker = new mapboxgl.Marker({ element: el }).setLngLat(a.coords).addTo(m as any)
      alertMarkersMap.set(a.id, marker)
    }
  })
}

// 注入巡检点坐标供 updateInspectionPointMarkers 使用
import { INSPECTION_POINT_COORDS } from "@/mock/seedDashboard"
;(window as any).__IP_COORDS = INSPECTION_POINT_COORDS

// === 图层搭建 ===
function setupLayers(): void {
  const m = map.value!
  const s = SOURCE_IDS

  addSource(s.regions, regionsGeoJSON())
  addSource(s.buildings, buildingsGeoJSON())
  addSource(s.alerts, alertsGeoJSON())
  addSource(s.routes, patrolRoutesGeoJSON())
  addSource(s.points, assetsGeoJSON())
  addSource(s.fov, fovGeoJSON())
  addSource(s.robots, robotsGeoJSON())

  // ② 3D 园区区域呼吸光栅
  m.addLayer({
    id: "layer-regions-fill", type: "fill", source: s.regions,
    layout: { visibility: "visible" },
    paint: {
      "fill-color": ["get", "color"] as never,
      "fill-opacity": 0.05
    }
  } as any)

  m.addLayer({
    id: "layer-regions-outline", type: "line", source: s.regions,
    layout: { visibility: "visible" },
    paint: {
      "line-color": ["get", "color"] as never,
      "line-width": 1.5,
      "line-opacity": 0.45,
      "line-blur": 1
    }
  } as any)

  // ③ Mapbox Native 3D Extrusion Buildings
  if (m.getSource("composite")) {
    m.addLayer({
      id: "layer-composite-3d-buildings",
      source: "composite",
      "source-layer": "building",
      type: "fill-extrusion",
      paint: {
        "fill-extrusion-color": "#1A2A3A",
        "fill-extrusion-height": ["get", "height"] as never,
        "fill-extrusion-base": ["get", "min_height"] as never,
        "fill-extrusion-opacity": 0.78,
        "fill-extrusion-emissive-strength": 0.45,
      }
    } as any)
  }

  // ④ Mock Custom 3D 建筑物发光层（圆柱储罐、主装置等园区模型）
  m.addLayer({
    id: "layer-buildings3d", type: "fill-extrusion", source: s.buildings,
    layout: { visibility: isVisible("buildings3d") ? "visible" : "none" },
    paint: {
      "fill-extrusion-color": "#132238",
      "fill-extrusion-height": ["get", "height"] as never,
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.82,
      "fill-extrusion-emissive-strength": 0.6,
    },
  } as any)

  // ④b 建筑顶部霓虹蓝轮廓（P0 强化：双层 line glow）
  m.addLayer({
    id: "layer-buildingsOutline", type: "line", source: s.buildings,
    layout: { visibility: "visible" },
    paint: { "line-color": "#00F5FF", "line-width": 1.8, "line-opacity": 0.7, "line-blur": 2.5 },
  } as any)
  m.addLayer({
    id: "layer-buildingsOutlineCore", type: "line", source: s.buildings,
    layout: { visibility: "visible" },
    paint: { "line-color": "#7FE9FF", "line-width": 0.6, "line-opacity": 0.95, "line-blur": 0 },
  } as any)

  // ⑤ 巡检轨迹流光（P0 glow line + 头尾双色 gradient，对齐整改计划第五节）
  m.addLayer({
    id: "layer-patrolRoutes", type: "line", source: s.routes,
    layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
    paint: {
      "line-width": 4.5,
      "line-opacity": 0.95,
      "line-blur": 2.5,
      "line-gradient": [
        "interpolate", ["linear"], ["line-progress"],
        0, "#00F5FF",
        0.5, "rgba(59, 130, 246, 0.55)",
        1, "#1E4DFF",
      ] as never,
    },
  } as any)

  // 流光叠加层（动态偏移）
  m.addLayer({
    id: "layer-patrolFlow", type: "line", source: s.routes,
    layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
    paint: {
      "line-color": "#00E5FF", "line-width": 2.5, "line-opacity": 0.8, "line-blur": 0.5,
      "line-dasharray": [0.5, 4],
    },
  } as any)

  // ⑤b 轨迹光头（方向感增强）—— 短高亮 dash 沿轨迹流动，方向感强
  m.addLayer({
    id: "layer-patrolHead", type: "line", source: s.routes,
    layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
    paint: {
      "line-color": "#00F5FF", "line-width": 7, "line-opacity": 0.95, "line-blur": 4,
      "line-dasharray": [0.18, 4.82],
    },
  } as any)

  // ⑥ 告警锚点（分级色 + 闪烁）
  m.addLayer({
    id: "layer-alertAnchors", type: "circle", source: s.alerts,
    layout: { visibility: isVisible("alertAnchors") ? "visible" : "none" },
    paint: {
      "circle-radius": ["get", "size"] as never,
      "circle-color": ["get", "color"] as never,
      "circle-stroke-width": 2,
      "circle-stroke-color": ["case", ["==", ["get", "status"], AlertStatus.ACTIVE], "#fff", "#666"] as never,
      "circle-opacity": ["case", ["==", ["get", "flash"], true], 0.85, 0.5] as never,
      "circle-blur": 1.5,
    },
  } as any)

  // ⑦ Asset 语义层（P1 统一资产抽象：工厂/设备/充电桩/巡检点/安全设施 + 状态发光）
  m.addLayer({
    id: "layer-assetGlow", type: "circle", source: s.points,
    layout: { visibility: "visible" },
    paint: {
      "circle-radius": 11,
      "circle-color": ["get", "statusColor"] as never,
      "circle-opacity": 0.18,
      "circle-blur": 6,
    },
  } as any)
  m.addLayer({
    id: "layer-assetRing", type: "circle", source: s.points,
    layout: { visibility: "visible" },
    paint: {
      "circle-radius": 7,
      "circle-color": ["get", "color"] as never,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": ["get", "statusColor"] as never,
      "circle-stroke-opacity": 0.9,
      "circle-opacity": 0.35,
    },
  } as any)
  m.addLayer({
    id: "layer-assetCore", type: "circle", source: s.points,
    layout: { visibility: "visible" },
    paint: {
      "circle-radius": 3,
      "circle-color": ["get", "statusColor"] as never,
      "circle-stroke-width": 1, "circle-stroke-color": "#FFFFFF", "circle-stroke-opacity": 0.7,
      "circle-opacity": 0.95,
    },
  } as any)

  // ⑧ FOV 视野锥（选中机器人）
  m.addLayer({
    id: "layer-fovCone", type: "fill", source: s.fov,
    layout: { visibility: selectedRobot.value ? "visible" : "none" },
    paint: { "fill-color": "#00E5FF", "fill-opacity": 0.18 },
  } as any)

  // Add direction-oriented cyan-blue lighting to illuminate 3D building walls
  m.setLight({
    anchor: 'map',
    color: '#00E5FF',
    intensity: 0.45,
    position: [1.15, 90, 42]
  })

  // Initialize robot markers
  updateRobotMarkers()
  updateDockMarkers()
  updateApMarkers()
  updateInspectionPointMarkers()
  updateAlertMarkers()

  // 启动流光动画
  startFlowAnimation()

  // P1 robot pulse —— Mapbox circle layer zoom 感知（整改计划第五节 circle-radius 6→14）
  m.addLayer({
    id: "layer-robotPulseGlow", type: "circle", source: s.robots,
    layout: { visibility: "visible" },
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 14, 19, 34] as never,
      "circle-color": ["get", "color"] as never,
      "circle-opacity": 0.18,
      "circle-blur": 8,
    },
  } as any)
  m.addLayer({
    id: "layer-robotPulseCore", type: "circle", source: s.robots,
    layout: { visibility: "visible" },
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 6, 19, 14] as never,
      "circle-color": ["get", "color"] as never,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-opacity": 0.8,
      "circle-opacity": 0.7,
    },
  } as any)

  // P2 deck.gl 数字孪生增强 —— 电影级轨迹动画 + 风险热力
  deck.attach(m)
}

let flowAnimId: number | null = null
let regionOpacityPhase = 0

function startFlowAnimation(): void {
  const m = map.value!
  let offset = 0
  
  function animate() {
    if (!m.getLayer("layer-patrolFlow")) return

    // Animate patrol flow offsets
    offset = (offset + 0.08) % 5
    m.setPaintProperty("layer-patrolFlow", "line-dasharray", [offset, 5 - offset])

    // 光头层 —— 更快流动，短高亮 dash 跑在前面，方向感强
    if (m.getLayer("layer-patrolHead")) {
      const headOffset = (offset * 2.2) % 5
      m.setPaintProperty("layer-patrolHead", "line-dasharray", [headOffset, 5 - headOffset])
    }

    // Animate sector regions breathing opacity
    regionOpacityPhase = (regionOpacityPhase + 0.025) % (Math.PI * 2)
    const breath = (Math.sin(regionOpacityPhase) + 1) / 2 // 0 to 1

    if (m.getLayer("layer-regions-fill")) {
      const normalOpacity = 0.02 + breath * 0.06
      const forbidBreath = (Math.sin(regionOpacityPhase * 2.8) + 1) / 2
      const forbidOpacity = 0.05 + forbidBreath * 0.23

      m.setPaintProperty("layer-regions-fill", "fill-opacity", [
        "case",
        ["==", ["get", "id"], "region-forbid"], forbidOpacity,
        normalOpacity
      ] as any)
    }

    flowAnimId = requestAnimationFrame(animate)
  }
  animate()
}

// 选中机器人 → 刷新 FOV
watch(selectedRobot, () => {
  if (!map.value || !ready.value) return
  addSource(SOURCE_IDS.fov, fovGeoJSON())
  const m = map.value
  if (m.getLayer("layer-fovCone")) {
    m.setLayoutProperty("layer-fovCone", "visibility", selectedRobot.value ? "visible" : "none")
  }
  updateRobotMarkers()
})

// 监听图层显隐变化
watch(visibility, (newVal) => {
  const m = map.value
  if (!m || !ready.value) return
  const layerMapping: Record<string, string[]> = {
    buildings3d: ["layer-buildings3d"],
    alertAnchors: ["layer-alertAnchors"],
    regions: ["layer-regions-fill", "layer-regions-outline"],
  }
  for (const [key, layerIds] of Object.entries(layerMapping)) {
    layerIds.forEach((layerId) => {
      if (m.getLayer(layerId)) {
        m.setLayoutProperty(layerId, "visibility", (newVal as any)[key] ? "visible" : "none")
      }
    })
  }
}, { deep: true })

let dataInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (!containerRef.value) return
  init({ container: containerRef.value })
  map.value!.on("load", () => {
    setupLayers()
    dataInterval = setInterval(() => {
      if (!ready.value || !map.value) return
      addSource(SOURCE_IDS.alerts, alertsGeoJSON())
      addSource(SOURCE_IDS.robots, robotsGeoJSON())
      updateRobotMarkers()
      updateDockMarkers()
      updateApMarkers()
      updateInspectionPointMarkers()
      updateAlertMarkers()
    }, 300)
  })
})

onUnmounted(() => {
  if (flowAnimId) cancelAnimationFrame(flowAnimId)
  if (dataInterval) clearInterval(dataInterval)
  markersMap.forEach((m) => m.remove())
  markersMap.clear()
  dockMarkersMap.forEach((m) => m.remove())
  dockMarkersMap.clear()
  apMarkersMap.forEach((m) => m.remove())
  apMarkersMap.clear()
  ipMarkersMap.forEach((m) => m.remove())
  ipMarkersMap.clear()
  alertMarkersMap.forEach((m) => m.remove())
  alertMarkersMap.clear()
  deck.detach()
  destroy()
})
</script>

<template>
  <div ref="containerRef" class="map-stage" />
</template>

<style scoped>
.map-stage {
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #0a1428 0%, #050810 100%);
}
.map-stage :deep(.mapboxgl-canvas) { outline: none; }

/* HTML Robot Markers with GPU pulse waves and rotating radar sweeps */
.map-stage :deep(.robot-marker) {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* P1 scan wave —— 风险扫描波纹扩散（对齐整改计划第五节 scale 1→5 opacity 0.8→0） */
.map-stage :deep(.scan-wave) {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #00F5FF;
  opacity: 0;
  pointer-events: none;
  animation: scan-wave-pulse 2.6s cubic-bezier(0.1, 0.7, 0.3, 1) infinite;
  box-shadow: 0 0 12px rgba(0, 245, 255, 0.5);
}
.map-stage :deep(.scan-wave.delay-1) {
  animation-delay: 1.3s;
}
@keyframes scan-wave-pulse {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(5); opacity: 0; }
}

.map-stage :deep(.radar-ripple) {
  position: absolute;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1.5px solid #10B981;
  opacity: 0;
  pointer-events: none;
  animation: radar-pulse 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
}

.map-stage :deep(.radar-ripple.delay-1) {
  animation-delay: 0.6s;
}

.map-stage :deep(.radar-ripple.delay-2) {
  animation-delay: 1.2s;
}

/* Radar sweep rotating conic-gradient */
.map-stage :deep(.radar-sweep) {
  position: absolute;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, rgba(16, 185, 129, 0.18) 0deg, rgba(16, 185, 129, 0) 100deg);
  animation: radar-sweep-rotate 4s linear infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes radar-sweep-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Status colors override for ripples & sweeps */
.map-stage :deep(.robot-marker.status-patrolling .radar-ripple) { border-color: #10B981; }
.map-stage :deep(.robot-marker.status-patrolling .radar-sweep) { background: conic-gradient(from 0deg, rgba(16, 185, 129, 0.18) 0deg, rgba(16, 185, 129, 0) 100deg); }
.map-stage :deep(.robot-marker.status-patrolling .scan-wave) { border-color: #10B981; box-shadow: 0 0 12px rgba(16, 185, 129, 0.5); }

.map-stage :deep(.robot-marker.status-online .radar-ripple) { border-color: #3B82F6; }
.map-stage :deep(.robot-marker.status-online .radar-sweep) { background: conic-gradient(from 0deg, rgba(59, 130, 246, 0.18) 0deg, rgba(59, 130, 246, 0) 100deg); }
.map-stage :deep(.robot-marker.status-online .scan-wave) { border-color: #3B82F6; box-shadow: 0 0 12px rgba(59, 130, 246, 0.5); }

.map-stage :deep(.robot-marker.status-returning .radar-ripple) { border-color: #F59E0B; }
.map-stage :deep(.robot-marker.status-returning .radar-sweep) { background: conic-gradient(from 0deg, rgba(245, 158, 11, 0.18) 0deg, rgba(245, 158, 11, 0) 100deg); }
.map-stage :deep(.robot-marker.status-returning .scan-wave) { border-color: #F59E0B; box-shadow: 0 0 12px rgba(245, 158, 11, 0.5); }

.map-stage :deep(.robot-marker.status-charging .radar-ripple) { border-color: #60A5FA; }
.map-stage :deep(.robot-marker.status-charging .radar-sweep) { background: conic-gradient(from 0deg, rgba(96, 165, 250, 0.18) 0deg, rgba(96, 165, 250, 0) 100deg); }
.map-stage :deep(.robot-marker.status-charging .scan-wave) { border-color: #60A5FA; box-shadow: 0 0 12px rgba(96, 165, 250, 0.5); }

.map-stage :deep(.robot-marker.status-error .radar-ripple) { border-color: #EF4444; }
.map-stage :deep(.robot-marker.status-error .radar-sweep) { background: conic-gradient(from 0deg, rgba(239, 68, 68, 0.2) 0deg, rgba(239, 68, 68, 0) 100deg); }
.map-stage :deep(.robot-marker.status-error .scan-wave) { border-color: #EF4444; box-shadow: 0 0 14px rgba(239, 68, 68, 0.7); }

.map-stage :deep(.robot-marker.status-paused .radar-ripple) { border-color: #94A3B8; }
.map-stage :deep(.robot-marker.status-paused .radar-sweep) { background: conic-gradient(from 0deg, rgba(148, 163, 184, 0.1) 0deg, rgba(148, 163, 184, 0) 100deg); }
.map-stage :deep(.robot-marker.status-paused .scan-wave) { border-color: #94A3B8; box-shadow: 0 0 8px rgba(148, 163, 184, 0.3); }

.map-stage :deep(.robot-marker.status-offline .radar-ripple),
.map-stage :deep(.robot-marker.status-offline .radar-sweep),
.map-stage :deep(.robot-marker.status-offline .scan-wave) { display: none; }

@keyframes radar-pulse {
  0% {
    transform: scale(0.5);
    opacity: 0.85;
  }
  100% {
    transform: scale(2.4);
    opacity: 0;
  }
}

.map-stage :deep(.marker-core) {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(8, 14, 26, 0.95);
  border: 2px solid #10B981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10B981;
  z-index: 2;
  transition: all 0.2s ease;
}

.map-stage :deep(.robot-marker.status-patrolling .marker-core) { border-color: #10B981; color: #10B981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }
.map-stage :deep(.robot-marker.status-online .marker-core) { border-color: #3B82F6; color: #3B82F6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
.map-stage :deep(.robot-marker.status-returning .marker-core) { border-color: #F59E0B; color: #F59E0B; box-shadow: 0 0 10px rgba(245, 158, 11, 0.5); }
.map-stage :deep(.robot-marker.status-charging .marker-core) { border-color: #60A5FA; color: #60A5FA; box-shadow: 0 0 10px rgba(96, 165, 250, 0.5); }
.map-stage :deep(.robot-marker.status-error .marker-core) { border-color: #EF4444; color: #EF4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.7); }
.map-stage :deep(.robot-marker.status-paused .marker-core) { border-color: #94A3B8; color: #94A3B8; box-shadow: 0 0 8px rgba(148, 163, 184, 0.3); }
.map-stage :deep(.robot-marker.status-offline .marker-core) { border-color: #475569; color: #475569; box-shadow: none; }

/* Selected State */
.map-stage :deep(.robot-marker.selected .marker-core) {
  transform: scale(1.18);
  border-color: #FFFFFF !important;
  box-shadow: 0 0 14px #00E5FF !important;
}

.map-stage :deep(.marker-label) {
  position: absolute;
  bottom: 32px;
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(8, 14, 26, 0.88);
  border: 1px solid rgba(0, 229, 255, 0.3);
  border-radius: 4px;
  padding: 3px 7px;
  font-size: 11px;
  color: #E2E8F0;
  white-space: nowrap;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  z-index: 3;
  pointer-events: none;
  transition: all 0.2s ease;
}

.map-stage :deep(.robot-marker.selected .marker-label) {
  border-color: #00E5FF;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.4);
}

.map-stage :deep(.label-name) {
  font-weight: 500;
  letter-spacing: 0.5px;
}

.map-stage :deep(.label-status) {
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 9px;
  font-weight: 600;
}

.map-stage :deep(.robot-marker.status-patrolling .label-status) { background: rgba(16, 185, 129, 0.15); color: #10B981; }
.map-stage :deep(.robot-marker.status-online .label-status) { background: rgba(59, 130, 246, 0.15); color: #3B82F6; }
.map-stage :deep(.robot-marker.status-returning .label-status) { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
.map-stage :deep(.robot-marker.status-charging .label-status) { background: rgba(96, 165, 250, 0.15); color: #60A5FA; }
.map-stage :deep(.robot-marker.status-error .label-status) { background: rgba(239, 68, 68, 0.15); color: #EF4444; }
.map-stage :deep(.robot-marker.status-paused .label-status) { background: rgba(148, 163, 184, 0.15); color: #94A3B8; }
.map-stage :deep(.robot-marker.status-offline .label-status) { background: rgba(71, 85, 105, 0.15); color: #94A3B8; }

/* Dock markers */
.map-stage :deep(.dock-marker) {
  display: flex; flex-direction: column; align-items: center; cursor: pointer;
}
.map-stage :deep(.dock-icon) {
  width: 0.28rem; height: 0.28rem; border-radius: 50%;
  background: rgba(197,168,123,0.25); border: 1px solid rgba(197,168,123,0.6);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.14rem; box-shadow: 0 0 0.08rem rgba(197,168,123,0.4);
}
.map-stage :deep(.dock-label) {
  margin-top: 0.02rem; font-size: 0.09rem; color: #C5A87B;
  white-space: nowrap; text-shadow: 0 0 0.04rem rgba(0,0,0,0.8);
}

/* AP markers */
.map-stage :deep(.ap-marker) {
  display: flex; flex-direction: column; align-items: center; cursor: pointer;
}
.map-stage :deep(.ap-icon) {
  width: 0.24rem; height: 0.24rem; border-radius: 50%;
  background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.5);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.12rem;
}
.map-stage :deep(.ap-marker.status-danger .ap-icon) {
  background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.6);
}
.map-stage :deep(.ap-label) {
  margin-top: 0.02rem; font-size: 0.09rem; color: #6B8EAD; white-space: nowrap;
}

/* Inspection point markers */
.map-stage :deep(.ip-marker) {
  display: flex; flex-direction: column; align-items: center; cursor: pointer;
}
.map-stage :deep(.ip-dot) {
  width: 0.12rem; height: 0.12rem; border-radius: 50%;
  background: #10B981; border: 1px solid rgba(16,185,129,0.6);
  box-shadow: 0 0 0.06rem rgba(16,185,129,0.5);
}
.map-stage :deep(.ip-marker.status-warn .ip-dot) { background: #F59E0B; box-shadow: 0 0 0.06rem rgba(245,158,11,0.5); }
.map-stage :deep(.ip-marker.status-danger .ip-dot) { background: #EF4444; box-shadow: 0 0 0.06rem rgba(239,68,68,0.5); }
.map-stage :deep(.ip-marker.status-pending .ip-dot) { background: #475569; box-shadow: none; }
.map-stage :deep(.ip-label) {
  margin-top: 0.02rem; font-size: 0.09rem; color: #94A3B8; white-space: nowrap;
}

/* Alert markers */
.map-stage :deep(.alert-marker) { cursor: pointer; }
.map-stage :deep(.alert-dot) {
  width: 0.14rem; height: 0.14rem; border-radius: 50%;
  background: #EF4444; border: 1px solid rgba(239,68,68,0.6);
  box-shadow: 0 0 0.1rem rgba(239,68,68,0.6);
  animation: alert-pulse 1.5s ease-in-out infinite;
}
.map-stage :deep(.alert-marker.level-warn .alert-dot) {
  background: #F59E0B; box-shadow: 0 0 0.1rem rgba(245,158,11,0.6);
  border-color: rgba(245,158,11,0.6);
}
.map-stage :deep(.alert-marker.level-safe .alert-dot) {
  background: #10B981; box-shadow: 0 0 0.1rem rgba(16,185,129,0.6);
  border-color: rgba(16,185,129,0.6); animation: none;
}
@keyframes alert-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.7; }
}
</style>
