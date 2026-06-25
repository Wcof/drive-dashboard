// 建筑物 GeoJSON（ADR#110/133/136 fill-extrusion 单引擎）
// 大屏 seed 自带，bot 类型补 buildings? 可选字段但不主动维护

export type BuildingsCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon,
  { height: number; name?: string; color?: string }
>
