// 告警锚点符号工厂 —— ADR#36 分级色+单圈脉冲+分级大小+闪烁至ACK变灰
// 纯函数：给告警状态/分级，算 mapbox symbol/circle 样式参数

import { AlertSeverity, AlertStatus, type Alert } from "@/types/alert"

export const ALERT_COLORS: Record<AlertSeverity, string> = {
  [AlertSeverity.CRITICAL]: "#ff3b5c", // 紧急红
  [AlertSeverity.WARNING]: "#ffb020",  // 警告黄
  [AlertSeverity.INFO]: "#3b82f6",     // 信息蓝
}

export const ALERT_SIZES: Record<AlertSeverity, number> = {
  [AlertSeverity.CRITICAL]: 28, // 紧急大
  [AlertSeverity.WARNING]: 20,  // 警告中
  [AlertSeverity.INFO]: 14,     // 信息小
}

export const ACKED_COLOR = "#4a5568" // ACK 变灰

export function alertColor(a: Alert): string {
  return a.status === AlertStatus.ACKED ? ACKED_COLOR : ALERT_COLORS[a.severity]
}

export function alertSize(a: Alert): number {
  return ALERT_SIZES[a.severity]
}

// 是否持续闪烁（ACTIVE 态闪烁，ACKED 不闪）
export function shouldFlash(a: Alert): boolean {
  return a.status === AlertStatus.ACTIVE
}
