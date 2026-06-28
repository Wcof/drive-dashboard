// 任务 composable
import { computed } from "vue"
import { getMockDataService } from "./useMockDataService"
import { InspectionTaskInstanceStatus, type InspectionTask } from "@/types/inspection"

export function useTasks() {
  const { state } = getMockDataService()
  const tasks = computed<InspectionTask[]>(() => state.tasks)
  const runningCount = computed(() => state.tasks.filter((t) => t.status === InspectionTaskInstanceStatus.RUNNING).length)
  const pendingCount = computed(() => state.tasks.filter((t) => t.status === InspectionTaskInstanceStatus.PENDING).length)
  const byRobot = (robotId: string) => computed(() => state.tasks.filter((t) => t.robotId === robotId))
  const byId = (id: string) => computed(() => state.tasks.find((t) => t.id === id) ?? null)
  return { tasks, runningCount, pendingCount, byRobot, byId }
}
