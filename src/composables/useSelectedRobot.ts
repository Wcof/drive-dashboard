// 选中机器人 composable —— ADR#27 selectedRobotId 持久化 localStorage
import { computed, ref, watch } from "vue"
import { storage, STORAGE_KEYS } from "@/utils/storage"
import { getMockDataService } from "./useMockDataService"

const selectedRobotId = ref<string | null>(storage.get<string>(STORAGE_KEYS.SELECTED_ROBOT) ?? null)

watch(selectedRobotId, (id) => {
  if (id) storage.set(STORAGE_KEYS.SELECTED_ROBOT, id)
  else storage.remove(STORAGE_KEYS.SELECTED_ROBOT)
})

// 测试用：重置模块级单例（生产代码不调用）
export function __resetSelectedRobotForTest(): void {
  selectedRobotId.value = storage.get<string>(STORAGE_KEYS.SELECTED_ROBOT) ?? null
}

export function useSelectedRobot() {
  const { state } = getMockDataService()
  const selectedRobot = computed(() => state.robots.find((r) => r.id === selectedRobotId.value) ?? null)
  const isFocused = computed(() => selectedRobotId.value !== null)

  function select(robotId: string | null): void {
    selectedRobotId.value = robotId
  }
  function clear(): void {
    selectedRobotId.value = null
  }

  return { selectedRobotId, selectedRobot, isFocused, select, clear }
}
