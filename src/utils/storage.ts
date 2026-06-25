// localStorage 封装 —— 与 bot 同名共享 key（对齐 bot src/utils/storage.ts STORAGE_KEYS）
// 大屏只引用大屏所需的 key 子集，命名与 bot 完全一致以保证 mock 阶段双仓共享

export const STORAGE_KEYS = {
  ROBOTS: "inspection_robots",
  INSPECTION_POINTS: "inspection_points",
  TASKS: "inspection_tasks",
  INSPECTION_MAPS: "inspection_maps",
  EXCEPTION_LOGS: "exception_logs",
  AUDIT_LOG: "audit_log", // 注意：bot audit 实际 key，大屏只读
  WORK_TICKETS: "work_tickets",
  ROAD_NODES: "road_nodes",
  ROAD_SEGMENTS: "road_segments",
  NAV_POINTS: "nav_points",
  INSPECTION_ROUTES: "inspection_routes",
  // 大屏独立累积（不与 bot 共享）
  ALERTS: "drive_dashboard_alerts",
  PATROL_ANCHORS: "drive_dashboard_patrol_anchors",
  TRAJECTORY_HISTORY: "drive_dashboard_trajectory_history",
  SELECTED_ROBOT: "drive_dashboard_last_selected_robot_id",
  LOCK_STATE: "drive_dashboard_lock_state",
  LAYER_VISIBILITY: "drive_dashboard_layer_visibility",
  SCHEMA_VERSION: "drive_dashboard_schema_version",
} as const

export const SCHEMA_VERSION = 1

export const storage = {
  get<T>(key: string): T | null {
    const data = localStorage.getItem(key)
    return data ? (JSON.parse(data) as T) : null
  },

  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value))
  },

  remove(key: string): void {
    localStorage.removeItem(key)
  },

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
  },
}
