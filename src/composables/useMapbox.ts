// Mapbox 初始化 composable —— ADR#22 Mapbox GL JS 单引擎
// token/style 走 env；mock 阶段用公共 token，真实环境换内网瓦片

import mapboxgl from "mapbox-gl"
import { ref, onUnmounted, getCurrentInstance } from "vue"

export interface UseMapboxOptions {
  container: HTMLElement
  center?: [number, number]
  zoom?: number
}

const map = ref<mapboxgl.Map | null>(null)
const ready = ref(false)

export function useMapbox() {

  function init(opts: UseMapboxOptions): mapboxgl.Map {
    const token = import.meta.env.VITE_MAPBOX_TOKEN || ""
    // 无 token 时回退到 CartoDB 免费暗色瓦片
    const useCartoFallback = !token
    const style = useCartoFallback
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : (import.meta.env.VITE_MAPBOX_STYLE || "mapbox://styles/mapbox/standard")
    // mapbox-gl v3 强制要求 token，CartoDB 回退时用占位值绕过校验
    mapboxgl.accessToken = useCartoFallback ? "no-token-needed-for-carto" : token

    const instance = new mapboxgl.Map({
      container: opts.container,
      style,
      center: opts.center ?? [121.4740, 31.2300],
      zoom: opts.zoom ?? 15.5,
      pitch: 60,
      bearing: -15,
      antialias: true,
      maxZoom: 19,
      minZoom: 14,
    })

    instance.on("style.load", () => {
      instance.setPitch(60)
      instance.setBearing(-15)
      if (style.includes("standard")) {
        try {
          (instance as any).setConfigProperty("basemap", "theme", "monochrome");
          (instance as any).setConfigProperty("basemap", "lightPreset", "night");
        } catch (e) {
          console.warn("Failed to set standard style config:", e);
        }
      }
    })

    instance.on("load", () => {
      ready.value = true
    })

    map.value = instance
    return instance
  }

  function destroy(): void {
    if (map.value) {
      map.value.remove()
      map.value = null
      ready.value = false
    }
  }

  if (getCurrentInstance()) onUnmounted(() => destroy())

  return { map, ready, init, destroy }
}
