// 图层显隐 composable —— ADR#105-121 图层优先级 + P2 默认隐 + 锁定态面板隐藏
import { reactive, watch } from "vue"
import { storage, STORAGE_KEYS } from "@/utils/storage"

export type LayerKey =
  | "baseRaster"
  | "buildings3d"
  | "roadNetwork"
  | "robotPosition"
  | "alertAnchors"
  | "regions"
  | "inspectionPoints"
  | "trajectory"
  | "fovCone"
  | "navPoints"
  | "coverageHeatmap"
  | "workTicketGuard"
  | "patrolAnchors"

export const LAYER_DEFAULTS: Record<LayerKey, { visible: boolean; priority: "P0" | "P1" | "P2" }> = {
  baseRaster: { visible: true, priority: "P0" },
  buildings3d: { visible: true, priority: "P0" },
  roadNetwork: { visible: true, priority: "P0" },
  robotPosition: { visible: true, priority: "P0" },
  alertAnchors: { visible: true, priority: "P0" },
  regions: { visible: true, priority: "P1" },
  inspectionPoints: { visible: true, priority: "P1" },
  trajectory: { visible: true, priority: "P1" },
  fovCone: { visible: true, priority: "P1" },
  navPoints: { visible: false, priority: "P2" },
  coverageHeatmap: { visible: false, priority: "P2" },
  workTicketGuard: { visible: false, priority: "P2" },
  patrolAnchors: { visible: false, priority: "P2" },
}

function loadVisibility(): Record<LayerKey, boolean> {
  const stored = storage.get<Partial<Record<LayerKey, boolean>>>(STORAGE_KEYS.LAYER_VISIBILITY)
  const result = {} as Record<LayerKey, boolean>
  for (const key of Object.keys(LAYER_DEFAULTS) as LayerKey[]) {
    result[key] = stored?.[key] ?? LAYER_DEFAULTS[key].visible
  }
  return result
}

const visibility = reactive<Record<LayerKey, boolean>>(loadVisibility())

watch(visibility, (v) => storage.set(STORAGE_KEYS.LAYER_VISIBILITY, v))

export function useLayers() {
  function toggle(key: LayerKey): void {
    visibility[key] = !visibility[key]
  }
  function set(key: LayerKey, v: boolean): void {
    visibility[key] = v
  }
  function isVisible(key: LayerKey): boolean {
    return visibility[key]
  }
  // P2 图层列表（解锁态可手动开关）
  const p2Layers = (Object.keys(LAYER_DEFAULTS) as LayerKey[]).filter((k) => LAYER_DEFAULTS[k].priority === "P2")
  return { visibility, toggle, set, isVisible, p2Layers }
}
