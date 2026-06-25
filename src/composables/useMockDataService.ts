// 全局单例：mock 数据服务实例（App 启动时注入，所有 composable 共享）
import type { MockDataService } from "@/mock/mockDataService"

let service: MockDataService | null = null

export function setMockDataService(s: MockDataService): void {
  service = s
}

export function getMockDataService(): MockDataService {
  if (!service) throw new Error("MockDataService 未初始化：请在 App.vue setup 中调用 createMockDataService 并 setMockDataService")
  return service
}
