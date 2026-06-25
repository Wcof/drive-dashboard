// 告警 composable —— ADR#36 分级+ACK变灰；支持 ACK 操作
import { computed } from "vue"
import { getMockDataService } from "./useMockDataService"
import { AlertSeverity, AlertStatus, type Alert } from "@/types/alert"
import { storage, STORAGE_KEYS } from "@/utils/storage"
import { addAuditLog } from "./useAuditLog"

export function useAlerts() {
  const { state } = getMockDataService()
  const alerts = computed<Alert[]>(() => state.alerts)
  const activeAlerts = computed(() => state.alerts.filter((a) => a.status === AlertStatus.ACTIVE))
  const ackedAlerts = computed(() => state.alerts.filter((a) => a.status === AlertStatus.ACKED))
  const criticalCount = computed(() => state.alerts.filter((a) => a.severity === AlertSeverity.CRITICAL && a.status === AlertStatus.ACTIVE).length)
  const warningCount = computed(() => state.alerts.filter((a) => a.severity === AlertSeverity.WARNING && a.status === AlertStatus.ACTIVE).length)
  const infoCount = computed(() => state.alerts.filter((a) => a.severity === AlertSeverity.INFO && a.status === AlertStatus.ACTIVE).length)

  function ackAlert(alertId: string, operator: string, reason?: string): void {
    const idx = state.alerts.findIndex((a) => a.id === alertId)
    if (idx === -1) return
    const now = new Date().toISOString()
    state.alerts[idx] = { ...state.alerts[idx], status: AlertStatus.ACKED, ackedBy: operator, ackedAt: now }
    storage.set(STORAGE_KEYS.ALERTS, state.alerts)
    addAuditLog({ action: "ack_alert", operator, targetId: alertId, targetType: "alert", reason })
  }

  function byRobot(robotId: string) {
    return computed(() => state.alerts.filter((a) => a.robotId === robotId))
  }

  return { alerts, activeAlerts, ackedAlerts, criticalCount, warningCount, infoCount, ackAlert, byRobot }
}
