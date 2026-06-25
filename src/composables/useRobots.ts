// 机器人列表 composable —— 读 mock state，提供按状态过滤
import { computed } from "vue"
import { getMockDataService } from "./useMockDataService"
import { RobotStatus } from "@/types/robot"
import type { Robot } from "@/types/robot"

export function useRobots() {
  const { state } = getMockDataService()
  const robots = computed<Robot[]>(() => state.robots)
  const byStatus = (status: RobotStatus) => computed(() => state.robots.filter((r) => r.status === status))
  const byId = (id: string) => computed(() => state.robots.find((r) => r.id === id) ?? null)
  const onlineCount = computed(() => state.robots.filter((r) => r.status !== RobotStatus.OFFLINE).length)
  const patrollingCount = computed(() => state.robots.filter((r) => r.status === RobotStatus.PATROLLING).length)
  const errorCount = computed(() => state.robots.filter((r) => r.status === RobotStatus.ERROR).length)
  return { robots, byStatus, byId, onlineCount, patrollingCount, errorCount }
}
