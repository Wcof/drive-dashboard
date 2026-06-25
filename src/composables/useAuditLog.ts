// 审计日志 composable —— ADR#72 只读；addAuditLog 供其他操作调用
import { computed } from "vue"
import { getMockDataService } from "./useMockDataService"
import { storage, STORAGE_KEYS } from "@/utils/storage"
import type { AuditLogEntry } from "@/types/audit"

export function useAuditLog() {
  const { state } = getMockDataService()
  const auditLog = computed<AuditLogEntry[]>(() => [...state.auditLog].reverse())
  return { auditLog }
}

export function addAuditLog(entry: Omit<AuditLogEntry, "id" | "createdAt">): void {
  const { state } = getMockDataService()
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
  }
  state.auditLog.push(newEntry)
  storage.set(STORAGE_KEYS.AUDIT_LOG, state.auditLog)
}
