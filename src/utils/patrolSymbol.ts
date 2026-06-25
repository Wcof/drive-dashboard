// 边巡边检锚点符号 —— ADR#39 三角警示+闪烁+虚线圈，与告警锚点（圆形脉冲分级色）错开
export const PATROL_ANCHOR_COLOR = "#ff6b00" // 橙三角，与告警红/黄/蓝错开
export const PATROL_ANCHOR_SHAPE = "triangle"

export interface PatrolAnchorStyle {
  color: string
  shape: typeof PATROL_ANCHOR_SHAPE
  flash: boolean
  dashedRing: boolean
}

export function patrolAnchorStyle(): PatrolAnchorStyle {
  return { color: PATROL_ANCHOR_COLOR, shape: PATROL_ANCHOR_SHAPE, flash: true, dashedRing: true }
}
