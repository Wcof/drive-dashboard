// P0/P1 Alarm Layer —— 告警锚点 circle layer（分级色 + 闪烁）+ HTML 告警 marker
// 整改计划：告警系统，从 MapStage 抽出

import mapboxgl from "mapbox-gl"
import { alertColor, alertSize, shouldFlash } from "@/utils/alertSymbol"
import { AlertStatus } from "@/types/alert"

export interface AlarmLayerCtx {
  alerts: () => any[]
  robots: () => any[]
  isVisible: (key: string) => boolean
  onFocus: (id: string) => void
  onOpenDetail: () => void
}

export function useAlarmLayer(ctx: AlarmLayerCtx) {
  const alertMarkersMap = new Map<string, mapboxgl.Marker>()

  function alertsGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: ctx.alerts().map((a) => {
        const robot = ctx.robots().find((r) => r.id === a.robotId)
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

  // ⑥ 告警锚点 circle layer
  function addAlertLayer(m: mapboxgl.Map, sourceId: string): void {
    if (m.getLayer("layer-alertAnchors")) return
    ;(m as any).addLayer({
      id: "layer-alertAnchors", type: "circle", source: sourceId,
      layout: { visibility: ctx.isVisible("alertAnchors") ? "visible" : "none" },
      paint: {
        "circle-radius": ["get", "size"],
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2,
        "circle-stroke-color": ["case", ["==", ["get", "status"], AlertStatus.ACTIVE], "#fff", "#666"],
        "circle-opacity": ["case", ["==", ["get", "flash"], true], 0.85, 0.5],
        "circle-blur": 1.5,
      },
    })
  }

  // HTML 告警 marker（点击进告警详情）
  function updateMarkers(m: mapboxgl.Map, alertsExt: any[]): void {
    alertsExt.forEach((a) => {
      let marker = alertMarkersMap.get(a.id)
      if (!marker) {
        const el = document.createElement("div")
        el.className = `alert-marker level-${a.level}`
        el.innerHTML = `<div class="alert-dot"></div>`
        el.addEventListener("click", (e) => {
          e.stopPropagation()
          ctx.onFocus(a.id)
          ctx.onOpenDetail()
        })
        marker = new mapboxgl.Marker({ element: el }).setLngLat(a.coords).addTo(m as any)
        alertMarkersMap.set(a.id, marker)
      }
    })
  }

  function clear(): void {
    alertMarkersMap.forEach((m) => m.remove())
    alertMarkersMap.clear()
  }

  return { alertsGeoJSON, addAlertLayer, updateMarkers, clear }
}
