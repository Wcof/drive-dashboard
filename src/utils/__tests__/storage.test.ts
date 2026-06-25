import { describe, it, expect, beforeEach } from "vitest"
import { storage, STORAGE_KEYS, SCHEMA_VERSION } from "@/utils/storage"

describe("storage", () => {
  beforeEach(() => localStorage.clear())

  it("get/set/remove 基本读写", () => {
    expect(storage.get("x")).toBeNull()
    storage.set("x", { a: 1 })
    expect(storage.get("x")).toEqual({ a: 1 })
    storage.remove("x")
    expect(storage.get("x")).toBeNull()
  })

  it("STORAGE_KEYS 与 bot 同名共享（带 inspection_ 前缀）", () => {
    // ADR#35 同名共享 key —— 对齐 bot src/utils/storage.ts 实际命名
    expect(STORAGE_KEYS.ROBOTS).toBe("inspection_robots")
    expect(STORAGE_KEYS.TASKS).toBe("inspection_tasks")
    expect(STORAGE_KEYS.INSPECTION_MAPS).toBe("inspection_maps")
    expect(STORAGE_KEYS.INSPECTION_POINTS).toBe("inspection_points")
    expect(STORAGE_KEYS.EXCEPTION_LOGS).toBe("exception_logs")
    expect(STORAGE_KEYS.WORK_TICKETS).toBe("work_tickets")
    expect(STORAGE_KEYS.NAV_POINTS).toBe("nav_points")
    expect(STORAGE_KEYS.ROAD_SEGMENTS).toBe("road_segments")
  })

  it("大屏独立 key 用 drive_dashboard 前缀（不与 bot 冲突）", () => {
    expect(STORAGE_KEYS.ALERTS).toBe("drive_dashboard_alerts")
    expect(STORAGE_KEYS.SELECTED_ROBOT).toBe("drive_dashboard_last_selected_robot_id")
    expect(STORAGE_KEYS.LOCK_STATE).toBe("drive_dashboard_lock_state")
    expect(STORAGE_KEYS.LAYER_VISIBILITY).toBe("drive_dashboard_layer_visibility")
  })

  it("clearAll 清掉所有 key", () => {
    storage.set(STORAGE_KEYS.ROBOTS, [])
    storage.set(STORAGE_KEYS.ALERTS, [])
    storage.clearAll()
    expect(storage.get(STORAGE_KEYS.ROBOTS)).toBeNull()
    expect(storage.get(STORAGE_KEYS.ALERTS)).toBeNull()
  })

  it("SCHEMA_VERSION 定义", () => {
    expect(SCHEMA_VERSION).toBe(1)
  })
})
