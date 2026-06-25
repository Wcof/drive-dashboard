// mock 数据服务 —— ADR#36/38 mock 载体 localStorage，灌入 seed + 启动时钟
// 真实环境换 realtimeService（WebSocket），上层组件不动

import { reactive } from "vue"
import type { Robot } from "@/types/robot"
import type { Alert } from "@/types/alert"
import type { InspectionTask } from "@/types/inspection"
import type { WorkTicket } from "@/types/work-ticket"
import type { InspectionMap } from "@/types/inspection"
import type { InspectionPoint } from "@/types/inspection"
import type { AuditLogEntry } from "@/types/audit"
import type { ExceptionLog } from "@/types/exception"
import type { RoadSegment, NavigationPoint } from "@/types/road-network"
import { storage, STORAGE_KEYS } from "@/utils/storage"
import { seedIfEmpty } from "./seed"
import { startMockClock, type MockClockState } from "./mockClock"

export interface MockDataState extends MockClockState {
  workTickets: WorkTicket[]
  maps: InspectionMap[]
  points: InspectionPoint[]
  auditLog: AuditLogEntry[]
  exceptionLogs: ExceptionLog[]
  roadSegments: RoadSegment[]
  navPoints: NavigationPoint[]
}

export function createMockDataService() {
  seedIfEmpty()

  const state = reactive<MockDataState>({
    robots: storage.get<Robot[]>(STORAGE_KEYS.ROBOTS) ?? [],
    alerts: storage.get<Alert[]>(STORAGE_KEYS.ALERTS) ?? [],
    tasks: storage.get<InspectionTask[]>(STORAGE_KEYS.TASKS) ?? [],
    workTickets: storage.get<WorkTicket[]>(STORAGE_KEYS.WORK_TICKETS) ?? [],
    maps: storage.get<InspectionMap[]>(STORAGE_KEYS.INSPECTION_MAPS) ?? [],
    points: storage.get<InspectionPoint[]>(STORAGE_KEYS.INSPECTION_POINTS) ?? [],
    auditLog: storage.get<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOG) ?? [],
    exceptionLogs: storage.get<ExceptionLog[]>(STORAGE_KEYS.EXCEPTION_LOGS) ?? [],
    roadSegments: storage.get<RoadSegment[]>(STORAGE_KEYS.ROAD_SEGMENTS) ?? [],
    navPoints: storage.get<NavigationPoint[]>(STORAGE_KEYS.NAV_POINTS) ?? [],
  })

  const clock = startMockClock(state)

  return {
    state,
    stop: clock.stop,
    // 显式刷新（测试或手动同步用）
    refresh() {
      state.robots = storage.get<Robot[]>(STORAGE_KEYS.ROBOTS) ?? []
      state.alerts = storage.get<Alert[]>(STORAGE_KEYS.ALERTS) ?? []
      state.tasks = storage.get<InspectionTask[]>(STORAGE_KEYS.TASKS) ?? []
    },
  }
}

export type MockDataService = ReturnType<typeof createMockDataService>
