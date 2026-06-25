// 厂区坐标系换算 —— 将归一化 (x, y) 0~1 映射到经纬度
// 复刻自参考页面 safety-dashboard/app.js SITE_IMAGE_COORDS + siteCoord
// 用于在 mock 中给巡检点/充电站/AP 设备/告警锚定经纬度

const SITE_IMAGE_COORDS = [
  [121.4688, 31.2356], // top-left
  [121.4794, 31.2356], // top-right
  [121.4794, 31.2264], // bottom-right
  [121.4688, 31.2264], // bottom-left
] as const

export const SITE_CENTER = siteCoord(0.5, 0.5)

export function siteCoord(x: number, y: number): [number, number] {
  const left = SITE_IMAGE_COORDS[0][0]
  const right = SITE_IMAGE_COORDS[1][0]
  const top = SITE_IMAGE_COORDS[0][1]
  const bottom = SITE_IMAGE_COORDS[2][1]
  return [
    Number((left + (right - left) * x).toFixed(6)),
    Number((top - (top - bottom) * y).toFixed(6)),
  ]
}

// 坐标距离 EPS 比对（参考页面用 0.0002）
export function coordsMatch(a: [number, number], b: [number, number], eps = 0.0002): boolean {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps
}
