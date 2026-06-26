// P1 Asset 语义层 —— 数字孪生统一资产抽象（整改计划第四节"业务资产建模"）
// 把 工厂/设备/充电桩/巡检点/安全设施 统一为 Asset 概念，带 category/status/glow 状态
// MapStage 通过 useAssetLayer() 拿 GeoJSON + 图层 paint 配置，统一渲染

export type AssetCategory =
  | "factory"      // 工厂
  | "equipment"    // 设备
  | "dock"         // 充电桩
  | "inspection"   // 巡检点
  | "safety"       // 安全设施
  | "tank"         // 储罐
  | "office"       // 办公楼
  | "logistics"    // 物流
  | "water"        // 污水处理
  | "park"         // 停车
  | "gate"         // 门禁

export interface AssetFeature {
  id: string
  name: string
  category: AssetCategory
  lng: number
  lat: number
  status: "normal" | "warn" | "danger" | "offline"
}

// 资产分类配色（霓虹 IOC 风格，对齐整改计划色系）
export const ASSET_CATEGORY_COLOR: Record<AssetCategory, string> = {
  factory: "#6B8EAD",
  equipment: "#8B5CF6",
  dock: "#C5A87B",
  inspection: "#10B981",
  safety: "#EF4444",
  tank: "#F59E0B",
  office: "#3B82F6",
  logistics: "#94A3B8",
  water: "#06B6D4",
  park: "#64748B",
  gate: "#10B981",
}

// 资产分类图标（用于符号层 symbol-layout，这里给出 emoji 占位，MapStage 可换 SVG）
export const ASSET_CATEGORY_ICON: Record<AssetCategory, string> = {
  factory: "🏭",
  equipment: "⚙",
  dock: "⚡",
  inspection: "📍",
  safety: "🛡",
  tank: "oil",
  office: "🏢",
  logistics: "🚚",
  water: "💧",
  park: "🅿",
  gate: "🚪",
}

// mock 资产点位（园区数字孪生资产清单）
const ASSET_SEED: AssetFeature[] = [
  { id: "asset-gate-01", name: "门禁01", category: "gate", lng: 121.4740, lat: 31.2295, status: "normal" },
  { id: "asset-office-a", name: "办公楼A", category: "office", lng: 121.4760, lat: 31.2315, status: "normal" },
  { id: "asset-office-b", name: "办公楼B", category: "office", lng: 121.4760, lat: 31.2308, status: "normal" },
  { id: "asset-office-c", name: "办公楼C", category: "office", lng: 121.4760, lat: 31.2301, status: "warn" },
  { id: "asset-plant-05", name: "生产车间05", category: "factory", lng: 121.4745, lat: 31.2308, status: "normal" },
  { id: "asset-plant-06", name: "生产车间06", category: "factory", lng: 121.4745, lat: 31.2300, status: "normal" },
  { id: "asset-tank-07", name: "储罐区07", category: "tank", lng: 121.4730, lat: 31.2301, status: "warn" },
  { id: "asset-equip-08", name: "设备区08", category: "equipment", lng: 121.4768, lat: 31.2295, status: "danger" },
  { id: "asset-water-09", name: "污水处理09", category: "water", lng: 121.4768, lat: 31.2318, status: "normal" },
  { id: "asset-plant-10", name: "综合厂房10", category: "factory", lng: 121.4755, lat: 31.2318, status: "normal" },
  { id: "asset-tank-11", name: "储罐区11", category: "tank", lng: 121.4732, lat: 31.2290, status: "normal" },
  { id: "asset-logistics-12", name: "物流装卸12", category: "logistics", lng: 121.4765, lat: 31.2288, status: "normal" },
  { id: "asset-safety-13", name: "消防站13", category: "safety", lng: 121.4755, lat: 31.2288, status: "normal" },
  { id: "asset-park-14", name: "停车场14", category: "park", lng: 121.4772, lat: 31.2312, status: "normal" },
  { id: "asset-dock-a", name: "充电站A", category: "dock", lng: 121.4765, lat: 31.2305, status: "normal" },
  { id: "asset-dock-b", name: "充电站B", category: "dock", lng: 121.4735, lat: 31.2308, status: "normal" },
  { id: "asset-ip-01", name: "巡检点01", category: "inspection", lng: 121.4742, lat: 31.2310, status: "normal" },
  { id: "asset-ip-02", name: "巡检点02", category: "inspection", lng: 121.4752, lat: 31.2308, status: "normal" },
  { id: "asset-ip-03", name: "巡检点03", category: "inspection", lng: 121.4748, lat: 31.2298, status: "warn" },
]

export function useAssetLayer() {
  function assetsGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: ASSET_SEED.map((a) => ({
        type: "Feature" as const,
        properties: {
          id: a.id,
          name: a.name,
          category: a.category,
          status: a.status,
          color: ASSET_CATEGORY_COLOR[a.category],
          statusColor:
            a.status === "danger" ? "#EF4444" :
            a.status === "warn" ? "#F59E0B" :
            a.status === "offline" ? "#475569" :
            ASSET_CATEGORY_COLOR[a.category],
        },
        geometry: { type: "Point" as const, coordinates: [a.lng, a.lat] },
      })),
    }
  }

  return { assetsGeoJSON, ASSET_CATEGORY_COLOR, ASSET_CATEGORY_ICON, ASSET_SEED }
}
