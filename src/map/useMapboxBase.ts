// P0 Mapbox Base —— 地图初始化薄封装（整改计划第七节拆分）
// 原 useMapbox 逻辑保留在 @/composables/useMapbox，这里 re-export 作为 /map 入口
// 视觉相关（fog/style/colors）已抽到 useMapStyle，渲染层抽到 use3DLayer/useAssetLayer 等

export { useMapbox as useMapboxBase } from "@/composables/useMapbox"
export type { UseMapboxOptions } from "@/composables/useMapbox"
