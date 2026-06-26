// P0 3D Scene Layer —— 园区 3D 建筑发光层 + 霓虹轮廓
// 整改计划第四节：3D buildings extrusion + 发光增强 + 模拟轮廓
// 从 MapStage.setupLayers 抽出，统一管理 3D 场景图层

import type { Map as MbMap } from "mapbox-gl"
import type { useLayers } from "@/composables/useLayers"

type LayersRet = ReturnType<typeof useLayers>

export function use3DLayer() {
  // ③ Mapbox Native 3D Extrusion Buildings（composite source）
  function addCompositeBuildings(m: MbMap): void {
    if (!m.getSource("composite")) return
    if (m.getLayer("layer-composite-3d-buildings")) return
    ;(m as any).addLayer({
      id: "layer-composite-3d-buildings",
      source: "composite",
      "source-layer": "building",
      type: "fill-extrusion",
      paint: {
        "fill-extrusion-color": "#1A2A3A",
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "min_height"],
        "fill-extrusion-opacity": 0.78,
        "fill-extrusion-emissive-strength": 0.45,
      },
    })
  }

  // ④ Mock Custom 3D 建筑物发光层 + ④b 双层霓虹轮廓
  function addMockBuildings(m: MbMap, sourceId: string, layers: LayersRet): void {
    if (m.getLayer("layer-buildings3d")) return
    ;(m as any).addLayer({
      id: "layer-buildings3d", type: "fill-extrusion", source: sourceId,
      layout: { visibility: layers.isVisible("buildings3d") ? "visible" : "none" },
      paint: {
        "fill-extrusion-color": "#132238",
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.82,
        "fill-extrusion-emissive-strength": 0.6,
      },
    })
    ;(m as any).addLayer({
      id: "layer-buildingsOutline", type: "line", source: sourceId,
      layout: { visibility: "visible" },
      paint: { "line-color": "#00F5FF", "line-width": 1.8, "line-opacity": 0.7, "line-blur": 2.5 },
    })
    ;(m as any).addLayer({
      id: "layer-buildingsOutlineCore", type: "line", source: sourceId,
      layout: { visibility: "visible" },
      paint: { "line-color": "#7FE9FF", "line-width": 0.6, "line-opacity": 0.95, "line-blur": 0 },
    })
  }

  // 园区区域呼吸光栅（fill + outline）
  function addRegions(m: MbMap, sourceId: string): void {
    if (m.getLayer("layer-regions-fill")) return
    ;(m as any).addLayer({
      id: "layer-regions-fill", type: "fill", source: sourceId,
      layout: { visibility: "visible" },
      paint: { "fill-color": ["get", "color"], "fill-opacity": 0.05 },
    })
    ;(m as any).addLayer({
      id: "layer-regions-outline", type: "line", source: sourceId,
      layout: { visibility: "visible" },
      paint: { "line-color": ["get", "color"], "line-width": 1.5, "line-opacity": 0.45, "line-blur": 1 },
    })
  }

  // 青蓝方向光，照亮 3D 建筑墙面
  function applyLight(m: MbMap): void {
    ;(m as any).setLight({ anchor: "map", color: "#00E5FF", intensity: 0.45, position: [1.15, 90, 42] })
  }

  return { addCompositeBuildings, addMockBuildings, addRegions, applyLight }
}
