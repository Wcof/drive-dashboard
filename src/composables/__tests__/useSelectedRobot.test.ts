import { describe, it, expect, beforeEach } from "vitest"
import { useSelectedRobot, __resetSelectedRobotForTest } from "@/composables/useSelectedRobot"
import { setMockDataService, getMockDataService } from "@/composables/useMockDataService"
import { createMockDataService } from "@/mock/mockDataService"
import { storage, STORAGE_KEYS } from "@/utils/storage"

beforeEach(() => {
  localStorage.clear()
  setMockDataService(createMockDataService())
  __resetSelectedRobotForTest()
})

const flush = () => new Promise((r) => setTimeout(r, 0))

describe("useSelectedRobot 持久化（ADR#27）", () => {
  it("select 写入 localStorage", async () => {
    const { select, selectedRobotId } = useSelectedRobot()
    select("robot-north-1")
    expect(selectedRobotId.value).toBe("robot-north-1")
    await flush()
    expect(storage.get<string>(STORAGE_KEYS.SELECTED_ROBOT)).toBe("robot-north-1")
  })

  it("clear 清空选中并移除 localStorage", async () => {
    const { select, clear, selectedRobotId } = useSelectedRobot()
    select("robot-north-1")
    await flush()
    clear()
    expect(selectedRobotId.value).toBeNull()
    await flush()
    expect(storage.get<string>(STORAGE_KEYS.SELECTED_ROBOT)).toBeNull()
  })

  it("selectedRobot 返回机器人对象", () => {
    const { select, selectedRobot } = useSelectedRobot()
    select("robot-north-1")
    expect(selectedRobot.value?.name).toBe("北区巡检1号")
  })

  it("isFocused 反映聚焦态", () => {
    const { select, clear, isFocused } = useSelectedRobot()
    expect(isFocused.value).toBe(false)
    select("robot-north-1")
    expect(isFocused.value).toBe(true)
    clear()
    expect(isFocused.value).toBe(false)
  })
})

// 防止未初始化报错
export { getMockDataService }
