// P1 Robot Layer —— 机器人 HTML marker（radar-ripple / radar-sweep / scan-wave / 状态色）
// 整改计划第五节：机器人状态 → 动态光点 + 扫描波纹
// 从 MapStage 抽出机器人 marker 渲染逻辑

import mapboxgl from "mapbox-gl"
import type { Robot } from "@/types/robot"

export interface RobotLayerCtx {
  robots: () => Robot[]
  selectedId: () => string | null
  onFocus: (id: string) => void
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

export function useRobotLayer(ctx: RobotLayerCtx) {
  const markersMap = new Map<string, mapboxgl.Marker>()

  function update(m: mapboxgl.Map): void {
    ctx.robots().forEach((robot) => {
      let marker = markersMap.get(robot.id)
      const isSel = ctx.selectedId() === robot.id
      if (!marker) {
        const el = document.createElement("div")
        el.className = `robot-marker status-${robot.status} ${isSel ? "selected" : ""}`
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
          ctx.onFocus(robot.id)
        })
        marker = new mapboxgl.Marker({ element: el })
          .setLngLat([robot.position.longitude, robot.position.latitude])
          .addTo(m as any)
        markersMap.set(robot.id, marker)
      } else {
        marker.setLngLat([robot.position.longitude, robot.position.latitude])
        const el = marker.getElement()
        el.className = `robot-marker status-${robot.status} ${isSel ? "selected" : ""}`
        const labelStatus = el.querySelector(".label-status")
        if (labelStatus) labelStatus.textContent = getStatusText(robot.status)
      }
    })
    // Remove stale markers
    for (const id of markersMap.keys()) {
      if (!ctx.robots().some((r) => r.id === id)) {
        markersMap.get(id)?.remove()
        markersMap.delete(id)
      }
    }
  }

  function clear(): void {
    markersMap.forEach((m) => m.remove())
    markersMap.clear()
  }

  return { update, clear }
}
