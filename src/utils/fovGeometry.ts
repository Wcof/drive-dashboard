// FOV 视野锥几何 —— ADR#117 视频视野锥跟随选中机器人朝向+FOV
// 纯函数，单测覆盖；给定机器人位置+朝向+FOV 角度+视距，算出锥形多边形坐标

export interface FovConeInput {
  longitude: number
  latitude: number
  yaw: number // 0-360 度，机器人朝向
  fovDeg: number // 视场角（如 60）
  rangeMeter: number // 视距（米）
}

export interface FovConePolygon {
  coordinates: [number, number][] // [lng, lat] 序列，首尾闭合
}

// 米/度换算（赤道近似，华东纬度可接受误差）
const M_PER_DEG_LAT = 111_320
function mPerDegLng(lat: number): number {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)
}

// 生成视野锥多边形：顶点=机器人位置，两侧按 yaw±fov/2 延伸 rangeMeter
export function computeFovCone(input: FovConeInput): FovConePolygon {
  const { longitude, latitude, yaw, fovDeg, rangeMeter } = input
  const halfFov = fovDeg / 2
  const angles = [yaw - halfFov, yaw + halfFov]
  const lngPerM = 1 / mPerDegLng(latitude)
  const latPerM = 1 / M_PER_DEG_LAT

  const edges = angles.map((a) => {
    const rad = (a * Math.PI) / 180
    return [
      longitude + Math.cos(rad) * rangeMeter * lngPerM,
      latitude + Math.sin(rad) * rangeMeter * latPerM,
    ] as [number, number]
  })

  return {
    coordinates: [
      [longitude, latitude],
      edges[0],
      edges[1],
      [longitude, latitude],
    ],
  }
}
