// Mapbox 初始化 composable —— ADR#22 Mapbox GL JS 单引擎
// token/style 走 env；mock 阶段用公共 token，真实环境换内网瓦片

import mapboxgl from "mapbox-gl"
import { ref, onUnmounted, getCurrentInstance } from "vue"
import { applySciFiColors } from "@/map/useMapStyle"

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
    // P0: dark-v11 IOC 数字孪生底图（与 .env.example 默认值一致）
    const style = useCartoFallback
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : (import.meta.env.VITE_MAPBOX_STYLE || "mapbox://styles/mapbox/dark-v11")
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
      // standard style 专用配置（dark-v11 不走这条路）
      if (style.includes("standard")) {
        try {
          (instance as any).setConfigProperty("basemap", "theme", "monochrome");
          (instance as any).setConfigProperty("basemap", "lightPreset", "night");
        } catch (e) {
          console.warn("Failed to set standard style config:", e);
        }
      }
      // P0 雾效 —— IOC 数字孪生宇宙感质变点
      try {
        (instance as any).setFog({
          color: "rgb(5,10,20)",
          "high-color": "rgb(8,16,32)",
          "horizon-blend": 0.1,
          "space-color": "rgb(0,0,0)",
          "star-intensity": 0.35,
          range: [1, 12],
        })
      } catch (e) {
        console.warn("Failed to set fog:", e)
      }
      // P0 色系规范 —— 注入道路/水体/绿地/建筑霓虹色
      try {
        applySciFiColors(instance)
      } catch (e) {
        console.warn("Failed to apply sci-fi colors:", e)
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
