// P0 3D Scene Layer —— infrastructure models（整改计划第二节 3D Scene Layer 第 3 项）
// 园区基础设施 3D 模型：道路网络发光带 + 管线走廊 + 围墙/灯柱等基础设施
// 从 MapStage 抽出，作为 3D Scene Layer 的基础设施语义层
// 注：形参用 any 绕过 mapbox-gl v3 类型深度递归（同 useEffectLayer 处理方式）

// 园区道路网络（发光带 + 路网节点）
const ROAD_NETWORK: { path: [number, number][]; type: string; color: string }[] = [
  // 主干道 —— 双向发光蓝带
  { type: "trunk", color: "#1E4DFF", path: [[121.4728, 31.2300], [121.4772, 31.2300]] },
  { type: "trunk", color: "#1E4DFF", path: [[121.4740, 31.2275], [121.4740, 31.2322]] },
  // 支路 —— 青蓝
  { type: "branch", color: "#00E5FF", path: [[121.4735, 31.2305], [121.4755, 31.2305]] },
  { type: "branch", color: "#00E5FF", path: [[121.4745, 31.2290], [121.4745, 31.2318]] },
  // 巡检专用道 —— 绿
  { type: "patrol", color: "#10B981", path: [[121.4738, 31.2312], [121.4745, 31.2312], [121.4745, 31.2305]] },
  // 服务道 —— 暗灰
  { type: "service", color: "#64748B", path: [[121.4765, 31.2305], [121.4765, 31.2288]] },
]

// 管线走廊（地下/架空管线 3D 走廊）
const PIPELINE: { path: [number, number][]; color: string }[] = [
  { color: "#F59E0B", path: [[121.4730, 31.2301], [121.4768, 31.2295]] },   // 输油管线
  { color: "#06B6D4", path: [[121.4745, 31.2308], [121.4768, 31.2318]] },   // 给排水
  { color: "#8B5CF6", path: [[121.4735, 31.2308], [121.4760, 31.2315]] },   // 电力走廊
]

// 园区围墙轮廓（基础设施边界）
const WALL_OUTLINE: [number, number][] = [
  [121.4725, 31.2272], [121.4775, 31.2272], [121.4775, 31.2325],
  [121.4725, 31.2325], [121.4725, 31.2272],
]

// 灯柱点位（基础设施照明）
const LAMP_POSTS: { position: [number, number] }[] = [
  { position: [121.4730, 31.2300] }, { position: [121.4750, 31.2300] },
  { position: [121.4770, 31.2300] }, { position: [121.4730, 31.2315] },
  { position: [121.4750, 31.2315] }, { position: [121.4770, 31.2315] },
  { position: [121.4730, 31.2285] }, { position: [121.4750, 31.2285] },
]

export function useInfrastructureLayer() {
  function roadsGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: ROAD_NETWORK.map((r) => ({
        type: "Feature" as const,
        properties: { type: r.type, color: r.color },
        geometry: { type: "LineString" as const, coordinates: r.path },
      })),
    }
  }

  function pipelineGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: PIPELINE.map((p) => ({
        type: "Feature" as const,
        properties: { color: p.color },
        geometry: { type: "LineString" as const, coordinates: p.path },
      })),
    }
  }

  function wallGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: [{
        type: "Feature" as const,
        properties: { color: "#475569" },
        geometry: { type: "Polygon" as const, coordinates: [WALL_OUTLINE] },
      }],
    }
  }

  function lampsGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: LAMP_POSTS.map((l, i) => ({
        type: "Feature" as const,
        properties: { id: `lamp-${i}`, color: "#FCD34D" },
        geometry: { type: "Point" as const, coordinates: l.position },
      })),
    }
  }

  // 把基础设施图层叠加到地图（道路发光带 + 管线 + 围墙 + 灯柱）
  function addInfrastructureLayers(m: any): void {
    const src = (id: string, data: GeoJSON.GeoJSON) => {
      if (m.getSource(id)) return
      ;(m as any).addSource(id, { type: "geojson", data })
    }
    src("dd-infra-roads", roadsGeoJSON())
    src("dd-infra-pipeline", pipelineGeoJSON())
    src("dd-infra-wall", wallGeoJSON())
    src("dd-infra-lamps", lampsGeoJSON())

    if (!m.getLayer("layer-infra-roads")) {
      ;(m as any).addLayer({
        id: "layer-infra-roads", type: "line", source: "dd-infra-roads",
        layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
        paint: {
          "line-color": ["get", "color"], "line-width": 6, "line-opacity": 0.6,
          "line-blur": 3, "line-gap-width": 0,
        },
      })
    }
    if (!m.getLayer("layer-infra-roads-core")) {
      ;(m as any).addLayer({
        id: "layer-infra-roads-core", type: "line", source: "dd-infra-roads",
        layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
        paint: { "line-color": "#7FE9FF", "line-width": 1.5, "line-opacity": 0.9, "line-blur": 0 },
      })
    }
    if (!m.getLayer("layer-infra-pipeline")) {
      ;(m as any).addLayer({
        id: "layer-infra-pipeline", type: "line", source: "dd-infra-pipeline",
        layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
        paint: { "line-color": ["get", "color"], "line-width": 2.5, "line-opacity": 0.55, "line-blur": 1.5, "line-dasharray": [2, 1] },
      })
    }
    if (!m.getLayer("layer-infra-wall")) {
      ;(m as any).addLayer({
        id: "layer-infra-wall", type: "line", source: "dd-infra-wall",
        layout: { visibility: "visible" },
        paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.5, "line-blur": 1 },
      })
    }
    if (!m.getLayer("layer-infra-lamps")) {
      ;(m as any).addLayer({
        id: "layer-infra-lamps", type: "circle", source: "dd-infra-lamps",
        layout: { visibility: "visible" },
        paint: { "circle-radius": 4, "circle-color": ["get", "color"], "circle-opacity": 0.9, "circle-blur": 3, "circle-stroke-width": 1, "circle-stroke-color": "#FCD34D", "circle-stroke-opacity": 0.8 },
      })
    }
  }

  return { addInfrastructureLayers, roadsGeoJSON, pipelineGeoJSON, wallGeoJSON, lampsGeoJSON }
}
